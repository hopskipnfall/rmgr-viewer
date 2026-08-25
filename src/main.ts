import {
  getSeatedPorts,
  type Frame,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import { Camera } from "./camera.js";
import { ControllerPad } from "./controllerPad.js";
import { PlaybackController, type FrameChangeReason } from "./playback.js";
import { PORT_COLORS, PORT_LABELS } from "./players.js";
import { StageRenderer } from "./renderer.js";
import { actionStateName, characterName, stageName } from "./lookups.js";
import {
  computeNeutralHitEvents,
  computeNeutralHitsStats,
  type NeutralHitEvent,
} from "./neutralHits.js";
import {
  computeEdgeGuardEvents,
  computeEdgeGuardStats,
  isHitstunState,
  type EdgeGuardEvent,
} from "./edgeGuard.js";
import {
  computeLedgeTrapEvents,
  computeLedgeTrapStats,
  type LedgeTrapEvent,
} from "./ledgeTrap.js";
import {
  computeAngelInvincibilityEvents,
  computeAngelInvincibilityStats,
  type AngelInvincibilityEvent,
} from "./angelInvincibility.js";
import {
  loadReplayFromFile,
  loadReplayFromUrl,
  type LoadedReplay,
} from "./replaySource.js";

const stageCanvas = document.getElementById("stage") as HTMLCanvasElement;
const stageWrap = document.getElementById("stageWrap") as HTMLDivElement;
const playersEl = document.getElementById("players") as HTMLDivElement;
const filePicker = document.getElementById("filePicker") as HTMLInputElement;
const fileInfo = document.getElementById("fileInfo") as HTMLSpanElement;
const loadStatus = document.getElementById("loadStatus") as HTMLSpanElement;
const stepBackBtn = document.getElementById("stepBack") as HTMLButtonElement;
const playPauseBtn = document.getElementById("playPause") as HTMLButtonElement;
const stepForwardBtn = document.getElementById(
  "stepForward",
) as HTMLButtonElement;
const scrubber = document.getElementById("scrubber") as HTMLInputElement;
const frameLabel = document.getElementById("frameLabel") as HTMLSpanElement;
const eventLogList = document.getElementById("eventLogList") as HTMLDivElement;
const eventLogEmpty = document.getElementById(
  "eventLogEmpty",
) as HTMLParagraphElement;
const perspectiveToggleEl = document.getElementById(
  "perspectiveToggle",
) as HTMLDivElement;
const statsCollapseBtn = document.getElementById(
  "statsCollapseBtn",
) as HTMLButtonElement;
const statsPanel = document.getElementById("statsPanel") as HTMLDivElement;
const statsEmpty = document.getElementById(
  "statsEmpty",
) as HTMLParagraphElement;

const stageRenderer = new StageRenderer(stageCanvas);

export type MatchEvent =
  EdgeGuardEvent | NeutralHitEvent | LedgeTrapEvent | AngelInvincibilityEvent;

interface PlayerPanel {
  port: PortIndex;
  pad: ControllerPad;
  damageEl: HTMLElement;
  stocksEl: HTMLElement;
  stateEl: HTMLElement;
  positionEl: HTMLElement;
  comboHitsEl: HTMLElement;
}

let camera: Camera;
let currentReplay: Replay | null = null;
let panels: PlayerPanel[] = [];
let playback: PlaybackController | null = null;
let lastFrame: Frame | undefined;
let hoverScreen: { x: number; y: number } | undefined;
let matchEvents: MatchEvent[] = [];
/** Events currently relevant/visible under perspectivePort. */
let currentLogEvents: MatchEvent[] = [];
/** Pre-built DOM elements for currentLogEvents, re-highlighted each frame. */
let currentLogEls: HTMLDivElement[] = [];
/** Which port's perspective the event log and stats are shown from. */
let perspectivePort: PortIndex | null = null;
let statsCollapsed = false;

function formatElapsed(frameIndex: number): string {
  const totalSeconds = frameIndex / 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

function buildPlayerPanels(replay: Replay): void {
  playersEl.innerHTML = "";
  panels = getSeatedPorts(replay).map((port) => {
    const settings = replay.gameStart.ports[port];
    const color = PORT_COLORS[port];

    const panel = document.createElement("div");
    panel.className = "player-panel";
    panel.style.setProperty("--player-color", color);

    const name = replay.gameStart.playerNames[port] || PORT_LABELS[port];
    panel.innerHTML = `
      <div class="player-name">${escapeHtml(name)} <span class="character">— ${escapeHtml(characterName(settings.characterId))} (${escapeHtml(PORT_LABELS[port])})</span></div>
      <div class="player-stats">
        <div>Damage: <strong class="stat-damage">—</strong></div>
        <div>Stocks: <strong class="stat-stocks">—</strong></div>
        <div class="full-row">State: <strong class="stat-state">—</strong></div>
        <div class="full-row">Position: <strong class="stat-position">—</strong></div>
        <div class="full-row">Combo hits: <strong class="stat-combo-hits">0</strong></div>
      </div>
      <canvas class="controller-pad" width="140" height="84"></canvas>
    `;
    playersEl.appendChild(panel);

    const padCanvas = panel.querySelector(
      "canvas.controller-pad",
    ) as HTMLCanvasElement;
    return {
      port,
      pad: new ControllerPad(padCanvas),
      damageEl: panel.querySelector(".stat-damage") as HTMLElement,
      stocksEl: panel.querySelector(".stat-stocks") as HTMLElement,
      stateEl: panel.querySelector(".stat-state") as HTMLElement,
      positionEl: panel.querySelector(".stat-position") as HTMLElement,
      comboHitsEl: panel.querySelector(".stat-combo-hits") as HTMLElement,
    };
  });
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function renderFrame(
  frame: Frame | undefined,
  frameIndex: number,
  snap: boolean,
): void {
  lastFrame = frame;
  const positions = panels
    .map((panel) => frame?.ports[panel.port]?.post)
    .filter((post): post is NonNullable<typeof post> => post !== undefined)
    .map((post) => ({ x: post.positionX, y: post.positionY }));
  camera.update(positions, snap);

  stageRenderer.render(
    camera,
    frame,
    currentReplay?.gameStart.stageId,
    hoverScreen,
  );

  for (const panel of panels) {
    const portData = frame?.ports[panel.port];
    if (!portData) {
      panel.damageEl.textContent = "—";
      panel.stocksEl.textContent = "—";
      panel.stateEl.textContent = "not on screen";
      panel.positionEl.textContent = "—";
      panel.comboHitsEl.textContent = "—";
      panel.comboHitsEl.className = "stat-combo-hits";
      panel.pad.render(undefined);
      continue;
    }
    const { post, pre } = portData;
    panel.damageEl.textContent = `${post.damagePercent}%`;
    panel.stocksEl.textContent = String(post.stocksRemaining + 1);
    panel.stateEl.textContent = actionStateName(post.actionStateId);
    panel.positionEl.textContent = `(${post.positionX.toFixed(1)}, ${post.positionY.toFixed(1)})`;

    const inHitstun = isHitstunState(post.actionStateId, post.hitstunCounter);
    const comboCount = post.comboHitCount;
    if (comboCount > 0) {
      const hitstunSuffix = inHitstun
        ? ` (${post.hitstunCounter}f hitstun)`
        : "";
      panel.comboHitsEl.textContent = `${comboCount} hit${comboCount !== 1 ? "s" : ""}${hitstunSuffix}`;
      panel.comboHitsEl.className = "stat-combo-hits in-combo";
    } else {
      panel.comboHitsEl.textContent = "0";
      panel.comboHitsEl.className = "stat-combo-hits";
    }

    panel.pad.render(pre);
  }
}

/**
 * Returns the text label and CSS kind class for an event, from the given
 * port's perspective. If perspective is null, falls back to the neutral
 * "Wario recovering / Player recovering" style used before perspective was
 * introduced.
 */
function eventLabel(
  ev: MatchEvent,
  replay: Replay,
  perspective: PortIndex | null,
): { text: string; kind: "neutral-hit" | "entered" | "success" | "failure" } {
  if (ev.kind === "neutral-hit") {
    return {
      text: `${ev.frame} — Neutral hit`,
      kind: "neutral-hit",
    };
  }

  const name = (port: PortIndex) =>
    replay.gameStart.playerNames[port] || PORT_LABELS[port];

  if (
    ev.kind === "ledge-getup-entered" ||
    ev.kind === "ledge-getup-success" ||
    ev.kind === "ledge-getup-failure"
  ) {
    if (perspective === null) {
      switch (ev.kind) {
        case "ledge-getup-entered":
          return {
            text: `${ev.frame} — ${name(ev.ledgePort)} on ledge`,
            kind: "entered",
          };
        case "ledge-getup-success":
          return {
            text: `${ev.frame} — ${name(ev.ledgePort)} getup: success`,
            kind: "success",
          };
        case "ledge-getup-failure":
          return {
            text: `${ev.frame} — ${name(ev.ledgePort)} getup: failure`,
            kind: "failure",
          };
      }
    }

    const isLedgePlayer = ev.ledgePort === perspective;
    switch (ev.kind) {
      case "ledge-getup-entered":
        return {
          text: `${ev.frame} — ${isLedgePlayer ? "Ledge getup" : "Ledge trap"}`,
          kind: "entered",
        };
      case "ledge-getup-success":
        return isLedgePlayer
          ? { text: `${ev.frame} — Ledge getup: success`, kind: "success" }
          : { text: `${ev.frame} — Ledge trap: failed`, kind: "failure" };
      case "ledge-getup-failure":
        return isLedgePlayer
          ? { text: `${ev.frame} — Ledge getup: failure`, kind: "failure" }
          : { text: `${ev.frame} — Ledge trap: success`, kind: "success" };
    }
  }

  if (
    ev.kind === "angel-entered" ||
    ev.kind === "angel-avoid-success" ||
    ev.kind === "angel-avoid-failure"
  ) {
    if (perspective === null) {
      switch (ev.kind) {
        case "angel-entered":
          return {
            text: `${ev.frame} — ${name(ev.respawnPort)} angel invincibility`,
            kind: "entered",
          };
        case "angel-avoid-success":
          return {
            text: `${ev.frame} — ${name(ev.oppPort)} avoided angel (0 dmg)`,
            kind: "success",
          };
        case "angel-avoid-failure":
          return {
            text: `${ev.frame} — ${name(ev.oppPort)} hit during angel (+${ev.damageTaken ?? 0}%)`,
            kind: "failure",
          };
      }
    }

    const isRespawner = ev.respawnPort === perspective;
    switch (ev.kind) {
      case "angel-entered":
        return {
          text: `${ev.frame} — ${isRespawner ? "Angel invincibility" : "Opponent angel"}`,
          kind: "entered",
        };
      case "angel-avoid-success":
        return isRespawner
          ? { text: `${ev.frame} — Angel: 0 hits landed`, kind: "failure" }
          : {
              text: `${ev.frame} — Angel avoid: success (0 dmg)`,
              kind: "success",
            };
      case "angel-avoid-failure":
        return isRespawner
          ? {
              text: `${ev.frame} — Angel: hit landed (+${ev.damageTaken ?? 0}%)`,
              kind: "success",
            }
          : {
              text: `${ev.frame} — Angel avoid: failed (+${ev.damageTaken ?? 0}%)`,
              kind: "failure",
            };
    }
  }

  const edgeEv = ev as EdgeGuardEvent;
  if (perspective === null) {
    // Neutral fallback — show both ports by name.
    switch (edgeEv.kind) {
      case "situation-entered":
        return {
          text: `${edgeEv.frame} — ${name(edgeEv.recoveringPort)} recovering`,
          kind: "entered",
        };
      case "recovery-success":
        return { text: `${edgeEv.frame} — Recovery: success`, kind: "success" };
      case "recovery-failure":
        return { text: `${edgeEv.frame} — Recovery: failure`, kind: "failure" };
    }
  }

  const isRecovering = edgeEv.recoveringPort === perspective;
  switch (edgeEv.kind) {
    case "situation-entered":
      return {
        text: `${edgeEv.frame} — ${isRecovering ? "Recovering" : "Edge guarding"}`,
        kind: "entered",
      };
    case "recovery-success":
      return isRecovering
        ? { text: `${edgeEv.frame} — Recovery: success`, kind: "success" }
        : { text: `${edgeEv.frame} — Edge guard: failed`, kind: "failure" };
    case "recovery-failure":
      return isRecovering
        ? { text: `${edgeEv.frame} — Recovery: failure`, kind: "failure" }
        : { text: `${edgeEv.frame} — Edge guard: success`, kind: "success" };
  }
}

/**
 * Builds the perspective toggle buttons in the event log header.
 * All stats and event log labels update whenever the perspective changes.
 * Called once per replay load.
 */
function buildPerspectiveToggle(replay: Replay): void {
  perspectiveToggleEl.innerHTML = "";
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return;

  for (const port of seated) {
    const btn = document.createElement("button");
    btn.className = "perspective-btn";
    btn.textContent = replay.gameStart.playerNames[port] || PORT_LABELS[port];
    btn.style.color = PORT_COLORS[port];
    btn.addEventListener("click", () => {
      perspectivePort = port;
      renderStatsPanel(replay);
      buildEventLog(replay);
      updateEventLogHighlight(playback?.currentIndex ?? 0);
      for (const b of perspectiveToggleEl.querySelectorAll(
        ".perspective-btn",
      )) {
        b.classList.toggle("active", b === btn);
      }
    });
    if (perspectivePort === port) btn.classList.add("active");
    perspectiveToggleEl.appendChild(btn);
  }
}

/**
 * Rebuilds the event log DOM from the pre-computed `matchEvents` array.
 * Neutral hits are filtered to only show for the player who landed them.
 * Situation labels are rendered from `perspectivePort`'s point of view.
 */
function buildEventLog(replay: Replay): void {
  currentLogEls = [];
  for (const el of eventLogList.querySelectorAll(".event-log-entry")) {
    el.remove();
  }

  // Filter events: neutral hits only appear from the attacker's perspective
  currentLogEvents = matchEvents.filter((ev) => {
    if (ev.kind === "neutral-hit") {
      return perspectivePort === null || ev.attackerPort === perspectivePort;
    }
    return true;
  });

  if (currentLogEvents.length === 0) {
    eventLogEmpty.textContent =
      "No events — load a Dream Land 2-player replay.";
    eventLogEmpty.hidden = false;
    return;
  }

  eventLogEmpty.textContent = "No events yet.";
  eventLogEmpty.hidden = false;
  eventLogList.scrollTop = 0;

  for (const ev of currentLogEvents) {
    const { text, kind } = eventLabel(ev, replay, perspectivePort);
    const div = document.createElement("div");
    div.className = `event-log-entry kind-${kind}`;
    div.textContent = text;
    div.hidden = true;
    eventLogList.appendChild(div);
    currentLogEls.push(div);
  }
}

/**
 * Renders per-perspective aggregate statistics into the stats panel.
 * Reads from the pre-computed `edgeGuardEvents` array — O(n) scan,
 * called on replay load and whenever the perspective changes.
 */
function renderStatsPanel(replay: Replay): void {
  statsPanel.innerHTML = "";
  const edgeEvents = matchEvents.filter(
    (ev): ev is EdgeGuardEvent =>
      ev.kind === "situation-entered" ||
      ev.kind === "recovery-success" ||
      ev.kind === "recovery-failure",
  );
  const ledgeEvents = matchEvents.filter(
    (ev): ev is LedgeTrapEvent =>
      ev.kind === "ledge-getup-entered" ||
      ev.kind === "ledge-getup-success" ||
      ev.kind === "ledge-getup-failure",
  );
  const angelEvents = matchEvents.filter(
    (ev): ev is AngelInvincibilityEvent =>
      ev.kind === "angel-entered" ||
      ev.kind === "angel-avoid-success" ||
      ev.kind === "angel-avoid-failure",
  );
  if (perspectivePort === null || matchEvents.length === 0) {
    statsPanel.appendChild(statsEmpty);
    statsEmpty.hidden = false;
    return;
  }

  const stats = computeEdgeGuardStats(edgeEvents, perspectivePort);
  const ledgeStats = computeLedgeTrapStats(ledgeEvents, perspectivePort);
  const angelStats = computeAngelInvincibilityStats(
    angelEvents,
    perspectivePort,
  );
  const neutralStats = computeNeutralHitsStats(replay, perspectivePort);
  const name =
    replay.gameStart.playerNames[perspectivePort] ||
    PORT_LABELS[perspectivePort];

  const pct = (n: number, d: number): string =>
    d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;

  const addRow = (
    label: string,
    successes: number,
    total: number,
    successClass: "pct-success" | "pct-failure",
  ): void => {
    const row = document.createElement("div");
    row.className = "stat-row";

    const lbl = document.createElement("div");
    lbl.className = "stat-row-label";
    lbl.textContent = label;

    const val = document.createElement("div");
    val.className = "stat-row-value";

    const pctSpan = document.createElement("span");
    pctSpan.className = `stat-pct ${total > 0 ? successClass : ""}`;
    pctSpan.textContent = pct(successes, total);

    val.appendChild(pctSpan);
    val.append(`  ${successes} / ${total} situation${total !== 1 ? "s" : ""}`);

    row.appendChild(lbl);
    row.appendChild(val);
    statsPanel.appendChild(row);
  };

  const addValueRow = (
    label: string,
    valueStr: string,
    subtext?: string,
  ): void => {
    const row = document.createElement("div");
    row.className = "stat-row";

    const lbl = document.createElement("div");
    lbl.className = "stat-row-label";
    lbl.textContent = label;

    const val = document.createElement("div");
    val.className = "stat-row-value";

    const valSpan = document.createElement("span");
    valSpan.className = "stat-pct";
    valSpan.textContent = valueStr;

    val.appendChild(valSpan);
    if (subtext) {
      val.append(`  ${subtext}`);
    }

    row.appendChild(lbl);
    row.appendChild(val);
    statsPanel.appendChild(row);
  };

  const header = document.createElement("div");
  header.className = "stat-row-label";
  header.style.color = PORT_COLORS[perspectivePort];
  header.style.marginBottom = "2px";
  header.textContent = name;
  statsPanel.appendChild(header);

  addRow(
    "Recovery",
    stats.recoverySuccesses,
    stats.recoverySituations,
    "pct-success",
  );
  addRow(
    "Edge guard",
    stats.edgeGuardSuccesses,
    stats.edgeGuardSituations,
    "pct-success",
  );
  addRow(
    "Ledge getup",
    ledgeStats.ledgeGetupSuccesses,
    ledgeStats.ledgeGetupSituations,
    "pct-success",
  );
  addRow(
    "Ledge trap",
    ledgeStats.ledgeTrapSuccesses,
    ledgeStats.ledgeTrapSituations,
    "pct-success",
  );
  addRow(
    "Angel avoid",
    angelStats.avoidSuccesses,
    angelStats.avoidSituations,
    "pct-success",
  );
  addValueRow(
    "Neutral hits / stock taken",
    neutralStats.averageHitsPerStock !== null
      ? neutralStats.averageHitsPerStock.toFixed(1)
      : "—",
    neutralStats.stocksTaken > 0
      ? `${neutralStats.totalHitsLanded} hits across ${neutralStats.stocksTaken} stock${neutralStats.stocksTaken !== 1 ? "s" : ""} taken`
      : "no stocks taken",
  );
}

/**
 * Updates the visibility and `is-current` highlight of event log entries.
 * Only entries up to `frameIndex` are revealed, so the log starts clear
 * on page load / frame 0 and populates as playback progresses.
 */
function updateEventLogHighlight(frameIndex: number): void {
  if (currentLogEvents.length === 0) {
    eventLogEmpty.textContent =
      "No events — load a Dream Land 2-player replay.";
    eventLogEmpty.hidden = false;
    return;
  }

  let found = -1;
  for (let i = 0; i < currentLogEvents.length; i++) {
    const ev = currentLogEvents[i];
    const el = currentLogEls[i];
    if (!ev || !el) continue;

    const hasOccurred = ev.frameIndex <= frameIndex;
    el.hidden = !hasOccurred;
    if (hasOccurred) {
      found = i;
    }
  }

  if (found === -1) {
    eventLogEmpty.textContent = "No events yet.";
    eventLogEmpty.hidden = false;
  } else {
    eventLogEmpty.hidden = true;
  }

  for (let i = 0; i < currentLogEls.length; i++) {
    const el = currentLogEls[i];
    if (!el) continue;
    const isCurrent = i === found;
    el.classList.toggle("is-current", isCurrent);
    if (isCurrent) {
      el.scrollIntoView({ block: "nearest" });
    }
  }
}

function onFrameChange(
  index: number,
  playing: boolean,
  reason: FrameChangeReason,
): void {
  if (!currentReplay) return;
  scrubber.value = String(index);
  const frame = currentReplay.frames[index];
  const frameNumber = frame?.frame ?? index;
  frameLabel.textContent = `Frame ${frameNumber} / ${currentReplay.frames.length - 1}  ·  ${formatElapsed(index)}`;
  playPauseBtn.textContent = playing ? "⏸" : "▶";
  renderFrame(frame, index, reason === "jump");
  updateEventLogHighlight(index);
}

function resizeStageCanvas(): void {
  const rect = stageWrap.getBoundingClientRect();
  const width = Math.max(200, Math.floor(rect.width));
  const height = Math.max(150, Math.floor(rect.height));
  stageRenderer.resize(width, height);
  if (currentReplay) {
    camera.resize(width, height);
    onFrameChange(
      playback?.currentIndex ?? 0,
      playback?.isPlaying ?? false,
      "jump",
    );
  }
}

function loadReplay(loaded: LoadedReplay): void {
  playback?.pause();
  const { replay, sourceName, recordedAt } = loaded;
  currentReplay = replay;
  const edgeEvents = computeEdgeGuardEvents(replay);
  const ledgeEvents = computeLedgeTrapEvents(replay);
  const angelEvents = computeAngelInvincibilityEvents(replay);
  const neutralEvents = computeNeutralHitEvents(replay);
  matchEvents = [
    ...edgeEvents,
    ...ledgeEvents,
    ...angelEvents,
    ...neutralEvents,
  ].sort((a, b) =>
    a.frameIndex === b.frameIndex
      ? a.kind === "neutral-hit"
        ? -1
        : 1
      : a.frameIndex - b.frameIndex,
  );

  const seated = getSeatedPorts(replay);
  if (perspectivePort === null || !seated.includes(perspectivePort)) {
    perspectivePort = seated[0] ?? null;
  }

  const rect = stageWrap.getBoundingClientRect();
  const width = Math.max(200, Math.floor(rect.width));
  const height = Math.max(150, Math.floor(rect.height));
  stageRenderer.resize(width, height);
  camera = new Camera(width, height);

  buildPlayerPanels(replay);
  buildPerspectiveToggle(replay);
  renderStatsPanel(replay);
  buildEventLog(replay);

  const recordedLabel = `Recorded ${recordedAt.toLocaleString()}`;
  fileInfo.textContent =
    `${sourceName} — ${stageName(replay.gameStart.stageId)}, ${recordedLabel}, ` +
    `${replay.frames.length} frames, ${replay.isComplete ? "complete" : "incomplete recording"}`;
  loadStatus.textContent = "";

  scrubber.max = String(Math.max(0, replay.frames.length - 1));
  scrubber.value = "0";

  playback = new PlaybackController(replay.frames.length, onFrameChange);
  onFrameChange(0, false, "jump");
}

async function loadDefault(): Promise<void> {
  try {
    // import.meta.env.BASE_URL (not a hardcoded absolute path) so this
    // still resolves under GitHub Pages' "/rmgr-viewer/" base - see
    // vite.config.ts.
    const url = `${import.meta.env.BASE_URL}replays/20260825-105731-Marcela-Penelope.rmgr`;
    loadReplay(await loadReplayFromUrl(url));
  } catch (err) {
    loadStatus.textContent = `Failed to load sample replay: ${(err as Error).message}`;
  }
}

filePicker.addEventListener("change", () => {
  const file = filePicker.files?.[0];
  if (!file) return;
  loadReplayFromFile(file)
    .then(loadReplay)
    .catch((err: unknown) => {
      loadStatus.textContent = `Failed to load ${file.name}: ${(err as Error).message}`;
    });
});

statsCollapseBtn.addEventListener("click", () => {
  statsCollapsed = !statsCollapsed;
  statsPanel.hidden = statsCollapsed;
  statsCollapseBtn.classList.toggle("collapsed", statsCollapsed);
});

playPauseBtn.addEventListener("click", () => playback?.toggle());
stepBackBtn.addEventListener("click", () => playback?.stepBackward());
stepForwardBtn.addEventListener("click", () => playback?.stepForward());
scrubber.addEventListener("input", () => {
  playback?.pause();
  playback?.seek(Number(scrubber.value));
});
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === "Space") {
    e.preventDefault();
    playback?.toggle();
  } else if (e.code === "ArrowLeft") {
    playback?.stepBackward();
  } else if (e.code === "ArrowRight") {
    playback?.stepForward();
  }
});
window.addEventListener("resize", resizeStageCanvas);

// Re-render (without reframing the camera) so the hover coordinate label
// tracks the cursor even while playback is paused and nothing else would
// otherwise trigger a redraw.
stageCanvas.addEventListener("mousemove", (e) => {
  if (!currentReplay) return;
  hoverScreen = { x: e.offsetX, y: e.offsetY };
  stageRenderer.render(
    camera,
    lastFrame,
    currentReplay.gameStart.stageId,
    hoverScreen,
  );
});
stageCanvas.addEventListener("mouseleave", () => {
  if (!currentReplay) return;
  hoverScreen = undefined;
  stageRenderer.render(
    camera,
    lastFrame,
    currentReplay.gameStart.stageId,
    hoverScreen,
  );
});

void loadDefault();
