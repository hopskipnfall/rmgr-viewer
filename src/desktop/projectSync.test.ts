import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openLibraryStore, type StoredGame } from "../data/libraryStore.js";
import {
  buildProjectFile,
  parseProjectFile,
  serializeProjectFile,
} from "../data/projectFile.js";
import { saveMatchNotes } from "../notes.js";
import { saveSessionComment } from "../sessionComments.js";
import type { FsAdapter } from "./fsAdapter.js";
import {
  loadProjectFile,
  PROJECT_FILE_NAME,
  ProjectSync,
  type ProjectNotice,
} from "./projectSync.js";

class MemStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  [name: string]: unknown;
}

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

function memFs() {
  const files = new Map<string, Uint8Array>();
  const ops: string[] = [];
  const fs = {
    files,
    ops,
    documentDir: async () => "/docs",
    join: async (...p: string[]) => p.join("/"),
    exists: async (p: string) => files.has(p),
    mkdir: async () => {},
    readDir: async () => [],
    stat: async () => ({ size: 0, mtime: 0 }),
    readFile: async (p: string) => {
      const f = files.get(p);
      if (!f) throw new Error("ENOENT " + p);
      return f;
    },
    writeFile: async (p: string, b: Uint8Array) => {
      ops.push(`write ${p}`);
      files.set(p, b);
    },
    rename: async (a: string, b: string) => {
      ops.push(`rename ${a} -> ${b}`);
      const f = files.get(a);
      if (!f) throw new Error("ENOENT " + a);
      files.delete(a);
      files.set(b, f);
    },
    remove: async (p: string) => {
      ops.push(`remove ${p}`);
      files.delete(p);
    },
    watch: async () => () => {},
    onCloseRequested: async () => () => {},
    pickDirectory: async () => null,
    getSavedRoot: async () => null,
    saveRoot: async () => {},
  };
  return fs satisfies FsAdapter & Record<string, unknown>;
}

const A = "/a";
const B = "/b";
const pathA = `${A}/${PROJECT_FILE_NAME}`;
const pathB = `${B}/${PROJECT_FILE_NAME}`;

async function projectText(
  notes: Record<
    string,
    {
      id: string;
      frameIndex: number;
      text: string;
      createdAt: number;
      updatedAt: number;
    }[]
  > = {},
): Promise<string> {
  const blob = serializeProjectFile(
    buildProjectFile([], { displayName: "", aliases: new Set() }, {}, notes),
  );
  return blob.text();
}

const note = (text: string) => ({
  id: "n1",
  frameIndex: 1,
  text,
  createdAt: 1,
  updatedAt: 1,
});

function game(id: string, hash: string, port: 0 | 1 | null): StoredGame {
  return {
    id,
    contentHash: hash,
    formatVersion: 5,
    recorderSchemaVersion: 2,
    analysisVersion: 1,
    sourcePath: `${id}.rmgr`,
    size: 1,
    lastModified: 1,
    manualPerspectivePort: port,
    summary: {} as StoredGame["summary"],
  };
}

