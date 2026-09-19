import { describe, it, expect, vi, afterEach } from "vitest";
import { LibraryViewController } from "./libraryView.js";

interface FakeEl {
  hidden: boolean;
  innerHTML: string;
  textContent: string;
  addEventListener: () => void;
  querySelector: () => null;
  querySelectorAll: () => never[];
  classList: { add: () => void; remove: () => void; toggle: () => void };
}

function makeFakeEl(): FakeEl {
  return {
    hidden: false,
    innerHTML: "",
    textContent: "",
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
  };
}

function makeFakeContainer() {
  const byId = new Map<string, FakeEl>();
  const get = (id: string) => {
    if (!byId.has(id)) byId.set(id, makeFakeEl());
    return byId.get(id)!;
  };
  return {
    innerHTML: "",
    querySelector: (selector: string) => {
      const m = /^#([\w-]+)/.exec(selector);
      return m ? get(m[1]!) : makeFakeEl();
    },
    querySelectorAll: () => [],
    byId: get,
  } as unknown as HTMLElement & { byId: (id: string) => FakeEl };
}

describe("LibraryViewController desktop/mobile game list gating", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides the game list on desktop", () => {
    vi.stubGlobal("window", { innerWidth: 1200 });
    const container = makeFakeContainer();
    const controller = new LibraryViewController(
      container,
      () => {},
      () => {},
      () => {},
    );
    controller.setSummaries([]);

    expect(container.byId("gameListWrap").hidden).toBe(true);
  });

  it("shows the game list on mobile", () => {
    vi.stubGlobal("window", { innerWidth: 500 });
    const container = makeFakeContainer();
    const controller = new LibraryViewController(
      container,
      () => {},
      () => {},
      () => {},
    );
    controller.setSummaries([]);

    expect(container.byId("gameListWrap").hidden).toBe(false);
  });
});
