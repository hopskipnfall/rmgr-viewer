import type { PortIndex } from "@rmg-k/rmgr";
import {
  parseProjectFile,
  ProjectFileTooNewError,
  serializeProjectFile,
  type ProjectFile,
} from "../data/projectFile.js";
import type { LibraryStore } from "../data/libraryStore.js";
import { onUserDataChanged } from "../data/userDataChanged.js";
import {
  applyUserData,
  clearUserData,
  collectUserData,
} from "../data/userData.js";
import type { FsAdapter } from "./fsAdapter.js";

/** Visible in the library folder on purpose; replay watching ignores it (not `*.rmgr`). */
export const PROJECT_FILE_NAME = "rmgr-viewer-project.json";
const BACKUP_COUNT = 3;
/** Set once the project file has been seeded from pre-existing webview data (first launch only). */
const MIGRATED_KEY = "rmgr-viewer-project-migrated";

export type ProjectNotice =
  | { kind: "newer" }
  | { kind: "restored"; backup: number }
  | { kind: "unreadable" };

export type LoadOutcome =
  | { kind: "missing" }
  | { kind: "ok"; file: ProjectFile }
  | { kind: "restored"; file: ProjectFile; backup: number }
  | { kind: "newer" }
  | { kind: "unreadable" };

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

async function tryParse(
  fs: FsAdapter,
  path: string,
): Promise<ProjectFile | "newer" | null> {
  try {
    return parseProjectFile(decode(await fs.readFile(path)));
  } catch (err) {
    return err instanceof ProjectFileTooNewError ? "newer" : null;
  }
}

/**
 * Reads the project file. A newer-than-supported file is never touched. An unparseable one is
 * never overwritten: backups are tried in order, and the bad file is moved aside (kept, not
 * deleted) once one restores.
 */
export async function loadProjectFile(
  fs: FsAdapter,
  root: string,
): Promise<LoadOutcome> {
  const path = await fs.join(root, PROJECT_FILE_NAME);
  if (!(await fs.exists(path))) return { kind: "missing" };
  const main = await tryParse(fs, path);
  if (main === "newer") return { kind: "newer" };
  if (main) return { kind: "ok", file: main };
  for (let n = 1; n <= BACKUP_COUNT; n++) {
    const backup = `${path}.bak.${n}`;
    if (!(await fs.exists(backup))) continue;
    const parsed = await tryParse(fs, backup);
    if (parsed && parsed !== "newer") {
      await fs.rename(path, `${path}.corrupt-${Date.now()}`);
      return { kind: "restored", file: parsed, backup: n };
    }
  }
  return { kind: "unreadable" };
}

/** Debounced, atomic (tmp + rename) writer with backups rotated once per instance. */
export class ProjectWriter {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chain: Promise<void> = Promise.resolve();
  private dirty = false;

  constructor(
    private readonly fs: FsAdapter,
    private readonly path: string,
    private readonly build: () => ProjectFile,
    /** True when a valid file already exists to back up before the first overwrite. */
    private needsRotation: boolean,
    private readonly debounceMs = 1000,
  ) {}

  schedule(): void {
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.debounceMs);
  }

  /** Writes now if anything is pending, and resolves once all writes have finished. */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.dirty) {
      this.dirty = false;
      this.chain = this.chain.then(() => this.write()).catch(() => {});
    }
    return this.chain;
  }

  /** Writes unconditionally (used to create the file on first attach). */
  writeNow(): Promise<void> {
    this.dirty = true;
    return this.flush();
  }

  private async write(): Promise<void> {
    const { fs, path } = this;
    const bytes = new Uint8Array(
      await serializeProjectFile(this.build()).arrayBuffer(),
    );
    if (this.needsRotation) {
      this.needsRotation = false;
      await this.rotateBackups();
    }
    const tmp = `${path}.tmp`;
    await fs.writeFile(tmp, bytes);
    await fs.rename(tmp, path);
  }

  /** bak.3 dropped, bak.2 -> 3, bak.1 -> 2, current file copied to bak.1. */
  private async rotateBackups(): Promise<void> {
    const { fs, path } = this;
    if (!(await fs.exists(path))) return;
    const current = await fs.readFile(path);
    const bak = (n: number) => `${path}.bak.${n}`;
    if (await fs.exists(bak(BACKUP_COUNT))) await fs.remove(bak(BACKUP_COUNT));
    for (let n = BACKUP_COUNT - 1; n >= 1; n--) {
      if (await fs.exists(bak(n))) await fs.rename(bak(n), bak(n + 1));
    }
    await fs.writeFile(bak(1), current);
  }
}

