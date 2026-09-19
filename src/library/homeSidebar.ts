import type { GameSummary } from "../data/gameSummary.js";
import { type Identity } from "../data/identity.js";
import { groupGamesIntoSessions } from "../data/session.js";
import { t } from "../i18n.js";
import { IdentityPanel } from "./identityPanel.js";
import { SessionSidebarList } from "./sessionSidebarList.js";

/**
 * Owns the persistent desktop sidebar shell (index.html's #librarySidebar,
 * now static markup, mounted inside #homeShell): Import replays, the YOU
 * (identity) panel, and the session list. Stays mounted across the library
 * <-> session routes - see docs/superpowers/specs/2026-09-19-desktop-session-sidebar-design.md.
 *
 * Below the 860px breakpoint this sidebar's content is unused - mobile
 * still gets its sidebar rendered inline by LibraryViewController, exactly
 * as before this change.
 */
export class HomeSidebarController {
  private identityPanel: IdentityPanel;
  private sessionList: SessionSidebarList;
  private summaries: GameSummary[] = [];
  private identity: Identity;
  private isDemoMode = false;
  /** Mobile only (below 860px) - moved here verbatim from
   * LibraryViewController, which used to own this same markup. */
  private mobileSidebarExpanded = false;

  constructor(
    private readonly container: HTMLElement,
    modalContainer: HTMLElement,
    identity: Identity,
    onIdentityChanged: (identity: Identity) => void,
    onSelectSession: (id: string) => void,
  ) {
    this.identity = identity;

    const identityCard = container.querySelector<HTMLElement>("#identityCard");
    const sessionListWrap = container.querySelector<HTMLElement>(
      "#sessionSidebarListWrap",
    );

    this.identityPanel = new IdentityPanel(
      identityCard ?? document.createElement("div"),
      modalContainer,
      identity,
      () => this.summaries,
      onIdentityChanged,
    );
    this.sessionList = new SessionSidebarList(
      sessionListWrap ?? document.createElement("div"),
      onSelectSession,
    );

    // Mobile collapse/expand toggle - moved verbatim from
    // LibraryViewController's old constructor (it owned this same
    // #mobileSidebarToggle/#librarySidebarContent markup before this
    // change). Inert on desktop; only visible/interactive below 860px per
    // index.html's existing @media (max-width: 860px) rules.
    const mobileSidebarToggle = container.querySelector<HTMLButtonElement>(
      "#mobileSidebarToggle",
    );
    const librarySidebarContent = container.querySelector<HTMLElement>(
      "#librarySidebarContent",
    );
    mobileSidebarToggle?.addEventListener("click", () => {
      this.mobileSidebarExpanded = !this.mobileSidebarExpanded;
      mobileSidebarToggle.classList.toggle(
        "expanded",
        this.mobileSidebarExpanded,
      );
      mobileSidebarToggle.setAttribute(
        "aria-expanded",
        String(this.mobileSidebarExpanded),
      );
      librarySidebarContent?.classList.toggle(
        "expanded",
        this.mobileSidebarExpanded,
      );
    });
  }

  public setDemoMode(isDemo: boolean): void {
    this.isDemoMode = isDemo;
  }

  public setData(summaries: GameSummary[], identity: Identity): void {
    this.summaries = summaries;
    this.identity = identity;
    this.identityPanel.setIdentity(identity);
    const sessions = groupGamesIntoSessions(summaries, identity);
    this.sessionList.setSessions(sessions);
    this.sessionList.render();
    this.renderMobileIdentitySummary();
  }

  /**
   * The mobile toggle's collapsed-state summary text - moved verbatim from
   * LibraryViewController.render()'s "Update mobile sidebar toggle
   * summary" block, which owned this same #mobileIdentitySummary element
   * before this change.
   */
  private renderMobileIdentitySummary(): void {
    const el = this.container.querySelector<HTMLElement>(
      "#mobileIdentitySummary",
    );
    if (!el) return;
    const aliases = Array.from(this.identity.aliases);
    if (aliases.length > 0) {
      el.textContent = aliases.join(", ");
      el.classList.remove("not-selected");
    } else {
      el.textContent = t().noNamesSelected;
      el.classList.add("not-selected");
    }
  }

  public setSelectedSessionId(id: string | null): void {
    this.sessionList.setSelectedSessionId(id);
    this.sessionList.render();
  }

  public updateTranslations(): void {
    const tr = t();
    const importBtn =
      this.container.querySelector<HTMLButtonElement>("#importBtn");
    const importFilesBtn =
      this.container.querySelector<HTMLButtonElement>("#importFilesBtn");
    const importFolderBtn =
      this.container.querySelector<HTMLButtonElement>("#importFolderBtn");
    if (importBtn) importBtn.textContent = `+ ${tr.importReplays}`;
    if (importFilesBtn) importFilesBtn.textContent = tr.importFiles;
    if (importFolderBtn) importFolderBtn.textContent = tr.importFolder;
  }
}
