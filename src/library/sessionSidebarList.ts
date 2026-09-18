import type { SessionGroup } from "../data/session.js";

const RECENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface RecencyGroups {
  readonly thisWeek: readonly SessionGroup[];
  readonly older: readonly SessionGroup[];
}

/**
 * "This week" is a rolling last-7-days window (now back through 6 days
 * ago), not a calendar week - avoids a Sunday/Monday start-of-week
 * convention debate. Each group is sorted newest-first.
 */
export function groupSessionsByRecency(
  sessions: readonly SessionGroup[],
  now: Date,
): RecencyGroups {
  const cutoff = now.getTime() - RECENCY_WINDOW_MS;
  const sorted = [...sessions].sort(
    (a, b) => b.startTime.getTime() - a.startTime.getTime(),
  );
  return {
    thisWeek: sorted.filter((s) => s.startTime.getTime() > cutoff),
    older: sorted.filter((s) => s.startTime.getTime() <= cutoff),
  };
}

/**
 * Line 1 of a sidebar session row. `opponentName` is already a
 * comma-joined list of every other lobby member (session.ts's
 * getOpponentInfo), so a 3-4 player rotation session lists everyone.
 * Solo/no-opponent sessions (empty opponentName) are assumed not to
 * occur - this deliberately does not special-case that, per the design.
 */
export function sessionOpponentLine(session: SessionGroup): string {
  return `with ${session.opponentName}`;
}

/** Line 2 of a sidebar session row: date + W-L record. */
export function sessionDateRecordLine(session: SessionGroup): string {
  const dateStr = session.startTime.toLocaleDateString();
  return `${dateStr} · ${session.wins}-${session.losses}`;
}

/** Matches gameList.ts's escapeHtml exactly - document is undefined under
 * vitest's plain Node test environment. */
function escapeHtml(s: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class SessionSidebarList {
  private sessions: readonly SessionGroup[] = [];
  private selectedSessionId: string | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly onSelectSession: (id: string) => void,
  ) {}

  public setSessions(sessions: readonly SessionGroup[]): void {
    this.sessions = sessions;
  }

  public setSelectedSessionId(id: string | null): void {
    this.selectedSessionId = id;
  }

  /** `now` is injectable for tests; defaults to the real current time. */
  public render(now: Date = new Date()): void {
    const { thisWeek, older } = groupSessionsByRecency(this.sessions, now);

    const renderGroup = (label: string, sessions: readonly SessionGroup[]) => {
      if (sessions.length === 0) return "";
      const rows = sessions
        .map((session) => {
          const selected = session.id === this.selectedSessionId;
          return `
            <button
              class="session-sidebar-row"
              data-session-id="${escapeHtml(session.id)}"
              ${selected ? 'aria-current="page"' : ""}
            >
              <span class="session-sidebar-row-line1">${escapeHtml(sessionOpponentLine(session))}</span>
              <span class="session-sidebar-row-line2">${escapeHtml(sessionDateRecordLine(session))}</span>
            </button>
          `;
        })
        .join("");
      return `
        <div class="session-sidebar-group">
          <h4 class="session-sidebar-group-label">${escapeHtml(label)}</h4>
          ${rows}
        </div>
      `;
    };

    this.container.innerHTML =
      renderGroup("This week", thisWeek) + renderGroup("Older", older);

    this.container
      .querySelectorAll<HTMLElement>(".session-sidebar-row")
      .forEach((row) => {
        row.addEventListener("click", () => {
          const id = row.dataset.sessionId;
          if (id) this.onSelectSession(id);
        });
      });
  }
}
