import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CustomDropdown,
  type CustomDropdownGroup,
  type CustomDropdownOption,
} from "./customDropdown.js";

function matchesSelector(el: MockElement, selector: string): boolean {
  const parts = selector.split(",").map((s) => s.trim());
  return parts.some((sel) => {
    if (sel.startsWith(".")) {
      const cls = sel.slice(1).split(":")[0] ?? "";
      return el.classList.contains(cls);
    }
    if (sel.startsWith("#")) {
      const id = sel.slice(1);
      return (el as unknown as { id?: string }).id === id;
    }
    const tag = sel.split(":")[0]?.toUpperCase();
    return el.tagName === tag;
  });
}

class MockElement {
  public tagName: string;
  private _classes = new Set<string>();
  private _innerHTML = "";
  private _textContent = "";
  public value = "";
  public type = "";
  public placeholder = "";
  public hidden = false;
  public disabled = false;
  public label = "";
  public id = "";
  public src = "";
  public dataset: Record<string, string> = {};
  public parentElement: MockElement | null = null;
  public children: MockElement[] = [];
  public classList: {
    add: (...c: string[]) => void;
    remove: (...c: string[]) => void;
    toggle: (c: string, force?: boolean) => boolean;
    contains: (c: string) => boolean;
  };
  private attributes: Record<string, string> = {};
  private listeners: Record<string, ((e: unknown) => void)[]> = {};

  get className(): string {
    return Array.from(this._classes).join(" ");
  }

  set className(val: string) {
    this._classes.clear();
    (val || "")
      .split(/\s+/)
      .filter(Boolean)
      .forEach((x) => this._classes.add(x));
  }

  get innerHTML(): string {
    if (this.children.length > 0) {
      return this.children
        .map((c) => c.innerHTML || c.textContent || "")
        .join("");
    }
    return this._innerHTML;
  }

  set innerHTML(val: string) {
    this._innerHTML = val;
    if (val === "") {
      this.children = [];
    }
  }

  get textContent(): string {
    if (this.children.length > 0) {
      return this.children.map((c) => c.textContent).join("");
    }
    return this._textContent;
  }

  set textContent(val: string) {
    this._textContent = val;
    this.children = [];
  }

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
    this.classList = {
      add: (...c: string[]) => {
        c.forEach((x) =>
          x
            .split(/\s+/)
            .filter(Boolean)
            .forEach((cl) => this._classes.add(cl)),
        );
      },
      remove: (...c: string[]) => {
        c.forEach((x) => this._classes.delete(x));
      },
      toggle: (c: string, force?: boolean) => {
        const has = this._classes.has(c);
        const shouldHave = force !== undefined ? force : !has;
        if (shouldHave) this._classes.add(c);
        else this._classes.delete(c);
        return shouldHave;
      },
      contains: (c: string) => this._classes.has(c),
    };
  }

  setAttribute(k: string, v: string) {
    this.attributes[k] = v;
  }
  getAttribute(k: string) {
    return this.attributes[k] ?? null;
  }
  appendChild(child: MockElement) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) this.parentElement.children.splice(idx, 1);
    }
  }
  insertAdjacentElement(_pos: string, el: MockElement) {
    if (this.parentElement) {
      this.parentElement.appendChild(el);
    }
    return el;
  }
  addEventListener(event: string, cb: (e: unknown) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }
  removeEventListener(event: string, cb: (e: unknown) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
  }
  dispatchEvent(event: { type: string }) {
    for (const l of this.listeners[event.type] ?? []) {
      l(event);
    }
    return true;
  }
  click() {
    this.dispatchEvent(new Event("click"));
  }
  focus() {}
  scrollIntoView() {}
  contains(node: unknown): boolean {
    if (node === this) return true;
    return this.children.some((c) => c.contains(node));
  }
  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    const check = (el: MockElement) => {
      if (matchesSelector(el, selector)) results.push(el);
      for (const child of el.children) check(child);
    };
    for (const child of this.children) check(child);
    return results;
  }
  querySelector(selector: string): MockElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

