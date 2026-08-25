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
import { initLanguage, setLanguage, t, type Language } from "./i18n.js";
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
const eventLogHeaderTitle = document.querySelector(
  "#eventLogHeader h2",
) as HTMLHeadingElement;
const matchStatsHeaderTitle = document.querySelector(
  "#matchStatsHeader h2",
) as HTMLHeadingElement;
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
const langToggleEl = document.getElementById("langToggle") as HTMLDivElement;
const stageOverlay = document.getElementById("stageOverlay") as HTMLDivElement;
const stageOverlayList = document.getElementById(
  "stageOverlayList",
) as HTMLDivElement;
const hudToggleBtn = document.getElementById(
  "hudToggleBtn",
) as HTMLButtonElement;

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
let currentLoaded: LoadedReplay | null = null;
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
let hudOverlayEnabled = true;
try {
  hudOverlayEnabled = localStorage.getItem("rmgr-viewer-hud") !== "false";
} catch {
  // Ignore localStorage read error
}

function formatElapsed(frameIndex: number): string {
  const totalSeconds = frameIndex / 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

function updateStaticTranslations(): void {
  const tr = t();
  if (matchStatsHeaderTitle) matchStatsHeaderTitle.textContent = tr.matchStats;
  if (eventLogHeaderTitle) eventLogHeaderTitle.textContent = tr.eventLog;
  if (statsEmpty) statsEmpty.textContent = tr.statsEmpty;
  if (eventLogEmpty) eventLogEmpty.textContent = tr.eventLogEmpty;
  if (statsCollapseBtn) statsCollapseBtn.title = tr.statsCollapseTitle;
  if (hudToggleBtn) {
    hudToggleBtn.textContent = tr.hudOverlay;
    hudToggleBtn.title = tr.hudOverlayTitle;
  }
  if (stepBackBtn) stepBackBtn.title = tr.prevFrameTooltip;
  if (playPauseBtn) playPauseBtn.title = tr.playPauseTooltip;
  if (stepForwardBtn) stepForwardBtn.title = tr.nextFrameTooltip;
}

function updateFileInfo(loaded: LoadedReplay): void {
  const { replay, sourceName, recordedAt } = loaded;
  const tr = t();
  const recordedLabel = tr.recordedLabel(recordedAt.toLocaleString());
  const framesCount = tr.framesLabel(replay.frames.length);
  const statusStr = replay.isComplete ? tr.complete : tr.incomplete;
  fileInfo.textContent = `${sourceName} — ${stageName(replay.gameStart.stageId)}, ${recordedLabel}, ${framesCount}, ${statusStr}`;
}

function buildPlayerPanels(replay: Replay): void {
  playersEl.innerHTML = "";
  const tr = t();

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
        <div>${escapeHtml(tr.damage)} <strong class="stat-damage">—</strong></div>
        <div>${escapeHtml(tr.stocks)} <strong class="stat-stocks">—</strong></div>
        <div class="full-row">${escapeHtml(tr.state)} <strong class="stat-state">—</strong></div>
        <div class="full-row">${escapeHtml(tr.position)} <strong class="stat-position">—</strong></div>
        <div class="full-row">${escapeHtml(tr.comboHits)} <strong class="stat-combo-hits">0</strong></div>
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

  const tr = t();
  for (const panel of panels) {
    const portData = frame?.ports[panel.port];
    if (!portData) {
      panel.damageEl.textContent = "—";
      panel.stocksEl.textContent = "—";
      panel.stateEl.textContent = tr.notOnScreen;
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
        ? tr.hitstunUnit(post.hitstunCounter)
        : "";
      panel.comboHitsEl.textContent = `${tr.hitUnit(comboCount)}${hitstunSuffix}`;
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
 * port's perspective. If perspective is null, falls back to neutral style.
 */
function eventLabel(
  ev: MatchEvent,
  replay: Replay,
  perspective: PortIndex | null,
): { text: string; kind: "neutral-hit" | "entered" | "success" | "failure" } {
  const tr = t();
  if (ev.kind === "neutral-hit") {
    return {
      text: `${ev.frame} — ${ev.hitType === "grab" ? tr.neutralHitGrab : tr.neutralHitAttack}`,
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
            text: `${ev.frame} — ${name(ev.ledgePort)} ${tr.ledgeGetupEntered}`,
            kind: "entered",
          };
        case "ledge-getup-success":
          return {
            text: `${ev.frame} — ${tr.playerLedgeGetupSuccess(name(ev.ledgePort))}`,
            kind: "success",
          };
        case "ledge-getup-failure":
          return {
            text: `${ev.frame} — ${tr.playerLedgeGetupFailure(name(ev.ledgePort))}`,
            kind: "failure",
          };
      }
    }

    const isLedgePlayer = ev.ledgePort === perspective;
    switch (ev.kind) {
      case "ledge-getup-entered":
        return {
          text: `${ev.frame} — ${isLedgePlayer ? tr.ledgeGetupEntered : tr.ledgeTrapEntered}`,
          kind: "entered",
        };
      case "ledge-getup-success":
        return isLedgePlayer
          ? { text: `${ev.frame} — ${tr.ledgeGetupSuccess}`, kind: "success" }
          : { text: `${ev.frame} — ${tr.ledgeTrapFailed}`, kind: "failure" };
      case "ledge-getup-failure":
        return isLedgePlayer
          ? { text: `${ev.frame} — ${tr.ledgeGetupFailure}`, kind: "failure" }
          : { text: `${ev.frame} — ${tr.ledgeTrapSuccess}`, kind: "success" };
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
            text: `${ev.frame} — ${tr.playerAngelEntered(name(ev.respawnPort))}`,
            kind: "entered",
          };
        case "angel-avoid-success":
          return {
            text: `${ev.frame} — ${tr.playerAngelAvoidSuccess(name(ev.oppPort))}`,
            kind: "success",
          };
        case "angel-avoid-failure":
          return {
            text: `${ev.frame} — ${tr.playerAngelAvoidFailure(name(ev.oppPort), ev.damageTaken ?? 0)}`,
            kind: "failure",
          };
      }
    }

    const isRespawner = ev.respawnPort === perspective;
    switch (ev.kind) {
      case "angel-entered":
        return {
          text: `${ev.frame} — ${isRespawner ? tr.angelEntered : tr.opponentAngelEntered}`,
          kind: "entered",
        };
      case "angel-avoid-success":
        return isRespawner
          ? { text: `${ev.frame} — ${tr.angelNoHits}`, kind: "failure" }
          : {
              text: `${ev.frame} — ${tr.angelAvoidSuccess}`,
              kind: "success",
            };
      case "angel-avoid-failure":
        return isRespawner
          ? {
              text: `${ev.frame} — ${tr.angelHitLanded(ev.damageTaken ?? 0)}`,
              kind: "success",
            }
          : {
              text: `${ev.frame} — ${tr.angelAvoidFailed(ev.damageTaken ?? 0)}`,
              kind: "failure",
            };
    }
  }

  const edgeEv = ev as EdgeGuardEvent;
  if (perspective === null) {
    switch (edgeEv.kind) {
      case "situation-entered":
        return {
          text: `${edgeEv.frame} — ${tr.playerRecovering(name(edgeEv.recoveringPort))}`,
          kind: "entered",
        };
      case "recovery-success":
        return {
          text: `${edgeEv.frame} — ${tr.recoverySuccess}`,
          kind: "success",
        };
      case "recovery-failure":
        return {
          text: `${edgeEv.frame} — ${tr.recoveryFailure}`,
          kind: "failure",
        };
    }
  }

  const isRecovering = edgeEv.recoveringPort === perspective;
  switch (edgeEv.kind) {
    case "situation-entered":
      return {
        text: `${edgeEv.frame} — ${isRecovering ? tr.recovering : tr.edgeGuarding}`,
        kind: "entered",
      };
    case "recovery-success":
      return isRecovering
        ? { text: `${edgeEv.frame} — ${tr.recoverySuccess}`, kind: "success" }
        : { text: `${edgeEv.frame} — ${tr.edgeGuardFailed}`, kind: "failure" };
    case "recovery-failure":
      return isRecovering
        ? { text: `${edgeEv.frame} — ${tr.recoveryFailure}`, kind: "failure" }
        : { text: `${edgeEv.frame} — ${tr.edgeGuardSuccess}`, kind: "success" };
  }
}

