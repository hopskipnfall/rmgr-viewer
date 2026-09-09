export interface CustomDropdownOption<T = string | number> {
  value: T;
  label: string;
  sublabel?: string;
  iconUrl?: string;
  badge?: string;
  disabled?: boolean;
}

export interface CustomDropdownGroup<T = string | number> {
  groupName: string;
  options: CustomDropdownOption<T>[];
}

export interface CustomDropdownConfig<T = string | number> {
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  options?: CustomDropdownOption<T>[];
  groups?: CustomDropdownGroup<T>[];
  selectedValue?: T;
  className?: string;
  ariaLabel?: string;
  syncSelect?: HTMLSelectElement;
  onChange?: (value: T, option: CustomDropdownOption<T>) => void;
}

export class CustomDropdown<T = string | number> {
  private container: HTMLElement;
  private config: CustomDropdownConfig<T>;
  private wrapperEl!: HTMLDivElement;
  private triggerBtn!: HTMLButtonElement;
  private triggerContent!: HTMLDivElement;
  private menuEl!: HTMLDivElement;
  private listEl!: HTMLDivElement;
  private searchInputEl?: HTMLInputElement;
  private chevronEl!: HTMLElement;

  private allOptions: CustomDropdownOption<T>[] = [];
  private visibleOptions: CustomDropdownOption<T>[] = [];
  private selectedValue?: T;
  private focusedIndex = -1;
  private isOpen = false;