describe("CustomDropdown", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let origDocument: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let origEvent: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let origKeyboardEvent: any;

  beforeEach(() => {
    origDocument = globalThis.document;
    origEvent = globalThis.Event;
    origKeyboardEvent = globalThis.KeyboardEvent;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = {
      createElement: (tag: string) => new MockElement(tag),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Event = class MockEvent {
      constructor(public type: string) {}
      stopPropagation() {}
      preventDefault() {}
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).KeyboardEvent = class MockKeyboardEvent {
      constructor(
        public type: string,
        public init?: { key: string },
      ) {}
      get key() {
        return this.init?.key ?? "";
      }
      preventDefault() {}
    };
  });

  afterEach(() => {
    globalThis.document = origDocument;
    globalThis.Event = origEvent;
    globalThis.KeyboardEvent = origKeyboardEvent;
  });

  it("initializes with options and renders the selected option in trigger", () => {
    const container = new MockElement("div");
    const options: CustomDropdownOption<number>[] = [
      {
        value: 0x00,
        label: "Mario",
        sublabel: "マリオ",
        iconUrl: "/characters/mario.svg",
        badge: "0x00",
      },
      {
        value: 0x01,
        label: "Fox",
        sublabel: "フォックス",
        iconUrl: "/characters/fox.svg",
        badge: "0x01",
      },
    ];

    const dropdown = new CustomDropdown(container as unknown as HTMLElement, {
      options,
      selectedValue: 0x01,
    });

    expect(dropdown.getValue()).toBe(0x01);
    const trigger = container.querySelector(".custom-dropdown-trigger");
    expect(trigger).not.toBeNull();
    expect(trigger?.innerHTML).toContain("Fox");
    expect(trigger?.innerHTML).toContain("フォックス");
    expect(trigger?.innerHTML).toContain("0x01");
    expect(trigger?.innerHTML).toContain("/characters/fox.svg");
  });

  it("supports grouped options with headers", () => {
    const container = new MockElement("div");
    const groups: CustomDropdownGroup<number>[] = [
      {
        groupName: "Original 12",
        options: [
          { value: 0x00, label: "Mario", iconUrl: "/characters/mario.svg" },
          { value: 0x01, label: "Fox", iconUrl: "/characters/fox.svg" },
        ],
      },
      {
        groupName: "Remix Fighters",
        options: [
          { value: 0x34, label: "Bowser", iconUrl: "/characters/bowser.svg" },
        ],
      },
    ];

    const dropdown = new CustomDropdown(container as unknown as HTMLElement, {
      groups,
      selectedValue: 0x34,
    });

    expect(dropdown.getValue()).toBe(0x34);
    const trigger = container.querySelector(".custom-dropdown-trigger");
    expect(trigger?.innerHTML).toContain("Bowser");

    dropdown.open();
    const groupHeaders = container.querySelectorAll(
      ".custom-dropdown-group-header",
    );
    expect(groupHeaders.length).toBe(2);
    expect(groupHeaders[0]?.textContent).toBe("Original 12");
    expect(groupHeaders[1]?.textContent).toBe("Remix Fighters");

    const optionsEls = container.querySelectorAll(".custom-dropdown-option");
    expect(optionsEls.length).toBe(3);
  });

  it("opens and closes on toggle and handles option click", () => {
    const container = new MockElement("div");
    const onChange = vi.fn();
    const options: CustomDropdownOption<string>[] = [
      { value: "a", label: "Option A" },
      { value: "b", label: "Option B" },
    ];

    const dropdown = new CustomDropdown(container as unknown as HTMLElement, {
      options,
      selectedValue: "a",
      onChange,
    });

    const trigger = container.querySelector(
      ".custom-dropdown-trigger",
    ) as MockElement;
    const menu = container.querySelector(
      ".custom-dropdown-menu",
    ) as MockElement;

    expect(menu.hidden).toBe(true);

    // Open via click
    trigger.click();
    expect(menu.hidden).toBe(false);

    // Click option B
    const optionB = container.querySelectorAll(
      ".custom-dropdown-option",
    )[1] as MockElement;
    optionB.click();

    expect(dropdown.getValue()).toBe("b");
    expect(onChange).toHaveBeenCalledWith("b", options[1]);
    expect(menu.hidden).toBe(true);
    expect(trigger.innerHTML).toContain("Option B");
  });

  it("handles keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)", () => {
    const container = new MockElement("div");
    const onChange = vi.fn();
    const options: CustomDropdownOption<string>[] = [
      { value: "1", label: "First" },
      { value: "2", label: "Second" },
      { value: "3", label: "Third" },
    ];

    const dropdown = new CustomDropdown(container as unknown as HTMLElement, {
      options,
      selectedValue: "1",
      onChange,
    });

    const trigger = container.querySelector(
      ".custom-dropdown-trigger",
    ) as MockElement;
    const menu = container.querySelector(
      ".custom-dropdown-menu",
    ) as MockElement;

    // Arrow down to open
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown" }) as unknown as {
        type: string;
      },
    );
    expect(menu.hidden).toBe(false);

    // Arrow down to move focus
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown" }) as unknown as {
        type: string;
      },
    );

    // Enter to select
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter" }) as unknown as {
        type: string;
      },
    );
    expect(dropdown.getValue()).toBe("2");
    expect(menu.hidden).toBe(true);

    // Open and Escape to cancel
    dropdown.open();
    expect(menu.hidden).toBe(false);
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape" }) as unknown as {
        type: string;
      },
    );
    expect(menu.hidden).toBe(true);
  });

  it("filters options in real-time when searchable is enabled", () => {
    const container = new MockElement("div");
    const options: CustomDropdownOption<string>[] = [
      { value: "falcon", label: "Captain Falcon", sublabel: "ファルコン" },
      { value: "fox", label: "Fox", sublabel: "フォックス" },
      { value: "falco", label: "Falco", sublabel: "ファルコ" },
    ];

    const dropdown = new CustomDropdown(container as unknown as HTMLElement, {
      options,
      searchable: true,
    });

    dropdown.open();
    const searchInput = container.querySelector(
      ".custom-dropdown-search",
    ) as MockElement;
    expect(searchInput).not.toBeNull();

    // Type "fal"
    searchInput.value = "fal";
    searchInput.dispatchEvent({ type: "input" });

    const visibleOptions = container.querySelectorAll(
      ".custom-dropdown-option",
    );
    expect(visibleOptions.length).toBe(2); // Captain Falcon and Falco
  });

  it("upgrades and synchronizes with native select via CustomDropdown.fromSelect", () => {
    const wrapper = new MockElement("div");
    const select = new MockElement("select") as unknown as HTMLSelectElement;
    (select as unknown as { id: string }).id = "myTestSelect";

    const optgroup = new MockElement("optgroup");
    optgroup.label = "Fighters";

    const opt1 = new MockElement("option");
    opt1.value = "0";
    opt1.textContent = "Mario";
    const opt2 = new MockElement("option");
    opt2.value = "7";
    opt2.textContent = "Falcon";

    optgroup.appendChild(opt1);
    optgroup.appendChild(opt2);
    (select as unknown as MockElement).appendChild(optgroup);
    wrapper.appendChild(select as unknown as MockElement);

    const onNativeChange = vi.fn();
    select.addEventListener("change", onNativeChange);

    const dropdown = CustomDropdown.fromSelect(select, {
      getIconUrl: (val) => `/characters/${val}.svg`,
      getBadge: (val) => `0x${parseInt(val, 10).toString(16)}`,
    });

    expect(
      (select as unknown as MockElement).classList.contains(
        "custom-dropdown-native-hidden",
      ),
    ).toBe(true);
    expect(dropdown.getValue()).toBe("0");

    // Change value via custom dropdown
    dropdown.setValue("7", true);
    expect(select.value).toBe("7");
    expect(onNativeChange).toHaveBeenCalled();

    // Change value via native select
    select.value = "0";
    (select as unknown as MockElement).dispatchEvent({ type: "change" });
    expect(dropdown.getValue()).toBe("0");
  });
});