/**
 * Builds the perspective toggle buttons in the event log header.
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
    perspectiveToggleEl.appendChild(btn);
  }

  // Set active class on initial load.
  const buttons =
    perspectiveToggleEl.querySelectorAll<HTMLButtonElement>(".perspective-btn");
  seated.forEach((port, idx) => {
    buttons[idx]?.classList.toggle("active", port === perspectivePort);
  });
}

/**
 * Builds the scrollable event log list.
 */
function buildEventLog(replay: Replay): void {
  eventLogList.innerHTML = "";

  if (perspectivePort === null) {
    currentLogEvents = [];
    currentLogEls = [];
    eventLogList.appendChild(eventLogEmpty);
    eventLogEmpty.hidden = false;
    return;
  }

  currentLogEvents = matchEvents.filter((ev) => {
    if (ev.kind === "neutral-hit") {
      return ev.attackerPort === perspectivePort;
    }
    return true;
  });

  if (currentLogEvents.length === 0) {
    currentLogEls = [];
    eventLogList.appendChild(eventLogEmpty);
    eventLogEmpty.hidden = false;
    return;
  }

  eventLogEmpty.hidden = true;
  currentLogEls = currentLogEvents.map((ev) => {
    const entry = document.createElement("div");
    const { text, kind } = eventLabel(ev, replay, perspectivePort);
    entry.className = `event-log-entry kind-${kind}`;
    entry.textContent = text;
    entry.title = `Jump to frame ${ev.frame}`;
    entry.style.cursor = "pointer";
    entry.addEventListener("click", () => {
      playback?.pause();
      playback?.seek(ev.frameIndex);
    });
    eventLogList.appendChild(entry);
    return entry;
  });
}

