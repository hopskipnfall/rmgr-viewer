import { File as NodeFile } from "node:buffer";
import { describe, expect, it } from "vitest";
import { fromBrowserFile } from "./replayFileSource.js";

const FileCtor = (globalThis.File ?? NodeFile) as unknown as typeof File;

describe("fromBrowserFile", () => {
  it("exposes meta and lazily reads the bytes", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const source = fromBrowserFile(
      new FileCtor([bytes], "a.rmgr", { lastModified: 5 }),
    );
    expect(source.name).toBe("a.rmgr");
    expect(source.meta).toEqual({
      sourcePath: "a.rmgr",
      size: 3,
      lastModified: 5,
    });
    expect(await source.read()).toEqual(bytes);
  });

  it("uses webkitRelativePath when present", () => {
    const file = new FileCtor([new Uint8Array(1)], "a.rmgr");
    Object.defineProperty(file, "webkitRelativePath", {
      value: "folder/a.rmgr",
    });
    expect(fromBrowserFile(file).meta.sourcePath).toBe("folder/a.rmgr");
  });
});
