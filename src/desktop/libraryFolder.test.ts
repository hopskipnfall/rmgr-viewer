import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplayFileSource } from "../data/replayFileSource.js";
import type { FsAdapter, WatchEvent } from "./fsAdapter.js";
import {
  fromLibraryPath,
  resolveRoot,
  scanLibrary,
  startWatcher,
} from "./libraryFolder.js";

interface FakeFile {
  size: number;
  mtime: number;
  bytes: Uint8Array;
}

function fakeFs(
  files: Record<string, FakeFile> = {},
  dirs: string[] = [],
  saved: string | null = null,
) {
  const dirSet = new Set(dirs);
  let listener: ((e: WatchEvent) => void) | null = null;
  const fs = {
    files,
    dirSet,
    emit: (e: WatchEvent) => listener?.(e),
    documentDir: async () => "/docs",
    join: async (...p: string[]) => p.join("/"),
    exists: vi.fn(async (p: string) => dirSet.has(p) || p in files),
    mkdir: vi.fn(async (p: string) => void dirSet.add(p)),
    readDir: vi.fn(async (p: string) => {
      const prefix = p + "/";
      const seen = new Map<string, boolean>();
      for (const f of Object.keys(files)) {
        if (!f.startsWith(prefix)) continue;
        const rest = f.slice(prefix.length);
        const [head, ...tail] = rest.split("/");
        seen.set(head!, tail.length > 0);
      }
      return [...seen].map(([name, isDirectory]) => ({ name, isDirectory }));
    }),
    stat: vi.fn(async (p: string) => {
      const f = files[p];
      if (!f) throw new Error("ENOENT");
      return { size: f.size, mtime: f.mtime };
    }),
    readFile: vi.fn(async (p: string) => files[p]!.bytes),
    writeFile: async () => {},
    rename: async () => {},
    remove: async () => {},
    onCloseRequested: async () => () => {},
    watch: vi.fn(async (_root: string, cb: (e: WatchEvent) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
    pickDirectory: async () => null,
    getSavedRoot: async () => saved,
    saveRoot: async () => {},
  };
  return fs satisfies FsAdapter & Record<string, unknown>;
}

const file = (size: number, mtime = 1): FakeFile => ({
  size,
  mtime,
  bytes: new Uint8Array(size),
});

describe("fromLibraryPath", () => {
  it("builds meta from stat and reads bytes lazily", async () => {
    const fs = fakeFs({ "/r/sub/a.rmgr": file(3) });
    const s = fromLibraryPath(fs, "/r", "sub/a.rmgr", { size: 3, mtime: 9 });
    expect(s.name).toBe("a.rmgr");
    expect(s.meta).toEqual({
      sourcePath: "sub/a.rmgr",
      size: 3,
      lastModified: 9,
    });
    expect(fs.readFile).not.toHaveBeenCalled();
    expect((await s.read()).byteLength).toBe(3);
    expect(fs.readFile).toHaveBeenCalledWith("/r/sub/a.rmgr");
  });
});

describe("resolveRoot", () => {
  it("creates the default folder when nothing is saved and it is missing", async () => {
    const fs = fakeFs();
    expect(await resolveRoot(fs)).toEqual({
      kind: "ok",
      root: "/docs/Replays",
    });
    expect(fs.mkdir).toHaveBeenCalledWith("/docs/Replays");
  });

  it("reports a saved root that no longer exists without creating it", async () => {
    const fs = fakeFs({}, [], "/gone");
    expect(await resolveRoot(fs)).toEqual({ kind: "missing", root: "/gone" });
    expect(fs.mkdir).not.toHaveBeenCalled();
  });

  it("uses an existing saved root", async () => {
    const fs = fakeFs({}, ["/mine"], "/mine");
    expect(await resolveRoot(fs)).toEqual({ kind: "ok", root: "/mine" });
  });
});

describe("scanLibrary", () => {
  it("recurses, keeps only .rmgr (case-insensitive) and reads no bytes", async () => {
    const fs = fakeFs({
      "/r/a.rmgr": file(1),
      "/r/b.RMGR": file(2),
      "/r/notes.txt": file(3),
      "/r/sub/c.rmgr": file(4),
    });
    const sources = await scanLibrary(fs, "/r");
    expect(sources.map((s) => s.meta.sourcePath).sort()).toEqual([
      "a.rmgr",
      "b.RMGR",
      "sub/c.rmgr",
    ]);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});

describe("startWatcher", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = async (files: Record<string, FakeFile>) => {
    const fs = fakeFs(files);
    const onSource = vi.fn<(s: ReplayFileSource) => Promise<void>>(
      async () => {},
    );
    const onRemove = vi.fn();
    const onError = vi.fn();
    await startWatcher(
      fs,
      "/r",
      { onSource, onRemove, onError },
      { stabilityMs: 1000 },
    );
    return { fs, onSource, onRemove, onError };
  };

  it("waits for the size to settle before importing", async () => {
    const { fs, onSource } = await setup({ "/r/a.rmgr": file(10) });
    fs.emit({ kind: "create", paths: ["/r/a.rmgr"] });
    await vi.advanceTimersByTimeAsync(500);
    expect(onSource).not.toHaveBeenCalled();
    fs.files["/r/a.rmgr"] = file(20); // still growing at the first sample
    await vi.advanceTimersByTimeAsync(600);
    expect(onSource).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect(onSource).toHaveBeenCalledTimes(1);
    expect(onSource.mock.calls[0]![0].meta.sourcePath).toBe("a.rmgr");
  });

  it("coalesces a burst of events for one path into one import", async () => {
    const { fs, onSource } = await setup({ "/r/a.rmgr": file(10) });
    for (let i = 0; i < 5; i++) {
      fs.emit({ kind: "modify", paths: ["/r/a.rmgr"] });
      await vi.advanceTimersByTimeAsync(100);
    }
    await vi.advanceTimersByTimeAsync(5000);
    expect(onSource).toHaveBeenCalledTimes(1);
  });

  it("reports removals with the root-relative path", async () => {
    const { fs, onRemove } = await setup({});
    fs.emit({ kind: "remove", paths: ["/r/sub/a.rmgr"] });
    expect(onRemove).toHaveBeenCalledWith("sub/a.rmgr");
  });

  it("ignores writes to the project file, its tmp and its backups", async () => {
    const { fs, onSource, onRemove } = await setup({});
    for (const name of [
      "rmgr-viewer-project.json",
      "rmgr-viewer-project.json.tmp",
      "rmgr-viewer-project.json.bak.1",
    ]) {
      fs.emit({ kind: "create", paths: ["/r/" + name] });
      fs.emit({ kind: "modify", paths: ["/r/" + name] });
      fs.emit({ kind: "remove", paths: ["/r/" + name] });
    }
    await vi.advanceTimersByTimeAsync(5000);
    expect(onSource).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("ignores non-.rmgr paths", async () => {
    const { fs, onSource, onRemove } = await setup({ "/r/x.txt": file(1) });
    fs.emit({ kind: "create", paths: ["/r/x.txt"] });
    fs.emit({ kind: "remove", paths: ["/r/x.txt"] });
    await vi.advanceTimersByTimeAsync(5000);
    expect(onSource).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("retries a failed import once, then reports the error", async () => {
    const { fs, onSource, onError } = await setup({ "/r/a.rmgr": file(10) });
    onSource.mockRejectedValue(new Error("bad"));
    fs.emit({ kind: "create", paths: ["/r/a.rmgr"] });
    await vi.advanceTimersByTimeAsync(10000);
    expect(onSource).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBe("a.rmgr");
  });

  it("stops listening when the returned stop function runs", async () => {
    const fs = fakeFs({ "/r/a.rmgr": file(10) });
    const onSource = vi.fn<(s: ReplayFileSource) => Promise<void>>(
      async () => {},
    );
    const stop = await startWatcher(
      fs,
      "/r",
      { onSource, onRemove: vi.fn(), onError: vi.fn() },
      { stabilityMs: 1000 },
    );
    stop();
    fs.emit({ kind: "create", paths: ["/r/a.rmgr"] });
    await vi.advanceTimersByTimeAsync(5000);
    expect(onSource).not.toHaveBeenCalled();
  });
});