export interface ProjectSyncDeps {
  fs: FsAdapter;
  storage: Storage;
  store: LibraryStore | null;
  /** Called with the current notice, or null when there is none. */
  onNotice(notice: ProjectNotice | null): void;
  debounceMs?: number;
}

/**
 * Desktop source of truth for user-authored data: a project file in the library folder. The
 * existing modules keep reading/writing localStorage; this hydrates localStorage from the file on
 * attach and writes the file back (debounced) whenever that data changes.
 */
export class ProjectSync {
  private root: string | null = null;
  private writer: ProjectWriter | null = null;
  private unsubscribe: (() => void) | null = null;
  private perspectives: Record<string, PortIndex> = {};

  constructor(private readonly deps: ProjectSyncDeps) {}

  /**
   * Switches to `root`'s project file (flushing the previous one first). Returns true when
   * localStorage was replaced, so the caller should re-read identity and refresh views.
   */
  async attach(root: string): Promise<boolean> {
    if (this.root === root && this.writer) return false;
    await this.detach();
    const { fs, storage } = this.deps;
    this.deps.onNotice(null);
    const path = await fs.join(root, PROJECT_FILE_NAME);
    const outcome = await loadProjectFile(fs, root);
    this.root = root;

    if (outcome.kind === "newer" || outcome.kind === "unreadable") {
      // Never overwrite: no writer at all, so edits stay in localStorage only.
      this.deps.onNotice({ kind: outcome.kind });
      return false;
    }

    let existingValid = false;
    if (outcome.kind === "missing") {
      if (!storage.getItem(MIGRATED_KEY)) {
        this.perspectives = await this.perspectivesFromCache();
      } else {
        // A folder with no project file starts empty; the old folder's data is not copied in.
        clearUserData(storage);
        this.perspectives = {};
      }
    } else {
      existingValid = true;
      applyUserData(storage, outcome.file);
      this.perspectives = { ...outcome.file.perspectiveOverrides };
      if (outcome.kind === "restored") {
        this.deps.onNotice({ kind: "restored", backup: outcome.backup });
      }
    }
    try {
      storage.setItem(MIGRATED_KEY, "1");
    } catch {
      // Blocked storage: seed again next launch, which is harmless.
    }

    const writer = new ProjectWriter(
      fs,
      path,
      () => collectUserData(storage, this.perspectives),
      existingValid,
      this.deps.debounceMs,
    );
    this.writer = writer;
    this.unsubscribe = onUserDataChanged(() => writer.schedule());
    if (outcome.kind === "missing") await writer.writeNow();
    return true;
  }

  /** Flushes pending changes and stops syncing. */
  async detach(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    await this.writer?.flush();
    this.writer = null;
    this.root = null;
  }

  flush(): Promise<void> {
    return this.writer?.flush() ?? Promise.resolve();
  }

  /** Records a hand-set perspective, keyed by the game's content hash. */
  async setPerspective(gameId: string, port: PortIndex | null): Promise<void> {
    const entry = (await this.deps.store?.getAll())?.find(
      (e) => e.id === gameId,
    );
    if (!entry) return;
    if (port === null) delete this.perspectives[entry.contentHash];
    else this.perspectives[entry.contentHash] = port;
    this.writer?.schedule();
  }

  /**
   * Writes the project's perspective overrides onto matching cached games (e.g. after an import
   * of files not seen before). Returns the games that changed.
   */
  async applyPerspectives(): Promise<{ id: string; port: PortIndex }[]> {
    const store = this.deps.store;
    if (!store) return [];
    const changed: { id: string; port: PortIndex }[] = [];
    const updates = [];
    for (const entry of await store.getAll()) {
      const port = this.perspectives[entry.contentHash];
      if (port !== undefined && entry.manualPerspectivePort !== port) {
        updates.push({ ...entry, manualPerspectivePort: port });
        changed.push({ id: entry.id, port });
      }
    }
    if (updates.length > 0) await store.putMany(updates);
    return changed;
  }

  /** First-launch migration source: overrides already stored on cached games. */
  private async perspectivesFromCache(): Promise<Record<string, PortIndex>> {
    const result: Record<string, PortIndex> = {};
    for (const entry of (await this.deps.store?.getAll()) ?? []) {
      if (entry.manualPerspectivePort !== null) {
        result[entry.contentHash] = entry.manualPerspectivePort;
      }
    }
    return result;
  }
}
