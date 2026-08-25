import {
  getSeatedPorts,
  type Frame,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import { Camera } from "../camera.js";
import { ControllerPad } from "../controllerPad.js";
import { PlaybackController, type FrameChangeReason } from "../playback.js";
import { PORT_COLORS, PORT_LABELS } from "../players.js";
import { StageRenderer, isDeadState } from "../renderer.js";
import { actionStateName, characterName } from "../lookups.js";
import { t } from "../i18n.js";
import {
  computeNeutralHitEvents,
  computeNeutralHitsStats,
  type NeutralHitEvent,
} from "../neutralHits.js";
import {
  computeEdgeGuardEvents,
  computeEdgeGuardStats,
  isHitstunState,
  type EdgeGuardEvent,
} from "../edgeGuard.js";
import {
  computeLedgeTrapEvents,
  computeLedgeTrapStats,
  type LedgeTrapEvent,
} from "../ledgeTrap.js";
import {
  computeAngelInvincibilityEvents,
  computeAngelInvincibilityStats,
  type AngelInvincibilityEvent,
} from "../angelInvincibility.js";
import type { LoadedReplay } from "../replaySource.js";
import type { DerivedRates } from "../data/aggregate.js";

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

function formatElapsed(frameIndex: number): string {
  const totalSeconds = frameIndex / 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

export class MatchViewController {
  private stageCanvas: HTMLCanvasElement;
  private stageWrap: HTMLDivElement;
  private playersEl: HTMLDivElement;
  private loadStatus: HTMLSpanElement;
  private stepBackBtn: HTMLButtonElement;
  private playPauseBtn: HTMLButtonElement;
  private stepForwardBtn: HTMLButtonElement;
  private scrubber: HTMLInputElement;
  private frameLabel: HTMLSpanElement;
  private matchStatsHeaderTitle: HTMLHeadingElement;
  private perspectiveToggleEl: HTMLDivElement;
  private statsCollapseBtn: HTMLButtonElement;
  private statsPanel: HTMLDivElement;
  private statsEmpty: HTMLParagraphElement;
  private stageOverlay: HTMLDivElement;
  private stageOverlayList: HTMLDivElement;
  private hudToggleBtn: HTMLButtonElement;

  private stageRenderer: StageRenderer;
  private camera!: Camera;
  private currentReplay: Replay | null = null;
  private currentLoaded: LoadedReplay | null = null;
  private panels: PlayerPanel[] = [];
  private playback: PlaybackController | null = null;
  private lastFrame: Frame | undefined;
  private hoverScreen: { x: number; y: number } | undefined;
  private matchEvents: MatchEvent[] = [];
  private currentLogEvents: MatchEvent[] = [];
  private perspectivePort: PortIndex | null = null;
  private statsCollapsed = false;
  private hudOverlayEnabled = true;
  private matchupBaseline: DerivedRates | null = null;
  private onPerspectiveChangedCb?: (port: PortIndex) => void;

  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnResize: () => void;

  constructor() {
    this.stageCanvas = document.getElementById("stage") as HTMLCanvasElement;
    this.stageWrap = document.getElementById("stageWrap") as HTMLDivElement;
    this.playersEl = document.getElementById("players") as HTMLDivElement;
    this.loadStatus = document.getElementById("loadStatus") as HTMLSpanElement;
    this.stepBackBtn = document.getElementById("stepBack") as HTMLButtonElement;
    this.playPauseBtn = document.getElementById(
      "playPause",
    ) as HTMLButtonElement;
    this.stepForwardBtn = document.getElementById(
      "stepForward",
    ) as HTMLButtonElement;
    this.scrubber = document.getElementById("scrubber") as HTMLInputElement;
    this.frameLabel = document.getElementById("frameLabel") as HTMLSpanElement;
    this.matchStatsHeaderTitle = document.querySelector(
      "#matchStatsHeader h2",
    ) as HTMLHeadingElement;
    this.perspectiveToggleEl = document.getElementById(
      "perspectiveToggle",
    ) as HTMLDivElement;
    this.statsCollapseBtn = document.getElementById(
      "statsCollapseBtn",
    ) as HTMLButtonElement;
    this.statsPanel = document.getElementById("statsPanel") as HTMLDivElement;
    this.statsEmpty = document.getElementById(
      "statsEmpty",
    ) as HTMLParagraphElement;
    this.stageOverlay = document.getElementById(
      "stageOverlay",
    ) as HTMLDivElement;
    this.stageOverlayList = document.getElementById(
      "stageOverlayList",
    ) as HTMLDivElement;
    this.hudToggleBtn = document.getElementById(
      "hudToggleBtn",
    ) as HTMLButtonElement;

    this.stageRenderer = new StageRenderer(this.stageCanvas);

    try {
      this.hudOverlayEnabled =
        localStorage.getItem("rmgr-viewer-hud") !== "false";
    } catch {
      // Ignore localStorage read error
    }

    this.boundOnKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.boundOnResize = () => this.resizeStageCanvas();

    this.initEventListeners();
  }

  private initEventListeners(): void {
    this.statsCollapseBtn.addEventListener("click", () => {
      this.statsCollapsed = !this.statsCollapsed;
      this.statsPanel.hidden = this.statsCollapsed;
      this.statsCollapseBtn.classList.toggle("collapsed", this.statsCollapsed);
    });

    this.hudToggleBtn.addEventListener("click", () => {
      this.hudOverlayEnabled = !this.hudOverlayEnabled;
      this.hudToggleBtn.classList.toggle("active", this.hudOverlayEnabled);
      try {
        localStorage.setItem("rmgr-viewer-hud", String(this.hudOverlayEnabled));
      } catch {
        // Ignore localStorage write error
      }
      this.updateEventLogHighlight(this.playback?.currentIndex ?? 0);
    });

    this.hudToggleBtn.classList.toggle("active", this.hudOverlayEnabled);

    this.playPauseBtn.addEventListener("click", () => this.playback?.toggle());
    this.stepBackBtn.addEventListener("click", () =>
      this.playback?.stepBackward(),
    );
    this.stepForwardBtn.addEventListener("click", () =>
      this.playback?.stepForward(),
    );
    this.scrubber.addEventListener("input", () => {
      this.playback?.pause();
      this.playback?.seek(Number(this.scrubber.value));
    });

    this.stageCanvas.addEventListener("mousemove", (e) => {
      if (!this.currentReplay) return;
      this.hoverScreen = { x: e.offsetX, y: e.offsetY };
      this.stageRenderer.render(
        this.camera,
        this.lastFrame,
        this.currentReplay.gameStart.stageId,
        this.hoverScreen,
        this.currentReplay,
        this.playback?.currentIndex ?? 0,
      );
    });

    this.stageCanvas.addEventListener("mouseleave", () => {
      if (!this.currentReplay) return;
      this.hoverScreen = undefined;
      this.stageRenderer.render(
        this.camera,
        this.lastFrame,
        this.currentReplay.gameStart.stageId,
        this.hoverScreen,
        this.currentReplay,
        this.playback?.currentIndex ?? 0,
      );
    });
  }

  public activate(): void {
    window.addEventListener("keydown", this.boundOnKeyDown);
    window.addEventListener("resize", this.boundOnResize);
    this.resizeStageCanvas();
  }

  public deactivate(): void {
    this.playback?.pause();
    window.removeEventListener("keydown", this.boundOnKeyDown);
    window.removeEventListener("resize", this.boundOnResize);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLInputElement && e.target.type !== "range")
    ) {
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      this.playback?.toggle();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      this.playback?.stepBackward();
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      this.playback?.stepForward();
    }
  }

  public updateStaticTranslations(): void {
    const tr = t();
    if (this.matchStatsHeaderTitle)
      this.matchStatsHeaderTitle.textContent = tr.matchStats;
    if (this.statsEmpty) this.statsEmpty.textContent = tr.statsEmpty;
    if (this.statsCollapseBtn)
      this.statsCollapseBtn.title = tr.statsCollapseTitle;
    if (this.hudToggleBtn) {
      this.hudToggleBtn.textContent = tr.hudOverlay;
      this.hudToggleBtn.title = tr.hudOverlayTitle;
    }
    if (this.stepBackBtn) this.stepBackBtn.title = tr.prevFrameTooltip;
    if (this.playPauseBtn) this.playPauseBtn.title = tr.playPauseTooltip;
    if (this.stepForwardBtn) this.stepForwardBtn.title = tr.nextFrameTooltip;

    if (this.currentReplay && this.currentLoaded) {
      this.buildPlayerPanels(this.currentReplay);
      this.buildPerspectiveToggle(this.currentReplay);
      this.renderStatsPanel(this.currentReplay);
      this.buildEventLog();
      this.onFrameChange(
        this.playback?.currentIndex ?? 0,
        this.playback?.isPlaying ?? false,
        "jump",
      );
    }
  }

  private buildPlayerPanels(replay: Replay): void {
    this.playersEl.innerHTML = "";
    const tr = t();

    this.panels = getSeatedPorts(replay).map((port) => {
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
      this.playersEl.appendChild(panel);

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

  private renderFrame(
    frame: Frame | undefined,
    _frameIndex: number,
    snap: boolean,
  ): void {
    this.lastFrame = frame;
    const positions = this.panels
      .map((panel) => frame?.ports[panel.port]?.post)
      .filter((post): post is NonNullable<typeof post> => post !== undefined)
      .filter(
        (post) => !isDeadState(post.actionStateId) && post.stocksRemaining >= 0,
      )
      .map((post) => ({ x: post.positionX, y: post.positionY }));
    this.camera.update(positions, snap);

    this.stageRenderer.render(
      this.camera,
      frame,
      this.currentReplay?.gameStart.stageId,
      this.hoverScreen,
      this.currentReplay,
      _frameIndex,
    );

    const tr = t();
    for (const panel of this.panels) {
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

  private eventLabel(
    ev: MatchEvent,
    replay: Replay,
    perspective: PortIndex | null,
  ): {
    text: string;
    kind: "neutral-hit" | "entered" | "success" | "failure";
  } {
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
          : {
              text: `${edgeEv.frame} — ${tr.edgeGuardFailed}`,
              kind: "failure",
            };
      case "recovery-failure":
        return isRecovering
          ? { text: `${edgeEv.frame} — ${tr.recoveryFailure}`, kind: "failure" }
          : {
              text: `${edgeEv.frame} — ${tr.edgeGuardSuccess}`,
              kind: "success",
            };
    }
  }

  private buildPerspectiveToggle(replay: Replay): void {
    this.perspectiveToggleEl.innerHTML = "";
    const seated = getSeatedPorts(replay);
    if (seated.length !== 2) return;

    for (const port of seated) {
      const btn = document.createElement("button");
      btn.className = "perspective-btn";
      btn.textContent = replay.gameStart.playerNames[port] || PORT_LABELS[port];
      btn.style.color = PORT_COLORS[port];
      btn.addEventListener("click", () => {
        this.perspectivePort = port;
        this.onPerspectiveChangedCb?.(port);
        this.renderStatsPanel(replay);
        this.buildEventLog();
        this.updateEventLogHighlight(this.playback?.currentIndex ?? 0);
        for (const b of this.perspectiveToggleEl.querySelectorAll(
          ".perspective-btn",
        )) {
          b.classList.toggle("active", b === btn);
        }
      });
      this.perspectiveToggleEl.appendChild(btn);
    }

    const buttons =
      this.perspectiveToggleEl.querySelectorAll<HTMLButtonElement>(
        ".perspective-btn",
      );
    seated.forEach((port, idx) => {
      buttons[idx]?.classList.toggle("active", port === this.perspectivePort);
    });
  }

  private buildEventLog(): void {
    if (this.perspectivePort === null) {
      this.currentLogEvents = [];
      return;
    }

    this.currentLogEvents = this.matchEvents.filter((ev) => {
      if (ev.kind === "neutral-hit") {
        return ev.attackerPort === this.perspectivePort;
      }
      return true;
    });
  }

  private updateEventLogHighlight(currentFrameIndex: number): void {
    let activeIdx = -1;
    for (let i = 0; i < this.currentLogEvents.length; i++) {
      const ev = this.currentLogEvents[i];
      if (ev && ev.frameIndex <= currentFrameIndex) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (
      !this.hudOverlayEnabled ||
      activeIdx === -1 ||
      this.currentLogEvents.length === 0 ||
      !this.currentReplay
    ) {
      this.stageOverlay.hidden = true;
    } else {
      this.stageOverlay.hidden = false;
      this.stageOverlayList.innerHTML = "";
      const startIdx = Math.max(0, activeIdx - 2);
      for (let i = startIdx; i <= activeIdx; i++) {
        const ev = this.currentLogEvents[i];
        if (!ev) continue;
        const { text, kind } = this.eventLabel(
          ev,
          this.currentReplay,
          this.perspectivePort,
        );
        const isLatest = i === activeIdx;
        const entry = document.createElement("div");
        entry.className = `overlay-entry kind-${kind}${isLatest ? " is-current" : ""}`;
        entry.textContent = text;
        this.stageOverlayList.appendChild(entry);
      }
    }
  }

  private renderStatsPanel(replay: Replay): void {
    this.statsPanel.innerHTML = "";
    const tr = t();

    const edgeEvents = this.matchEvents.filter(
      (ev): ev is EdgeGuardEvent =>
        ev.kind === "situation-entered" ||
        ev.kind === "recovery-success" ||
        ev.kind === "recovery-failure",
    );
    const ledgeEvents = this.matchEvents.filter(
      (ev): ev is LedgeTrapEvent =>
        ev.kind === "ledge-getup-entered" ||
        ev.kind === "ledge-getup-success" ||
        ev.kind === "ledge-getup-failure",
    );
    const angelEvents = this.matchEvents.filter(
      (ev): ev is AngelInvincibilityEvent =>
        ev.kind === "angel-entered" ||
        ev.kind === "angel-avoid-success" ||
        ev.kind === "angel-avoid-failure",
    );
    if (this.perspectivePort === null || this.matchEvents.length === 0) {
      this.statsPanel.appendChild(this.statsEmpty);
      this.statsEmpty.hidden = false;
      return;
    }

    const stats = computeEdgeGuardStats(edgeEvents, this.perspectivePort);
    const ledgeStats = computeLedgeTrapStats(ledgeEvents, this.perspectivePort);
    const angelStats = computeAngelInvincibilityStats(
      angelEvents,
      this.perspectivePort,
    );
    const neutralStats = computeNeutralHitsStats(replay, this.perspectivePort);
    const name =
      replay.gameStart.playerNames[this.perspectivePort] ||
      PORT_LABELS[this.perspectivePort];

    const pct = (n: number, d: number): string =>
      d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;

    const addRow = (
      label: string,
      successes: number,
      total: number,
      successClass: "pct-success" | "pct-failure",
      baselinePct?: number | null,
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

      if (total > 0 && baselinePct !== null && baselinePct !== undefined) {
        const matchPct = (successes / total) * 100;
        const diff = Math.round(matchPct - baselinePct);
        const sign = diff > 0 ? "+" : "";
        const deltaSpan = document.createElement("span");
        deltaSpan.className = `stat-match-delta ${diff > 0 ? "pct-delta-pos" : diff < 0 ? "pct-delta-neg" : ""}`;
        deltaSpan.textContent = ` (${sign}${diff}%)`;
        deltaSpan.title = `${tr.vsMatchup(`${sign}${diff}%`)} (${Math.round(baselinePct)}% avg)`;
        val.appendChild(deltaSpan);
      }

      val.append(`  ${tr.situations(successes, total)}`);

      row.appendChild(lbl);
      row.appendChild(val);
      this.statsPanel.appendChild(row);
    };

    const addValueRow = (
      label: string,
      valueStr: string,
      subtext?: string,
      baselineHits?: number | null,
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

      if (
        neutralStats.averageHitsPerStock !== null &&
        baselineHits !== null &&
        baselineHits !== undefined
      ) {
        const diff = Number(
          (neutralStats.averageHitsPerStock - baselineHits).toFixed(1),
        );
        const sign = diff > 0 ? "+" : "";
        const deltaSpan = document.createElement("span");
        // For neutral hits per stock, fewer is better
        deltaSpan.className = `stat-match-delta ${diff < 0 ? "pct-delta-pos" : diff > 0 ? "pct-delta-neg" : ""}`;
        deltaSpan.textContent = ` (${sign}${diff.toFixed(1)})`;
        deltaSpan.title = `${tr.vsMatchup(`${sign}${diff.toFixed(1)}`)} (${baselineHits.toFixed(1)} avg)`;
        val.appendChild(deltaSpan);
      }

      if (subtext) {
        val.append(`  ${subtext}`);
      }

      row.appendChild(lbl);
      row.appendChild(val);
      this.statsPanel.appendChild(row);
    };

    const header = document.createElement("div");
    header.className = "stat-row-label";
    header.style.color = PORT_COLORS[this.perspectivePort];
    header.style.marginBottom = "2px";
    header.textContent = name;
    this.statsPanel.appendChild(header);

    addRow(
      tr.recovery,
      stats.recoverySuccesses,
      stats.recoverySituations,
      "pct-success",
      this.matchupBaseline?.recoveryPct,
    );
    addRow(
      tr.edgeGuard,
      stats.edgeGuardSuccesses,
      stats.edgeGuardSituations,
      "pct-success",
      this.matchupBaseline?.edgeGuardPct,
    );
    addRow(
      tr.ledgeGetup,
      ledgeStats.ledgeGetupSuccesses,
      ledgeStats.ledgeGetupSituations,
      "pct-success",
      this.matchupBaseline?.ledgeGetupPct,
    );
    addRow(
      tr.ledgeTrap,
      ledgeStats.ledgeTrapSuccesses,
      ledgeStats.ledgeTrapSituations,
      "pct-success",
      this.matchupBaseline?.ledgeTrapPct,
    );
    addRow(
      tr.angelAvoid,
      angelStats.avoidSuccesses,
      angelStats.avoidSituations,
      "pct-success",
      this.matchupBaseline?.angelAvoidPct,
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
      this.matchupBaseline?.neutralHitsPerStock,
    );
  }

  private onFrameChange(
    index: number,
    isPlaying: boolean,
    reason: FrameChangeReason,
  ): void {
    const frame = this.currentReplay?.frames[index];
    this.renderFrame(frame, index, reason === "jump");
    this.scrubber.value = String(index);
    this.playPauseBtn.textContent = isPlaying ? "⏸" : "▶";

    const totalFrames = this.currentReplay?.frames.length ?? 0;
    const elapsed = formatElapsed(index);
    this.frameLabel.textContent = `Frame ${index} / ${Math.max(0, totalFrames - 1)} (${elapsed})`;
    this.updateEventLogHighlight(index);
  }

  public resizeStageCanvas(): void {
    const rect = this.stageWrap.getBoundingClientRect();
    const width = Math.max(200, Math.floor(rect.width));
    const height = Math.max(150, Math.floor(rect.height));
    this.stageRenderer.resize(width, height);
    if (this.currentReplay) {
      this.camera.resize(width, height);
      this.onFrameChange(
        this.playback?.currentIndex ?? 0,
        this.playback?.isPlaying ?? false,
        "jump",
      );
    }
  }

  public loadMatch(
    loaded: LoadedReplay,
    initialPerspectivePort: PortIndex | null = null,
    matchupBaseline: DerivedRates | null = null,
  ): void {
    this.playback?.pause();
    this.currentLoaded = loaded;
    this.matchupBaseline = matchupBaseline;
    const { replay } = loaded;
    this.currentReplay = replay;
    const edgeEvents = computeEdgeGuardEvents(replay);
    const ledgeEvents = computeLedgeTrapEvents(replay);
    const angelEvents = computeAngelInvincibilityEvents(replay);
    const neutralEvents = computeNeutralHitEvents(replay);
    this.matchEvents = [
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
    if (
      initialPerspectivePort !== null &&
      seated.includes(initialPerspectivePort)
    ) {
      this.perspectivePort = initialPerspectivePort;
    } else if (
      this.perspectivePort === null ||
      !seated.includes(this.perspectivePort)
    ) {
      this.perspectivePort = seated[0] ?? null;
    }

    const rect = this.stageWrap.getBoundingClientRect();
    const width = Math.max(200, Math.floor(rect.width));
    const height = Math.max(150, Math.floor(rect.height));
    this.stageRenderer.resize(width, height);
    this.camera = new Camera(width, height);

    this.buildPlayerPanels(replay);
    this.buildPerspectiveToggle(replay);
    this.renderStatsPanel(replay);
    this.buildEventLog();
    this.loadStatus.textContent = "";

    this.scrubber.max = String(Math.max(0, replay.frames.length - 1));
    this.scrubber.value = "0";

    this.playback = new PlaybackController(
      replay.frames.length,
      (idx, isPlaying, reason) => this.onFrameChange(idx, isPlaying, reason),
    );
    this.onFrameChange(0, false, "jump");
  }

  public setOnPerspectiveChanged(cb: (port: PortIndex) => void): void {
    this.onPerspectiveChangedCb = cb;
  }

  public setMatchupBaseline(baseline: DerivedRates | null): void {
    this.matchupBaseline = baseline;
    if (this.currentReplay) {
      this.renderStatsPanel(this.currentReplay);
    }
  }
}
