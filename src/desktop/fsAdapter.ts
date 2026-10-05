import { documentDir, join } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import {
  exists,
  mkdir,
  readDir,
  readFile,
  rename,
  remove,
  stat,
  watch,
  writeFile,
} from "@tauri-apps/plugin-fs";
import { Store } from "@tauri-apps/plugin-store";

/** Thin wrapper over the Tauri plugins; the single seam unit tests mock. */
export interface DirEntryInfo {
  name: string;
  isDirectory: boolean;
}

export type WatchEvent = {
  kind: "create" | "modify" | "remove" | "other";
  paths: string[];
};

export interface FsAdapter {
  documentDir(): Promise<string>;
  join(...parts: string[]): Promise<string>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  readDir(path: string): Promise<DirEntryInfo[]>;
  /** `mtime` is milliseconds since the epoch. */
  stat(path: string): Promise<{ size: number; mtime: number }>;
  readFile(path: string): Promise<Uint8Array>;
  /** Only ever used for the project file and its backups (see capabilities/default.json). */
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  /** Runs `cb` (awaited) when the window is asked to close. Returns an unsubscribe function. */
  onCloseRequested(cb: () => Promise<void>): Promise<() => void>;
  watch(root: string, cb: (e: WatchEvent) => void): Promise<() => void>;
  pickDirectory(): Promise<string | null>;
  getSavedRoot(): Promise<string | null>;
  saveRoot(path: string): Promise<void>;
}

const STORE_FILE = "settings.json";
const ROOT_KEY = "libraryRoot";

function kindOf(type: unknown): WatchEvent["kind"] {
  if (typeof type === "object" && type !== null) {
    if ("create" in type) return "create";
    if ("modify" in type) return "modify";
    if ("remove" in type) return "remove";
  }
  return "other";
}

export const tauriFs: FsAdapter = {
  documentDir,
  join: (...parts) => join(...parts),
  exists: (path) => exists(path),
  mkdir: (path) => mkdir(path, { recursive: true }),
  async readDir(path) {
    const entries = await readDir(path);
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory }));
  },
  async stat(path) {
    const s = await stat(path);
    return { size: s.size, mtime: s.mtime?.getTime() ?? 0 };
  },
  readFile: (path) => readFile(path),
  writeFile: (path, bytes) => writeFile(path, bytes),
  rename: (from, to) => rename(from, to),
  remove: (path) => remove(path),
  onCloseRequested: (cb) => getCurrentWindow().onCloseRequested(() => cb()),
  watch: (root, cb) =>
    watch(
      root,
      (event) => cb({ kind: kindOf(event.type), paths: event.paths }),
      { recursive: true, delayMs: 1000 },
    ),
  async pickDirectory() {
    const picked = await open({ directory: true });
    return typeof picked === "string" ? picked : null;
  },
  async getSavedRoot() {
    const store = await Store.load(STORE_FILE);
    return (await store.get<string>(ROOT_KEY)) ?? null;
  },
  async saveRoot(path) {
    const store = await Store.load(STORE_FILE);
    await store.set(ROOT_KEY, path);
    await store.save();
  },
};