/**
 * Highlights the most recent event at or before currentFrameIndex,
 * and updates the on-screen stage HUD overlay.
 */
function updateEventLogHighlight(currentFrameIndex: number): void {
  let activeIdx = -1;
  for (let i = 0; i < currentLogEvents.length; i++) {
    const ev = currentLogEvents[i];
    if (ev && ev.frameIndex <= currentFrameIndex) {
      activeIdx = i;
    } else {
      break;
    }
  }

  // Highlight elements in the sidebar event log list
  for (let i = 0; i < currentLogEls.length; i++) {
    const el = currentLogEls[i];
    if (!el) continue;
    const isCurrent = i === activeIdx;
    el.classList.toggle("is-current", isCurrent);
  }

  // Only scroll within #eventLogList without scrolling the outer #sidebar container!
  if (activeIdx >= 0) {
    const activeEl = currentLogEls[activeIdx];
    if (activeEl) {
      const list = eventLogList;
      const itemTop = activeEl.offsetTop - list.offsetTop;
      const itemBottom = itemTop + activeEl.offsetHeight;
      const viewTop = list.scrollTop;
      const viewBottom = viewTop + list.clientHeight;

      if (itemTop < viewTop) {
        list.scrollTop = itemTop;
      } else if (itemBottom > viewBottom) {
        list.scrollTop = itemBottom - list.clientHeight;
      }
    }
  }

  // Update on-screen stage HUD overlay (last up to 3 recent events)
  if (
    !hudOverlayEnabled ||
    activeIdx === -1 ||
    currentLogEvents.length === 0 ||
    !currentReplay
  ) {
    stageOverlay.hidden = true;
  } else {
    stageOverlay.hidden = false;
    stageOverlayList.innerHTML = "";
    const startIdx = Math.max(0, activeIdx - 2);
    for (let i = startIdx; i <= activeIdx; i++) {
      const ev = currentLogEvents[i];
      if (!ev) continue;
      const { text, kind } = eventLabel(ev, currentReplay, perspectivePort);
      const isLatest = i === activeIdx;
      const entry = document.createElement("div");
      entry.className = `overlay-entry kind-${kind}${isLatest ? " is-current" : ""}`;
      entry.textContent = text;
      stageOverlayList.appendChild(entry);
    }
  }
}