describe("project sync", () => {
  let fs: ReturnType<typeof memFs>;
  let storage: MemStorage;
  let notices: (ProjectNotice | null)[];
  let sync: ProjectSync;

  const make = async (withStore = false) => {
    const store = withStore ? await openLibraryStore(new IDBFactory()) : null;
    sync = new ProjectSync({
      fs,
      storage,
      store,
      onNotice: (n) => notices.push(n),
    });
    return store;
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", (storage = new MemStorage()));
    fs = memFs();
    notices = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("migrates existing webview data into a new project file on first launch", async () => {
    saveMatchNotes("g1", [note("hello")]);
    saveSessionComment("s1", "session note");
    const store = await make(true);
    await store!.putMany([game("g1", "hash1", 1), game("g2", "hash2", null)]);

    await sync.attach(A);

    const file = parseProjectFile(dec(fs.files.get(pathA)!));
    expect(file.notes["g1"]).toHaveLength(1);
    expect(file.sessionComments["s1"]).toBe("session note");
    expect(file.perspectiveOverrides).toEqual({ hash1: 1 });
    expect(file.games).toEqual([]);
  });

  it("writes atomically: tmp file first, then rename over the real file", async () => {
    await make();
    await sync.attach(A);
    fs.ops.length = 0;
    saveMatchNotes("g1", [note("x")]);
    await sync.flush();
    expect(fs.ops).toEqual([
      `write ${pathA}.tmp`,
      `rename ${pathA}.tmp -> ${pathA}`,
    ]);
    expect(fs.files.has(`${pathA}.tmp`)).toBe(false);
  });

  it("debounces a burst of changes into a single write", async () => {
    vi.useFakeTimers();
    await make();
    await sync.attach(A);
    fs.ops.length = 0;
    for (let i = 0; i < 5; i++) {
      saveMatchNotes("g1", [note(String(i))]);
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(fs.ops).toEqual([]);
    await vi.advanceTimersByTimeAsync(1500);
    expect(fs.ops.filter((o) => o.startsWith("write"))).toHaveLength(1);
  });

  it("hydrates localStorage from an existing file", async () => {
    fs.files.set(pathA, enc(await projectText({ g9: [note("from file")] })));
    await make();
    await sync.attach(A);
    expect(JSON.parse(storage.getItem("rmgr_notes_g9")!)[0].text).toBe(
      "from file",
    );
  });

  it("rotates backups once per session, keeping the last 3", async () => {
    fs.files.set(pathA, enc(await projectText({ g: [note("v0")] })));
    fs.files.set(`${pathA}.bak.1`, enc("old1"));
    fs.files.set(`${pathA}.bak.2`, enc("old2"));
    fs.files.set(`${pathA}.bak.3`, enc("old3"));
    await make();
    await sync.attach(A);

    saveMatchNotes("g", [note("v1")]);
    await sync.flush();
    expect(dec(fs.files.get(`${pathA}.bak.1`)!)).toContain("v0");
    expect(dec(fs.files.get(`${pathA}.bak.2`)!)).toBe("old1");
    expect(dec(fs.files.get(`${pathA}.bak.3`)!)).toBe("old2");

    saveMatchNotes("g", [note("v2")]);
    await sync.flush();
    // Not rotated again: bak.1 is still the original, not v1.
    expect(dec(fs.files.get(`${pathA}.bak.1`)!)).toContain("v0");
    expect(dec(fs.files.get(pathA)!)).toContain("v2");
  });

  it("never overwrites a file from a newer schema and shows a notice", async () => {
    const newer = JSON.stringify({
      kind: "rmgr-viewer-project",
      fileVersion: 99,
    });
    fs.files.set(pathA, enc(newer));
    await make();
    await sync.attach(A);
    saveMatchNotes("g", [note("x")]);
    await sync.flush();
    expect(notices).toContainEqual({ kind: "newer" });
    expect(dec(fs.files.get(pathA)!)).toBe(newer);
    expect(fs.ops).toEqual([]);
  });

  it("falls back to backups for an unparseable file, keeping the bad file", async () => {
    fs.files.set(pathA, enc("{ not json"));
    fs.files.set(`${pathA}.bak.1`, enc("also bad"));
    fs.files.set(
      `${pathA}.bak.2`,
      enc(await projectText({ g: [note("backup")] })),
    );
    await make();
    await sync.attach(A);

    expect(notices).toContainEqual({ kind: "restored", backup: 2 });
    expect(JSON.parse(storage.getItem("rmgr_notes_g")!)[0].text).toBe("backup");
    const kept = [...fs.files.keys()].filter((k) => k.includes(".corrupt-"));
    expect(kept).toHaveLength(1);
    expect(dec(fs.files.get(kept[0]!)!)).toBe("{ not json");
  });

  it("refuses to write when the file and every backup are unreadable", async () => {
    fs.files.set(pathA, enc("garbage"));
    fs.files.set(`${pathA}.bak.1`, enc("garbage"));
    await make();
    await sync.attach(A);
    saveMatchNotes("g", [note("x")]);
    await sync.flush();
    expect(notices).toContainEqual({ kind: "unreadable" });
    expect(dec(fs.files.get(pathA)!)).toBe("garbage");
    expect(fs.ops).toEqual([]);
  });

  it("switches projects with the library folder without copying data across", async () => {
    await make();
    await sync.attach(A); // first launch: seeds A
    saveMatchNotes("g1", [note("in A")]);
    await sync.flush();

    await sync.attach(B); // B has no file: starts empty
    expect(storage.getItem("rmgr_notes_g1")).toBeNull();
    expect(parseProjectFile(dec(fs.files.get(pathB)!)).notes).toEqual({});
    expect(
      parseProjectFile(dec(fs.files.get(pathA)!)).notes["g1"],
    ).toHaveLength(1);

    saveMatchNotes("g2", [note("in B")]);
    await sync.attach(A); // flushes B, restores A
    expect(
      parseProjectFile(dec(fs.files.get(pathB)!)).notes["g2"],
    ).toHaveLength(1);
    expect(storage.getItem("rmgr_notes_g2")).toBeNull();
    expect(JSON.parse(storage.getItem("rmgr_notes_g1")!)[0].text).toBe("in A");
  });

  it("applies saved perspective overrides to games imported later, by content hash", async () => {
    const withOverride = serializeProjectFile(
      buildProjectFile(
        [],
        { displayName: "", aliases: new Set() },
        {},
        {},
        {},
        {},
        { hashX: 0 },
      ),
    );
    fs.files.set(pathA, enc(await withOverride.text()));
    const store = await make(true);
    await sync.attach(A);
    await store!.putMany([game("renamed", "hashX", null)]);
    expect(await sync.applyPerspectives()).toEqual([
      { id: "renamed", port: 0 },
    ]);
    expect((await store!.getAll())[0]!.manualPerspectivePort).toBe(0);
  });

  it("loadProjectFile reports a missing file", async () => {
    expect(await loadProjectFile(fs, A)).toEqual({ kind: "missing" });
  });
});