  private boundOnDocumentClick: (e: MouseEvent) => void;
  private boundOnDocumentKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, config: CustomDropdownConfig<T>) {
    this.container = container;
    this.config = config;

    this.boundOnDocumentClick = this.onDocumentClick.bind(this);
    this.boundOnDocumentKeyDown = this.onDocumentKeyDown.bind(this);

    this.initOptions();
    this.buildDOM();
    this.attachEvents();

    if (this.config.selectedValue !== undefined) {
      this.setValue(this.config.selectedValue, false);
    } else if (this.allOptions.length > 0 && this.allOptions[0]) {
      this.setValue(this.allOptions[0].value, false);
    }
  }

  private initOptions(): void {
    if (this.config.groups && this.config.groups.length > 0) {
      this.allOptions = this.config.groups.flatMap((g) => g.options);
    } else if (this.config.options && this.config.options.length > 0) {
      this.allOptions = [...this.config.options];
    } else {
      this.allOptions = [];
    }
    this.visibleOptions = [...this.allOptions];
  }

  private buildDOM(): void {
    this.wrapperEl = document.createElement("div");
    this.wrapperEl.className =
      `custom-dropdown ${this.config.className ?? ""}`.trim();
    this.wrapperEl.setAttribute("role", "combobox");
    this.wrapperEl.setAttribute("aria-expanded", "false");
    this.wrapperEl.setAttribute("aria-haspopup", "listbox");

    // Trigger Button
    this.triggerBtn = document.createElement("button");
    this.triggerBtn.type = "button";
    this.triggerBtn.className = "custom-dropdown-trigger";
    if (this.config.ariaLabel) {
      this.triggerBtn.setAttribute("aria-label", this.config.ariaLabel);
    }

    this.triggerContent = document.createElement("div");
    this.triggerContent.className = "custom-dropdown-trigger-content";
    this.triggerContent.innerHTML = `<span class="custom-dropdown-placeholder">${this.config.placeholder ?? "Select option..."}</span>`;

    const chevronWrapper = document.createElement("span");
    chevronWrapper.className = "custom-dropdown-chevron";
    chevronWrapper.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    `;
    this.chevronEl = chevronWrapper;

    this.triggerBtn.appendChild(this.triggerContent);
    this.triggerBtn.appendChild(chevronWrapper);
    this.wrapperEl.appendChild(this.triggerBtn);

    // Dropdown Menu Popover
    this.menuEl = document.createElement("div");
    this.menuEl.className = "custom-dropdown-menu";
    this.menuEl.setAttribute("role", "listbox");
    this.menuEl.hidden = true;

    // Optional Search Input
    if (this.config.searchable) {
      const searchWrap = document.createElement("div");
      searchWrap.className = "custom-dropdown-search-wrap";
      this.searchInputEl = document.createElement("input");
      this.searchInputEl.type = "text";
      this.searchInputEl.className = "custom-dropdown-search";
      this.searchInputEl.placeholder =
        this.config.searchPlaceholder ?? "Search...";
      searchWrap.appendChild(this.searchInputEl);
      this.menuEl.appendChild(searchWrap);
    }

    // Options List
    this.listEl = document.createElement("div");
    this.listEl.className = "custom-dropdown-list";
    this.menuEl.appendChild(this.listEl);

    this.wrapperEl.appendChild(this.menuEl);
    this.container.appendChild(this.wrapperEl);

    this.renderList();
  }

  private renderList(): void {
    this.listEl.innerHTML = "";

    const query = this.searchInputEl?.value.trim().toLowerCase() ?? "";

    if (this.config.groups && this.config.groups.length > 0) {
      let totalVisible = 0;
      for (const group of this.config.groups) {
        const matchingOptions = group.options.filter((opt) => {
          if (!query) return true;
          return (
            opt.label.toLowerCase().includes(query) ||
            (opt.sublabel && opt.sublabel.toLowerCase().includes(query)) ||
            (opt.badge && opt.badge.toLowerCase().includes(query))
          );
        });

        if (matchingOptions.length === 0) continue;

        const groupEl = document.createElement("div");
        groupEl.className = "custom-dropdown-group";

        const headerEl = document.createElement("div");
        headerEl.className = "custom-dropdown-group-header";
        headerEl.textContent = group.groupName;
        groupEl.appendChild(headerEl);

        for (const opt of matchingOptions) {
          const optEl = this.createOptionElement(opt);
          groupEl.appendChild(optEl);
          totalVisible++;
        }

        this.listEl.appendChild(groupEl);
      }

      if (totalVisible === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "custom-dropdown-empty";
        emptyEl.textContent = "No matching options";
        this.listEl.appendChild(emptyEl);
      }
    } else {
      const matchingOptions = this.allOptions.filter((opt) => {
        if (!query) return true;
        return (
          opt.label.toLowerCase().includes(query) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(query)) ||
          (opt.badge && opt.badge.toLowerCase().includes(query))
        );
      });

      if (matchingOptions.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "custom-dropdown-empty";
        emptyEl.textContent = "No matching options";
        this.listEl.appendChild(emptyEl);
      } else {
        for (const opt of matchingOptions) {
          const optEl = this.createOptionElement(opt);
          this.listEl.appendChild(optEl);
        }
      }
    }

    this.updateFocusedVisual();
  }

  private createOptionElement(opt: CustomDropdownOption<T>): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "custom-dropdown-option";
    el.setAttribute("role", "option");
    el.dataset.value = String(opt.value);

    const isSelected = opt.value === this.selectedValue;
    el.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) {
      el.classList.add("selected");
    }
    if (opt.disabled) {
      el.classList.add("disabled");
      el.setAttribute("aria-disabled", "true");
    }

    // Icon
    if (opt.iconUrl) {
      const img = document.createElement("img");
      img.className = "custom-dropdown-icon";
      img.src = opt.iconUrl;
      img.alt = opt.label;
      img.loading = "lazy";
      el.appendChild(img);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "custom-dropdown-icon-placeholder";
      el.appendChild(placeholder);
    }

    // Label and sublabel
    const textWrap = document.createElement("div");
    textWrap.className = "custom-dropdown-option-text";

    const labelSpan = document.createElement("span");
    labelSpan.className = "custom-dropdown-option-label";
    labelSpan.textContent = opt.label;
    textWrap.appendChild(labelSpan);

    if (opt.sublabel) {
      const sublabelSpan = document.createElement("span");
      sublabelSpan.className = "custom-dropdown-option-sublabel";
      sublabelSpan.textContent = opt.sublabel;
      textWrap.appendChild(sublabelSpan);
    }
    el.appendChild(textWrap);

    // Badge (e.g. Hex ID 0x34)
    if (opt.badge) {
      const badgeSpan = document.createElement("span");
      badgeSpan.className = "custom-dropdown-badge";
      badgeSpan.textContent = opt.badge;
      el.appendChild(badgeSpan);
    }

    // Checkmark
    const checkIcon = document.createElement("span");
    checkIcon.className = "custom-dropdown-check";
    checkIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
    `;
    el.appendChild(checkIcon);

    el.addEventListener("click", () => {
      if (opt.disabled) return;
      this.setValue(opt.value, true);
      this.close();
      this.triggerBtn.focus();
    });

    return el;
  }

  private attachEvents(): void {
    // Toggle on trigger click
    this.triggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Keyboard navigation on trigger button
    this.triggerBtn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!this.isOpen) {
          this.open();
        } else {
          this.navigateOptions(e.key === "ArrowDown" ? 1 : -1);
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (this.isOpen) {
          this.selectFocusedOption();
        } else {
          this.open();
        }
      } else if (e.key === "Escape" && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });

    // Search input typing
    if (this.searchInputEl) {
      this.searchInputEl.addEventListener("input", () => {
        this.renderList();
        this.focusedIndex = 0;
        this.updateFocusedVisual();
      });

      this.searchInputEl.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          this.navigateOptions(e.key === "ArrowDown" ? 1 : -1);
        } else if (e.key === "Enter") {
          e.preventDefault();
          this.selectFocusedOption();
        } else if (e.key === "Escape") {
          e.preventDefault();
          this.close();
          this.triggerBtn.focus();
        }
      });
    }

    // Two-way sync if native select element provided
    if (this.config.syncSelect) {
      this.config.syncSelect.addEventListener("change", () => {
        const val = this.config.syncSelect?.value as unknown as T;
        if (val !== undefined && val !== this.selectedValue) {
          this.setValue(val, false);
        }
      });
    }
  }

  private onDocumentClick(e: MouseEvent): void {
    if (!this.isOpen) return;
    const target = e.target as Node | null;
    if (target && !this.wrapperEl.contains(target)) {
      this.close();
    }
  }

  private onDocumentKeyDown(e: KeyboardEvent): void {
    if (!this.isOpen) return;
    if (e.key === "Escape") {
      this.close();
      this.triggerBtn.focus();
    }
  }

  private navigateOptions(delta: number): void {
    const options = Array.from(
      this.listEl.querySelectorAll<HTMLDivElement>(
        ".custom-dropdown-option:not(.disabled)",
      ),
    );
    if (options.length === 0) return;

    this.focusedIndex = Math.max(
      0,
      Math.min(options.length - 1, this.focusedIndex + delta),
    );
    this.updateFocusedVisual();
  }

  private updateFocusedVisual(): void {
    const options = Array.from(
      this.listEl.querySelectorAll<HTMLDivElement>(
        ".custom-dropdown-option:not(.disabled)",
      ),
    );
    options.forEach((opt, idx) => {
      const isFocused = idx === this.focusedIndex;
      opt.classList.toggle("focused", isFocused);
      if (isFocused) {
        opt.scrollIntoView({ block: "nearest" });
      }
    });
  }

  private selectFocusedOption(): void {
    const options = Array.from(
      this.listEl.querySelectorAll<HTMLDivElement>(
        ".custom-dropdown-option:not(.disabled)",
      ),
    );
    const focused = options[this.focusedIndex];
    if (focused) {
      focused.click();
    }
  }

  public open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.wrapperEl.classList.add("open");
    this.wrapperEl.setAttribute("aria-expanded", "true");
    this.menuEl.hidden = false;

    // Reset search
    if (this.searchInputEl) {
      this.searchInputEl.value = "";
      this.renderList();
      this.searchInputEl.focus();
    }

    // Scroll to current selection
    const selectedEl = this.listEl.querySelector<HTMLDivElement>(
      ".custom-dropdown-option.selected",
    );
    if (selectedEl) {
      const options = Array.from(
        this.listEl.querySelectorAll<HTMLDivElement>(
          ".custom-dropdown-option:not(.disabled)",
        ),
      );
      this.focusedIndex = options.indexOf(selectedEl);
      this.updateFocusedVisual();
      selectedEl.scrollIntoView({ block: "nearest" });
    } else {
      this.focusedIndex = 0;
      this.updateFocusedVisual();
    }

    document.addEventListener("pointerdown", this.boundOnDocumentClick);
    document.addEventListener("keydown", this.boundOnDocumentKeyDown);
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.wrapperEl.classList.remove("open");
    this.wrapperEl.setAttribute("aria-expanded", "false");
    this.menuEl.hidden = true;

    document.removeEventListener("pointerdown", this.boundOnDocumentClick);
    document.removeEventListener("keydown", this.boundOnDocumentKeyDown);
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public setValue(value: T, triggerChange = true): void {
    this.selectedValue = value;

    const opt = this.allOptions.find((o) => o.value == value);
    if (opt) {
      this.triggerContent.innerHTML = `
        ${opt.iconUrl ? `<img class="custom-dropdown-icon" src="${opt.iconUrl}" alt="${opt.label}" />` : `<span class="custom-dropdown-icon-placeholder"></span>`}
        <span class="custom-dropdown-label">${opt.label}</span>
        ${opt.sublabel ? `<span class="custom-dropdown-sublabel">${opt.sublabel}</span>` : ""}
        ${opt.badge ? `<span class="custom-dropdown-badge">${opt.badge}</span>` : ""}
      `;
    } else {
      this.triggerContent.innerHTML = `<span class="custom-dropdown-placeholder">${this.config.placeholder ?? "Select option..."}</span>`;
    }

    // Update selected attributes in menu
    this.listEl
      .querySelectorAll<HTMLDivElement>(".custom-dropdown-option")
      .forEach((el) => {
        const isMatch = el.dataset.value == String(value);
        el.classList.toggle("selected", isMatch);
        el.setAttribute("aria-selected", isMatch ? "true" : "false");
      });

    // Sync to native select
    if (this.config.syncSelect) {
      if (this.config.syncSelect.value != String(value)) {
        this.config.syncSelect.value = String(value);
        if (triggerChange) {
          this.config.syncSelect.dispatchEvent(
            new Event("change", { bubbles: true }),
          );
        }
      }
    }

    if (triggerChange && opt && this.config.onChange) {
      this.config.onChange(value, opt);
    }
  }

  public getValue(): T | undefined {
    return this.selectedValue;
  }

  public setOptions(options: CustomDropdownOption<T>[]): void {
    this.config.options = options;
    this.config.groups = undefined;
    this.initOptions();
    this.renderList();
    if (this.selectedValue !== undefined) {
      this.setValue(this.selectedValue, false);
    }
  }

  public setGroups(groups: CustomDropdownGroup<T>[]): void {
    this.config.groups = groups;
    this.config.options = undefined;
    this.initOptions();
    this.renderList();
    if (this.selectedValue !== undefined) {
      this.setValue(this.selectedValue, false);
    }
  }

  public destroy(): void {
    this.close();
    this.wrapperEl.remove();
  }

  /**
   * Helper to upgrade an existing native `<select>` element to a custom dropdown.
   */
  public static fromSelect(
    selectEl: HTMLSelectElement,
    options: {
      getIconUrl?: (val: string) => string | undefined;
      getSublabel?: (val: string) => string | undefined;
      getBadge?: (val: string) => string | undefined;
      searchable?: boolean;
      className?: string;
      onChange?: (val: string) => void;
    } = {},
  ): CustomDropdown<string> {
    const parent = selectEl.parentElement ?? selectEl;
    const groups: CustomDropdownGroup<string>[] = [];
    const directOptions: CustomDropdownOption<string>[] = [];

    const optgroups = selectEl.querySelectorAll("optgroup");
    if (optgroups.length > 0) {
      optgroups.forEach((og) => {
        const groupOptions: CustomDropdownOption<string>[] = [];
        og.querySelectorAll("option").forEach((opt) => {
          groupOptions.push({
            value: opt.value,
            label: opt.textContent?.trim() ?? opt.value,
            sublabel: options.getSublabel?.(opt.value),
            iconUrl: options.getIconUrl?.(opt.value),
            badge: options.getBadge?.(opt.value),
            disabled: opt.disabled,
          });
        });
        groups.push({
          groupName: og.label,
          options: groupOptions,
        });
      });
    } else {
      selectEl.querySelectorAll("option").forEach((opt) => {
        directOptions.push({
          value: opt.value,
          label: opt.textContent?.trim() ?? opt.value,
          sublabel: options.getSublabel?.(opt.value),
          iconUrl: options.getIconUrl?.(opt.value),
          badge: options.getBadge?.(opt.value),
          disabled: opt.disabled,
        });
      });
    }

    // Keep select in DOM for form/test sync, but hide it visually on desktop
    selectEl.classList.add("custom-dropdown-native-hidden");

    const container = document.createElement("div");
    container.className = "custom-dropdown-container";
    if (typeof selectEl.insertAdjacentElement === "function") {
      selectEl.insertAdjacentElement("afterend", container);
    } else if (parent && typeof parent.appendChild === "function") {
      parent.appendChild(container);
    }

    const initialSelectedValue =
      selectEl.value || groups[0]?.options[0]?.value || directOptions[0]?.value;

    return new CustomDropdown<string>(container, {
      groups: groups.length > 0 ? groups : undefined,
      options: groups.length === 0 ? directOptions : undefined,
      selectedValue: initialSelectedValue,
      syncSelect: selectEl,
      searchable: options.searchable ?? true,
      className: options.className,
      ariaLabel: selectEl.getAttribute("aria-label") ?? undefined,
      onChange: (val) => {
        options.onChange?.(val);
      },
    });
  }
}
