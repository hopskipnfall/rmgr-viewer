import { t } from "../i18n.js";
import type { GameSummary } from "../data/gameSummary.js";
import {
  type Identity,
  extractAllPlayerNames,
  matchesAlias,
} from "../data/identity.js";
import {
  addOpponentMerge,
  removeOpponentMerge,
} from "../data/opponentAliases.js";

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
      <button type="button" class="btn-link" id="editOpponentTagsBtn">${escapeHtml(tr.opponentTagsButton)}</button>
    `;

    const editBtn = this.container.querySelector(
      "#editIdentityBtn",
    ) as HTMLButtonElement;
    editBtn?.addEventListener("click", () => {
      this.openModal(this.getSummaries());
    });
    this.container
      .querySelector("#editOpponentTagsBtn")
      ?.addEventListener("click", () => this.openOpponentTagsModal());
  }

  /**
   * Merge editor for opponent tags (see data/opponentAliases.ts). Changes apply immediately
   * (each merge or unmerge is saved through onIdentityChanged) and the dialog re-renders.
   */
  public openOpponentTagsModal(): void {
    const tr = t();
    const aliases = this.identity.opponentAliases ?? {};

    // Every opponent tag seen in the library (not the user's own names), with game counts.
    const counts = new Map<string, number>();
    for (const { name, count } of extractAllPlayerNames(this.getSummaries())) {
      if (!matchesAlias(name, this.identity)) counts.set(name, count);
    }
    const allTags = new Set(counts.keys());
    for (const [alt, canonical] of Object.entries(aliases)) {
      allTags.add(alt);
      allTags.add(canonical);
    }
    const tags = [...allTags].sort((a, b) => a.localeCompare(b));
    const option = (name: string): string =>
      `<option value="${escapeHtml(name)}">${escapeHtml(name)}${
        counts.has(name)
          ? ` (${escapeHtml(tr.opponentTagsGames(counts.get(name)!))})`
          : ""
      }</option>`;
    const picker = (id: string): string => `
      <select id="${id}">
        <option value="">${escapeHtml(tr.opponentTagsPick)}</option>
        ${tags.map(option).join("")}
      </select>`;

    const merges = Object.entries(aliases).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    this.modalContainer.hidden = false;
    this.modalContainer.innerHTML = `
      <div class="modal-backdrop" id="modalBackdrop"></div>
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>${escapeHtml(tr.opponentTagsTitle)}</h3>
          <button class="modal-close" id="modalCloseBtn">✕</button>
        </div>
        <p class="modal-subtitle">${escapeHtml(tr.opponentTagsSubtitle)}</p>
        <div class="modal-body">
          <div class="opponent-tag-merge-form">
            ${picker("opponentTagAlt")}
            <span class="opponent-tag-same-as">${escapeHtml(tr.opponentTagsSameAs)}</span>
            ${picker("opponentTagTarget")}
            <button type="button" id="opponentTagMergeBtn" class="btn-primary" disabled>${escapeHtml(tr.opponentTagsMerge)}</button>
          </div>
          <div class="section-title">${escapeHtml(tr.opponentTagsMergesHeading)}</div>
          <div class="alias-checkbox-list">
            ${
              merges.length === 0
                ? `<p class="empty-hint">${escapeHtml(tr.opponentTagsNone)}</p>`
                : merges
                    .map(
                      ([alt, canonical]) => `
              <div class="opponent-tag-merge-row">
                <span class="alias-label-name">${escapeHtml(alt)} → ${escapeHtml(canonical)}</span>
                <button type="button" class="btn-link" data-unmerge="${escapeHtml(alt)}">${escapeHtml(tr.opponentTagsRemove)}</button>
              </div>`,
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    `;

    const close = () => {
      this.modalContainer.hidden = true;
      this.modalContainer.innerHTML = "";
    };
    this.modalContainer
      .querySelector("#modalBackdrop")
      ?.addEventListener("click", close);
    this.modalContainer
      .querySelector("#modalCloseBtn")
      ?.addEventListener("click", close);

    const apply = (next: Readonly<Record<string, string>>) => {
      this.identity.opponentAliases = next;
      this.onIdentityChanged(this.identity);
      this.openOpponentTagsModal();
    };

    const altSelect =
      this.modalContainer.querySelector<HTMLSelectElement>("#opponentTagAlt");
    const targetSelect =
      this.modalContainer.querySelector<HTMLSelectElement>(
        "#opponentTagTarget",
      );
    const mergeBtn = this.modalContainer.querySelector<HTMLButtonElement>(
      "#opponentTagMergeBtn",
    );
    const refreshMergeBtn = () => {
      if (!mergeBtn || !altSelect || !targetSelect) return;
      mergeBtn.disabled =
        !altSelect.value ||
        !targetSelect.value ||
        altSelect.value === targetSelect.value;
    };
    altSelect?.addEventListener("change", refreshMergeBtn);
    targetSelect?.addEventListener("change", refreshMergeBtn);
    mergeBtn?.addEventListener("click", () => {
      if (!altSelect?.value || !targetSelect?.value) return;
      apply(addOpponentMerge(aliases, altSelect.value, targetSelect.value));
    });
    this.modalContainer
      .querySelectorAll<HTMLButtonElement>("[data-unmerge]")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          apply(removeOpponentMerge(aliases, btn.dataset.unmerge ?? "")),
        ),
      );
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
