import { describe, it, expect } from "vitest";
import { HomeSidebarController } from "./homeSidebar.js";
import { createDefaultIdentity } from "../data/identity.js";

interface FakeEl {
  hidden: boolean;
  innerHTML: string;
  textContent: string;
  attributes: Map<string, string>;
  listeners: Map<string, Array<() => void>>;
  addEventListener: (event: string, cb: () => void) => void;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  getAttribute: (name: string) => string | null;
  querySelector: () => null;
  querySelectorAll: () => never[];
  classList: { add: () => void; remove: () => void; toggle: () => void };
  dataset: Record<string, string>;
  fire: (event: string) => void;
}

function makeFakeEl(): FakeEl {
  const el: FakeEl = {
    hidden: false,
    innerHTML: "",
    textContent: "",
    attributes: new Map(),
    listeners: new Map(),
    addEventListener: (event, cb) => {
      const existing = el.listeners.get(event) ?? [];
      existing.push(cb);
      el.listeners.set(event, existing);
    },
    setAttribute: (name, value) => el.attributes.set(name, value),
    removeAttribute: (name) => el.attributes.delete(name),
    getAttribute: (name) => el.attributes.get(name) ?? null,
    querySelector: () => null,
    querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    dataset: {},
    fire: (event) => {
      for (const cb of el.listeners.get(event) ?? []) cb();
    },
  };
  return el;
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

describe("HomeSidebarController statistics nav item", () => {
  it("calls onSelectStatistics when the statistics link is clicked", () => {
    const container = makeFakeContainer();
    const modalContainer = makeFakeContainer();
    let selectStatisticsCalls = 0;

    new HomeSidebarController(
      container,
      modalContainer,
      createDefaultIdentity(),
      () => {},
      () => {},
      () => {
        selectStatisticsCalls++;
      },
    );

    container.byId("sidebarStatisticsLink").fire("click");

    expect(selectStatisticsCalls).toBe(1);
  });

  it("marks the statistics link current when the selected session id is null", () => {
    const container = makeFakeContainer();
    const modalContainer = makeFakeContainer();

    const controller = new HomeSidebarController(
      container,
      modalContainer,
      createDefaultIdentity(),
      () => {},
      () => {},
      () => {},
    );

    controller.setSelectedSessionId(null);
    expect(
      container.byId("sidebarStatisticsLink").getAttribute("aria-current"),
    ).toBe("page");

    controller.setSelectedSessionId("session-1");
    expect(
      container.byId("sidebarStatisticsLink").getAttribute("aria-current"),
    ).toBeNull();
  });

  it("sets the statistics link label via updateTranslations", () => {
    const container = makeFakeContainer();
    const modalContainer = makeFakeContainer();

    const controller = new HomeSidebarController(
      container,
      modalContainer,
      createDefaultIdentity(),
      () => {},
      () => {},
      () => {},
    );

    controller.updateTranslations();

    expect(container.byId("sidebarStatisticsLink").textContent).toBe(
      "Statistics",
    );
  });
});
