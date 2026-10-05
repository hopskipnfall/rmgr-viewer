/** What a replay file tells us about itself without reading its bytes. */
export interface FileMeta {
  /**
   * Relative to the library root on desktop; `webkitRelativePath` for a web
   * folder pick, otherwise the bare filename.
   */
  sourcePath: string;
  size: number;
  lastModified: number;
}

/** The unit of import: where a replay's bytes come from (browser `File` or desktop library folder). */
export interface ReplayFileSource {
  meta: FileMeta;
  name: string;
  /** Lazy. Called only when parsing a new/changed file or opening a game. */
  read(): Promise<Uint8Array>;
}

export function fromBrowserFile(file: File): ReplayFileSource {
  return {
    meta: {
      sourcePath: file.webkitRelativePath || file.name,
      size: file.size,
      lastModified: file.lastModified,
    },
    name: file.name,
    read: async () => new Uint8Array(await file.arrayBuffer()),
  };
}