/**
 * Renders per-perspective aggregate statistics into the stats panel.
 */
function renderStatsPanel(replay: Replay): void {
  statsPanel.innerHTML = "";
  const tr = t();

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
    val.append(`  ${tr.situations(successes, total)}`);

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
    tr.recovery,
    stats.recoverySuccesses,
    stats.recoverySituations,
    "pct-success",
  );
  addRow(
    tr.edgeGuard,
    stats.edgeGuardSuccesses,
    stats.edgeGuardSituations,
    "pct-success",
  );
  addRow(
    tr.ledgeGetup,
    ledgeStats.ledgeGetupSuccesses,
    ledgeStats.ledgeGetupSituations,
    "pct-success",
  );
  addRow(
    tr.ledgeTrap,
    ledgeStats.ledgeTrapSuccesses,
    ledgeStats.ledgeTrapSituations,
    "pct-success",
  );
  addRow(
    tr.angelAvoid,
    angelStats.avoidSuccesses,
    angelStats.avoidSituations,
    "pct-success",
  );
  addValueRow(
    tr.neutralHitsPerStock,
    neutralStats.averageHitsPerStock !== null
      ? neutralStats.averageHitsPerStock.toFixed(1)
      : "—",
    neutralStats.stocksTaken > 0
      ? tr.neutralHitsTakenSummary(
          neutralStats.totalHitsLanded,
          neutralStats.stocksTaken,
        )
      : tr.noStocksTaken,
  );
}

function onFrameChange(
  index: number,
  isPlaying: boolean,
  reason: FrameChangeReason,
): void {
  const frame = currentReplay?.frames[index];
  renderFrame(frame, index, reason === "jump");
  scrubber.value = String(index);
  playPauseBtn.textContent = isPlaying ? "⏸" : "▶";

  const totalFrames = currentReplay?.frames.length ?? 0;
  const elapsed = formatElapsed(index);
  frameLabel.textContent = `Frame ${index} / ${Math.max(0, totalFrames - 1)} (${elapsed})`;
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
  currentLoaded = loaded;
  const { replay } = loaded;
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
  updateFileInfo(loaded);
  loadStatus.textContent = "";

  scrubber.max = String(Math.max(0, replay.frames.length - 1));
  scrubber.value = "0";

  playback = new PlaybackController(replay.frames.length, onFrameChange);
  onFrameChange(0, false, "jump");
}

function applyLanguage(lang: Language): void {
  setLanguage(lang);
  updateStaticTranslations();
  for (const btn of langToggleEl.querySelectorAll<HTMLButtonElement>(
    ".lang-btn",
  )) {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  }
  if (currentReplay && currentLoaded) {
    buildPlayerPanels(currentReplay);
    buildPerspectiveToggle(currentReplay);
    renderStatsPanel(currentReplay);
    buildEventLog(currentReplay);
    updateFileInfo(currentLoaded);
    onFrameChange(
      playback?.currentIndex ?? 0,
      playback?.isPlaying ?? false,
      "jump",
    );
  }
}

async function loadDefault(): Promise<void> {
  try {
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

hudToggleBtn.addEventListener("click", () => {
  hudOverlayEnabled = !hudOverlayEnabled;
  hudToggleBtn.classList.toggle("active", hudOverlayEnabled);
  try {
    localStorage.setItem("rmgr-viewer-hud", String(hudOverlayEnabled));
  } catch {
    // Ignore localStorage write error
  }
  updateEventLogHighlight(playback?.currentIndex ?? 0);
});

hudToggleBtn.classList.toggle("active", hudOverlayEnabled);

langToggleEl.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
    ".lang-btn",
  );
  if (!target) return;
  const lang = target.dataset.lang as Language | undefined;
  if (lang === "en" || lang === "ja") {
    applyLanguage(lang);
  }
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

// Initialize active language
const initialLang = initLanguage();
applyLanguage(initialLang);

void loadDefault();
