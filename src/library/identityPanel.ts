import { t } from "../i18n.js";
import type { GameSummary } from "../data/gameSummary.js";
import { type Identity, extractAllPlayerNames } from "../data/identity.js";

export class IdentityPanel {
  private container: HTMLElement;
  private identity: Identity;
  private onIdentityChanged: (identity: Identity) => void;
  private modalContainer: HTMLElement;
  private getSummaries: () => GameSummary[];

  constructor(
    container: HTMLElement,
    modalContainer: HTMLElement,
    identity: Identity,
    getSummaries: () => GameSummary[],
    onIdentityChanged: (identity: Identity) => void,
  ) {
    this.container = container;
    this.modalContainer = modalContainer;
    this.identity = identity;
    this.getSummaries = getSummaries;
    this.onIdentityChanged = onIdentityChanged;
  }

  public setIdentity(identity: Identity): void {
    this.identity = identity;
    this.render();
  }

  public render(): void {
    const tr = t();
    const hasAliases = this.identity.aliases.size > 0;
    const nameDisplay = hasAliases
      ? escapeHtml(
          this.identity.displayName ||
            Array.from(this.identity.aliases)[0] ||
            "",
        )
      : escapeHtml(tr.noNamesSelected);
    const subDisplay = hasAliases
      ? tr.aliasesCount(this.identity.aliases.size)
      : escapeHtml(tr.selectYourNames);

    this.container.innerHTML = `
      <div class="identity-card-header">
        <span class="section-title">${tr.you}</span>
        <button class="edit-identity-btn" id="editIdentityBtn">${tr.edit}</button>
      </div>
      <div class="identity-name ${!hasAliases ? "not-selected" : ""}">${nameDisplay}</div>
      <div class="identity-aliases-count">${subDisplay}</div>
    `;

    const editBtn = this.container.querySelector(
      "#editIdentityBtn",
    ) as HTMLButtonElement;
    editBtn?.addEventListener("click", () => {
      this.openModal(this.getSummaries());
    });
  }

  public openModal(summaries?: GameSummary[]): void {
    const tr = t();
    const targetSummaries = summaries ?? this.getSummaries();
    const observedNames = extractAllPlayerNames(targetSummaries);

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
          <div class="modal-selection-toolbar">
            <button type="button" id="selectAllModalBtn" class="btn-link">${escapeHtml(tr.selectAll)}</button>
            <span class="meta-dot">·</span>
            <button type="button" id="deselectAllModalBtn" class="btn-link">${escapeHtml(tr.deselectAll)}</button>
          </div>

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
    const selectAllBtn =
      this.modalContainer.querySelector("#selectAllModalBtn");
    const deselectAllBtn = this.modalContainer.querySelector(
      "#deselectAllModalBtn",
    );

    backdrop?.addEventListener("click", close);
    closeBtn?.addEventListener("click", close);
    cancelBtn?.addEventListener("click", close);

    selectAllBtn?.addEventListener("click", () => {
      const cbs = this.modalContainer.querySelectorAll<HTMLInputElement>(
        ".alias-checkbox-list input[type='checkbox']",
      );
      cbs.forEach((cb) => {
        cb.checked = true;
      });
    });

    deselectAllBtn?.addEventListener("click", () => {
      const cbs = this.modalContainer.querySelectorAll<HTMLInputElement>(
        ".alias-checkbox-list input[type='checkbox']",
      );
      cbs.forEach((cb) => {
        cb.checked = false;
      });
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
      this.identity.displayName = firstChecked ?? "";

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
