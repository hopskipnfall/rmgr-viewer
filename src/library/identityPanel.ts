import { t } from "../i18n.js";
import type { GameSummary } from "../data/gameSummary.js";
import {
  type Identity,
  extractAllPlayerNames,
  saveIdentity,
} from "../data/identity.js";

export class IdentityPanel {
  private container: HTMLElement;
  private identity: Identity;
  private onIdentityChanged: (identity: Identity) => void;
  private modalContainer: HTMLElement;

  constructor(
    container: HTMLElement,
    modalContainer: HTMLElement,
    identity: Identity,
    onIdentityChanged: (identity: Identity) => void,
  ) {
    this.container = container;
    this.modalContainer = modalContainer;
    this.identity = identity;
    this.onIdentityChanged = onIdentityChanged;
  }

  public setIdentity(identity: Identity): void {
    this.identity = identity;
    this.render();
  }

  public render(): void {
    const tr = t();
    this.container.innerHTML = `
      <div class="identity-card-header">
        <span class="section-title">${tr.you}</span>
        <button class="edit-identity-btn" id="editIdentityBtn">${tr.edit}</button>
      </div>
      <div class="identity-name">${escapeHtml(this.identity.displayName)}</div>
      <div class="identity-aliases-count">${tr.aliasesCount(this.identity.aliases.size)}</div>
    `;

    const editBtn = this.container.querySelector(
      "#editIdentityBtn",
    ) as HTMLButtonElement;
    editBtn?.addEventListener("click", () => {
      // Need summaries to extract names, but modal can also open with currently known aliases
      this.openModal([]);
    });
  }

  public openModal(summaries: GameSummary[]): void {
    const tr = t();
    const observedNames = extractAllPlayerNames(summaries);

    // Collect all candidates: observed names + existing aliases
    const candidatesMap = new Map<string, number>();
    for (const item of observedNames) {
      candidatesMap.set(item.name, item.count);
    }
    for (const alias of this.identity.aliases) {
      if (!candidatesMap.has(alias)) {
        candidatesMap.set(alias, 0);
      }
    }

    const candidateList = Array.from(candidatesMap.entries()).map(
      ([name, count]) => ({
        name,
        count,
        checked: this.identity.aliases.has(name),
      }),
    );

    this.modalContainer.hidden = false;
    this.modalContainer.innerHTML = `
      <div class="modal-backdrop" id="modalBackdrop"></div>
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>${escapeHtml(tr.identityModalTitle)}</h3>
          <button class="modal-close" id="modalCloseBtn">✕</button>
        </div>
        <p class="modal-subtitle">${escapeHtml(tr.identityModalSubtitle)}</p>

        <div class="modal-body">
          <div class="alias-checkbox-list">
            ${
              candidateList.length === 0
                ? `<p class="empty-hint">No player names found in loaded replays.</p>`
                : candidateList
                    .map(
                      (item) => `
                <label class="alias-checkbox-row">
                  <input type="checkbox" data-name="${escapeHtml(item.name)}" ${item.checked ? "checked" : ""} />
                  <span class="alias-label-name">${escapeHtml(item.name)}</span>
                  ${item.count > 0 ? `<span class="alias-label-count">(${item.count} games)</span>` : ""}
                </label>
              `,
                    )
                    .join("")
            }
          </div>

          <div class="add-alias-row">
            <input type="text" id="newAliasInput" placeholder="${escapeHtml(tr.addCustomAlias)}" />
            <button id="addAliasBtn" class="btn-secondary">${escapeHtml(tr.add)}</button>
          </div>
        </div>

        <div class="modal-footer">
          <button id="cancelModalBtn" class="btn-secondary">${escapeHtml(tr.cancel)}</button>
          <button id="saveModalBtn" class="btn-primary">${escapeHtml(tr.save)}</button>
        </div>
      </div>
    `;

    const close = () => {
      this.modalContainer.hidden = true;
      this.modalContainer.innerHTML = "";
    };

    const backdrop = this.modalContainer.querySelector("#modalBackdrop");
    const closeBtn = this.modalContainer.querySelector("#modalCloseBtn");
    const cancelBtn = this.modalContainer.querySelector("#cancelModalBtn");
    const saveBtn = this.modalContainer.querySelector("#saveModalBtn");
    const addBtn = this.modalContainer.querySelector("#addAliasBtn");
    const newAliasInput = this.modalContainer.querySelector(
      "#newAliasInput",
    ) as HTMLInputElement;

    backdrop?.addEventListener("click", close);
    closeBtn?.addEventListener("click", close);
    cancelBtn?.addEventListener("click", close);

    addBtn?.addEventListener("click", () => {
      const val = newAliasInput.value.trim();
      if (!val) return;
      this.identity.aliases.add(val);
      if (this.identity.displayName === "Me") {
        this.identity.displayName = val;
      }
      newAliasInput.value = "";
      this.openModal(summaries);
    });

    newAliasInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addBtn?.dispatchEvent(new MouseEvent("click"));
      }
    });

    saveBtn?.addEventListener("click", () => {
      const checkedBoxes =
        this.modalContainer.querySelectorAll<HTMLInputElement>(
          ".alias-checkbox-list input[type='checkbox']",
        );
      const newAliases = new Set<string>();
      let firstChecked: string | null = null;

      checkedBoxes.forEach((cb) => {
        const name = cb.dataset.name;
        if (name && cb.checked) {
          newAliases.add(name);
          if (!firstChecked) firstChecked = name;
        }
      });

      this.identity.aliases = newAliases;
      if (
        firstChecked &&
        (this.identity.displayName === "Me" ||
          !newAliases.has(this.identity.displayName))
      ) {
        this.identity.displayName = firstChecked;
      } else if (newAliases.size === 0) {
        this.identity.displayName = "Me";
      }

      saveIdentity(this.identity);
      this.render();
      this.onIdentityChanged(this.identity);
      close();
    });
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
