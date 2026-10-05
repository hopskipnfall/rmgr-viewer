import type { ReplayFileSource } from "../data/replayFileSource.js";
import type { FsAdapter } from "./fsAdapter.js";

const isReplayName = (name: string): boolean =>
  name.toLowerCase().endsWith(".rmgr");

const MAX_STABILITY_SAMPLES = 60;

export function fromLibraryPath(
  fs: FsAdapter,
  root: string,
  relPath: string,
  stat: { size: number; mtime: number },
): ReplayFileSource {
  return {
    meta: { sourcePath: relPath, size: stat.size, lastModified: stat.mtime },
    name: relPath.split("/").pop() ?? relPath,
    read: async () => fs.readFile(await fs.join(root, ...relPath.split("/"))),
  };
}

export type RootState =
  { kind: "ok"; root: string } | { kind: "missing"; root: string };

/**
 * The saved root if there is one (reported "missing" if it has vanished),
 * else `$DOCUMENT/Replays`, created on demand.
 */
export async function resolveRoot(fs: FsAdapter): Promise<RootState> {
  const saved = await fs.getSavedRoot();
  if (saved) {
    return (await fs.exists(saved))
      ? { kind: "ok", root: saved }
      : { kind: "missing", root: saved };
  }
  const root = await fs.join(await fs.documentDir(), "Replays");
  if (!(await fs.exists(root))) await fs.mkdir(root);
  return { kind: "ok", root };
}

/** Recursively lists `*.rmgr` under `root` as lazy sources; reads no file bytes. */
export async function scanLibrary(
  fs: FsAdapter,
  root: string,
): Promise<ReplayFileSource[]> {
  const sources: ReplayFileSource[] = [];
  async function walk(rel: string): Promise<void> {
    const dir = rel ? await fs.join(root, ...rel.split("/")) : root;
    for (const entry of await fs.readDir(dir)) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        await walk(childRel);
      } else if (isReplayName(entry.name)) {
        const abs = await fs.join(root, ...childRel.split("/"));
        sources.push(fromLibraryPath(fs, root, childRel, await fs.stat(abs)));
      }
    }
  }
  await walk("");
  return sources;
}

export interface LibraryWatcherHandlers {
  /** Import one stable file; rejects on parse failure. */
  onSource(source: ReplayFileSource): Promise<void>;
  onRemove(sourcePath: string): void;
  /** Called after the single retry also fails. */
  onError(sourcePath: string, error: unknown): void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Watches `root` and feeds stable new/changed `*.rmgr` files to
 * `handlers.onSource`. Events for a path already being processed are
 * coalesced into that run. Returns a stop function.
 */
export async function startWatcher(
  fs: FsAdapter,
  root: string,
  handlers: LibraryWatcherHandlers,
  opts: { stabilityMs?: number } = {},
): Promise<() => void> {
  const stabilityMs = opts.stabilityMs ?? 1000;
  const prefix = root.replace(/[\\/]+$/, "");
  let stopped = false;
  const inFlight = new Set<string>();

  const relOf = (abs: string): string | null => {
    const norm = abs.replace(/\\/g, "/");
    const p = prefix.replace(/\\/g, "/") + "/";
    return norm.startsWith(p) ? norm.slice(p.length) : null;
  };

  /** Two stats `stabilityMs` apart with equal size; null if the file vanished. */
  async function waitStable(
    abs: string,
  ): Promise<{ size: number; mtime: number } | null> {
    try {
      let prev = await fs.stat(abs);
      for (let i = 0; i < MAX_STABILITY_SAMPLES; i++) {
        await sleep(stabilityMs);
        if (stopped) return null;
        const next = await fs.stat(abs);
        if (next.size === prev.size) return next;
        prev = next;
      }
    } catch {
      return null;
    }
    return null;
  }

  async function process(rel: string): Promise<void> {
    const abs = await fs.join(root, ...rel.split("/"));
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const stat = await waitStable(abs);
      if (!stat || stopped) return;
      try {
        await handlers.onSource(fromLibraryPath(fs, root, rel, stat));
        return;
      } catch (err) {
        lastError = err;
      }
    }
    handlers.onError(rel, lastError);
  }

  const unwatch = await fs.watch(root, (event) => {
    if (stopped) return;
    for (const abs of event.paths) {
      const rel = relOf(abs);
      if (rel === null || !isReplayName(rel)) continue;
      if (event.kind === "remove") {
        handlers.onRemove(rel);
      } else if (event.kind === "create" || event.kind === "modify") {
        if (inFlight.has(rel)) continue;
        inFlight.add(rel);
        void process(rel).finally(() => inFlight.delete(rel));
      }
    }
  });

  return () => {
    stopped = true;
    unwatch();
  };
}
