import {
  getSeatedPorts,
  type Frame,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import { Camera } from "../camera.js";
import { ControllerPad } from "../controllerPad.js";
import { PlaybackController, type FrameChangeReason } from "../playback.js";
import { PORT_LABELS, getPlayerColor } from "../players.js";
import {
  StageRenderer,
  isCrouchState,
  isDeadState,
  isPikachuCharacter,
  extractAllQuickAttackPaths,
} from "../renderer.js";
import { characterSize } from "../characterSizes.js";
import { actionStateName, characterName } from "../lookups.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";
import { t } from "../i18n.js";
import { computeKillCombos } from "../combos.js";
import {
  DI_ARROW_GLYPHS,
  extractAllHitsWithDI,
  type HitDIResult,
} from "../di.js";
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
import {
  computeJigglypuffFThrowEvents,
  computeJigglypuffFThrowStats,
  computeShieldPressureEvents,
  computeShieldPressureStats,
  getJigglypuffFThrowSituations,
  getShieldPressureSituations,
  isJigglypuffCharacter,
  isNessCharacter,
  isYoshiCharacter,
  getCharacterIconicColor,
  type JigglypuffFThrowEvent,
  type ShieldPressureEvent,
} from "../characterMeta.js";
import type { LoadedReplay } from "../replaySource.js";
import type { DerivedRates } from "../data/aggregate.js";

export type MatchEvent =
  | EdgeGuardEvent
  | NeutralHitEvent
  | LedgeTrapEvent
  | AngelInvincibilityEvent
  | JigglypuffFThrowEvent
  | ShieldPressureEvent;

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
  private characterMetaWidget: HTMLElement;
  private characterMetaHeaderTitle: HTMLHeadingElement;
  private characterMetaCollapseBtn: HTMLButtonElement;
  private characterMetaPanel: HTMLDivElement;
  private logFilterWidget: HTMLElement;
  private logFilterHeaderTitle: HTMLHeadingElement;
  private logFilterCollapseBtn: HTMLButtonElement;
  private logFilterPanel: HTMLDivElement;
  private logFilterChips: HTMLDivElement;
  private stageOverlay: HTMLDivElement;
  private stageOverlayList: HTMLDivElement;
  private qaOverlayExitBtn: HTMLButtonElement;
  private hudToggleBtn: HTMLButtonElement;
  private recoveryWidget: HTMLElement;
  private recoveryCollapseBtn: HTMLButtonElement;
  private recoveryWidgetTitleEl: HTMLHeadingElement;
  private recoveryList: HTMLDivElement;
  private edgeGuardWidget: HTMLElement;
  private edgeGuardCollapseBtn: HTMLButtonElement;
  private edgeGuardWidgetTitleEl: HTMLHeadingElement;
  private edgeGuardList: HTMLDivElement;
  private ledgeGetupWidget: HTMLElement;
  private ledgeGetupCollapseBtn: HTMLButtonElement;
  private ledgeGetupWidgetTitleEl: HTMLHeadingElement;
  private ledgeGetupList: HTMLDivElement;
  private ledgeTrapWidget: HTMLElement;
  private ledgeTrapCollapseBtn: HTMLButtonElement;
  private ledgeTrapWidgetTitleEl: HTMLHeadingElement;
  private ledgeTrapList: HTMLDivElement;
  private combosWidget: HTMLElement;
  private combosCollapseBtn: HTMLButtonElement;
  private combosWidgetTitleEl: HTMLHeadingElement;
  private combosList: HTMLDivElement;
  private diWidget: HTMLElement;
  private diCollapseBtn: HTMLButtonElement;
  private diWidgetTitleEl: HTMLHeadingElement;
  private diList: HTMLDivElement;
  private selectedDIHitId: string | null = null;
  private recoveryCollapsed = false;
  private edgeGuardCollapsed = false;
  private ledgeGetupCollapsed = false;
  private ledgeTrapCollapsed = false;
  private combosCollapsed = false;
  private diCollapsed = false;
  private diEvents: HitDIResult[] = [];
  private replayInfoWidget: HTMLElement;
  private replayInfoCollapseBtn: HTMLButtonElement;
  private replayInfoHeaderTitle: HTMLHeadingElement;
  private replayInfoPanel: HTMLDivElement;
  private replayInfoFileLabel: HTMLSpanElement;
  private replayInfoFileName: HTMLSpanElement;
  private replayInfoDateLabel: HTMLSpanElement;
  private replayInfoDateLocal: HTMLSpanElement;
  private replayInfoCollapsed = false;

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
  private characterMetaCollapsed = false;
  private logFilterCollapsed = false;
  private activeLogCategories: Set<
    "recovery" | "ledge" | "angel" | "neutral" | "character"
  >;
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
    this.characterMetaWidget = document.getElementById(
      "characterMetaWidget",
    ) as HTMLElement;
    this.characterMetaHeaderTitle = document.getElementById(
      "characterMetaHeaderTitle",
    ) as HTMLHeadingElement;
    this.characterMetaCollapseBtn = document.getElementById(
      "characterMetaCollapseBtn",
    ) as HTMLButtonElement;
    this.characterMetaPanel = document.getElementById(
      "characterMetaPanel",
    ) as HTMLDivElement;
    this.logFilterWidget = document.getElementById(
      "logFilterWidget",
    ) as HTMLElement;
    this.logFilterHeaderTitle = document.getElementById(
      "logFilterHeaderTitle",
    ) as HTMLHeadingElement;
    this.logFilterCollapseBtn = document.getElementById(
      "logFilterCollapseBtn",
    ) as HTMLButtonElement;
    this.logFilterPanel = document.getElementById(
      "logFilterPanel",
    ) as HTMLDivElement;
    this.logFilterChips = document.getElementById(
      "logFilterChips",
    ) as HTMLDivElement;
    this.stageOverlay = document.getElementById(
      "stageOverlay",
    ) as HTMLDivElement;
    this.stageOverlayList = document.getElementById(
      "stageOverlayList",
    ) as HTMLDivElement;
    this.qaOverlayExitBtn = document.getElementById(
      "qaOverlayExitBtn",
    ) as HTMLButtonElement;
    this.qaOverlayExitBtn.addEventListener("click", () => {
      this.dismissQuickAttackOverlay();
    });
    this.hudToggleBtn = document.getElementById(
      "hudToggleBtn",
    ) as HTMLButtonElement;

    this.recoveryWidget = document.getElementById(
      "recoveryWidget",
    ) as HTMLElement;
    this.recoveryCollapseBtn = document.getElementById(
      "recoveryCollapseBtn",
    ) as HTMLButtonElement;
    this.recoveryWidgetTitleEl = document.getElementById(
      "recoveryWidgetTitle",
    ) as HTMLHeadingElement;
    this.recoveryList = document.getElementById(
      "recoveryList",
    ) as HTMLDivElement;

    this.edgeGuardWidget = document.getElementById(
      "edgeGuardWidget",
    ) as HTMLElement;
    this.edgeGuardCollapseBtn = document.getElementById(
      "edgeGuardCollapseBtn",
    ) as HTMLButtonElement;
    this.edgeGuardWidgetTitleEl = document.getElementById(
      "edgeGuardWidgetTitle",
    ) as HTMLHeadingElement;
    this.edgeGuardList = document.getElementById(
      "edgeGuardList",
    ) as HTMLDivElement;

    this.ledgeGetupWidget = document.getElementById(
      "ledgeGetupWidget",
    ) as HTMLElement;
    this.ledgeGetupCollapseBtn = document.getElementById(
      "ledgeGetupCollapseBtn",
    ) as HTMLButtonElement;
    this.ledgeGetupWidgetTitleEl = document.getElementById(
      "ledgeGetupWidgetTitle",
    ) as HTMLHeadingElement;
    this.ledgeGetupList = document.getElementById(
      "ledgeGetupList",
    ) as HTMLDivElement;

    this.ledgeTrapWidget = document.getElementById(
      "ledgeTrapWidget",
    ) as HTMLElement;
    this.ledgeTrapCollapseBtn = document.getElementById(
      "ledgeTrapCollapseBtn",
    ) as HTMLButtonElement;
    this.ledgeTrapWidgetTitleEl = document.getElementById(
      "ledgeTrapWidgetTitle",
    ) as HTMLHeadingElement;
    this.ledgeTrapList = document.getElementById(
      "ledgeTrapList",
    ) as HTMLDivElement;

    this.combosWidget = document.getElementById("combosWidget") as HTMLElement;
    this.combosCollapseBtn = document.getElementById(
      "combosCollapseBtn",
    ) as HTMLButtonElement;
    this.combosWidgetTitleEl = document.getElementById(
      "combosWidgetTitle",
    ) as HTMLHeadingElement;
    this.combosList = document.getElementById("combosList") as HTMLDivElement;

    this.diWidget = document.getElementById("diWidget") as HTMLElement;
    this.diCollapseBtn = document.getElementById(
      "diCollapseBtn",
    ) as HTMLButtonElement;
    this.diWidgetTitleEl = document.getElementById(
      "diWidgetTitle",
    ) as HTMLHeadingElement;
    this.diList = document.getElementById("diList") as HTMLDivElement;

    this.replayInfoWidget = document.getElementById(
      "replayInfoWidget",
    ) as HTMLElement;
    this.replayInfoCollapseBtn = document.getElementById(
      "replayInfoCollapseBtn",
    ) as HTMLButtonElement;
    this.replayInfoHeaderTitle = document.getElementById(
      "replayInfoHeaderTitle",
    ) as HTMLHeadingElement;
    this.replayInfoPanel = document.getElementById(
      "replayInfoPanel",
    ) as HTMLDivElement;
    this.replayInfoFileLabel = document.getElementById(
      "replayInfoFileLabel",
    ) as HTMLSpanElement;
    this.replayInfoFileName = document.getElementById(
      "replayInfoFileName",
    ) as HTMLSpanElement;
    this.replayInfoDateLabel = document.getElementById(
      "replayInfoDateLabel",
    ) as HTMLSpanElement;
    this.replayInfoDateLocal = document.getElementById(
      "replayInfoDateLocal",
    ) as HTMLSpanElement;

    this.stageRenderer = new StageRenderer(this.stageCanvas);

    try {
      this.hudOverlayEnabled =
        localStorage.getItem("rmgr-viewer-hud") !== "false";
    } catch {
      // Ignore localStorage read error
    }

    try {
      const savedCats = localStorage.getItem("rmgr-viewer-log-categories");
      if (savedCats) {
        this.activeLogCategories = new Set(JSON.parse(savedCats));
      } else {
        this.activeLogCategories = new Set([
          "recovery",
          "ledge",
          "angel",
          "neutral",
          "character",
        ]);
      }
    } catch {
      this.activeLogCategories = new Set([
        "recovery",
        "ledge",
        "angel",
        "neutral",
        "character",
      ]);
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

    this.recoveryCollapseBtn.addEventListener("click", () => {
      this.recoveryCollapsed = !this.recoveryCollapsed;
      this.recoveryList.hidden = this.recoveryCollapsed;
      this.recoveryCollapseBtn.classList.toggle(
        "collapsed",
        this.recoveryCollapsed,
      );
    });

    this.edgeGuardCollapseBtn.addEventListener("click", () => {
      this.edgeGuardCollapsed = !this.edgeGuardCollapsed;
      this.edgeGuardList.hidden = this.edgeGuardCollapsed;
      this.edgeGuardCollapseBtn.classList.toggle(
        "collapsed",
        this.edgeGuardCollapsed,
      );
    });

    this.ledgeGetupCollapseBtn.addEventListener("click", () => {
      this.ledgeGetupCollapsed = !this.ledgeGetupCollapsed;
      this.ledgeGetupList.hidden = this.ledgeGetupCollapsed;
      this.ledgeGetupCollapseBtn.classList.toggle(
        "collapsed",
        this.ledgeGetupCollapsed,
      );
    });

    this.ledgeTrapCollapseBtn.addEventListener("click", () => {
      this.ledgeTrapCollapsed = !this.ledgeTrapCollapsed;
      this.ledgeTrapList.hidden = this.ledgeTrapCollapsed;
      this.ledgeTrapCollapseBtn.classList.toggle(
        "collapsed",
        this.ledgeTrapCollapsed,
      );
    });

    this.combosCollapseBtn.addEventListener("click", () => {
      this.combosCollapsed = !this.combosCollapsed;
      this.combosList.hidden = this.combosCollapsed;
      this.combosCollapseBtn.classList.toggle(
        "collapsed",
        this.combosCollapsed,
      );
    });

    this.diCollapseBtn.addEventListener("click", () => {
      this.diCollapsed = !this.diCollapsed;
      this.diList.hidden = this.diCollapsed;
      this.diCollapseBtn.classList.toggle("collapsed", this.diCollapsed);
    });

    this.characterMetaCollapseBtn.addEventListener("click", () => {
      this.characterMetaCollapsed = !this.characterMetaCollapsed;
      this.characterMetaPanel.hidden = this.characterMetaCollapsed;
      this.characterMetaCollapseBtn.classList.toggle(
        "collapsed",
        this.characterMetaCollapsed,
      );
    });

    this.logFilterCollapseBtn.addEventListener("click", () => {
      this.logFilterCollapsed = !this.logFilterCollapsed;
      this.logFilterPanel.hidden = this.logFilterCollapsed;
      this.logFilterCollapseBtn.classList.toggle(
        "collapsed",
        this.logFilterCollapsed,
      );
    });

    this.replayInfoCollapseBtn.addEventListener("click", () => {
      this.replayInfoCollapsed = !this.replayInfoCollapsed;
      this.replayInfoPanel.hidden = this.replayInfoCollapsed;
      this.replayInfoCollapseBtn.classList.toggle(
        "collapsed",
        this.replayInfoCollapsed,
      );
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

    this.playPauseBtn.addEventListener("click", () => {
      this.dismissQuickAttackOverlay();
      this.playback?.toggle();
    });
    this.stepBackBtn.addEventListener("click", () => {
      this.dismissQuickAttackOverlay();
      this.playback?.stepBackward();
    });
    this.stepForwardBtn.addEventListener("click", () => {
      this.dismissQuickAttackOverlay();
      this.playback?.stepForward();
    });
    this.scrubber.addEventListener("input", () => {
      this.dismissQuickAttackOverlay();
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
        this.perspectivePort,
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
        this.perspectivePort,
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
    const perspectiveTitleEl = document.getElementById(
      "perspectiveHeaderTitle",
    );
    if (perspectiveTitleEl)
      perspectiveTitleEl.textContent = tr.perspectiveTitle;
    if (this.matchStatsHeaderTitle)
      this.matchStatsHeaderTitle.textContent = tr.matchStats;
    if (this.statsEmpty) this.statsEmpty.textContent = tr.statsEmpty;
    if (this.statsCollapseBtn)
      this.statsCollapseBtn.title = tr.statsCollapseTitle;
    if (this.recoveryWidgetTitleEl)
      this.recoveryWidgetTitleEl.textContent = tr.recoveryWidgetTitle;
    if (this.recoveryCollapseBtn)
      this.recoveryCollapseBtn.title = tr.situationCollapseTitle(
        tr.recoveryWidgetTitle,
      );
    if (this.edgeGuardWidgetTitleEl)
      this.edgeGuardWidgetTitleEl.textContent = tr.edgeGuardWidgetTitle;
    if (this.edgeGuardCollapseBtn)
      this.edgeGuardCollapseBtn.title = tr.situationCollapseTitle(
        tr.edgeGuardWidgetTitle,
      );
    if (this.ledgeGetupWidgetTitleEl)
      this.ledgeGetupWidgetTitleEl.textContent = tr.ledgeGetupWidgetTitle;
    if (this.ledgeGetupCollapseBtn)
      this.ledgeGetupCollapseBtn.title = tr.situationCollapseTitle(
        tr.ledgeGetupWidgetTitle,
      );
    if (this.ledgeTrapWidgetTitleEl)
      this.ledgeTrapWidgetTitleEl.textContent = tr.ledgeTrapWidgetTitle;
    if (this.ledgeTrapCollapseBtn)
      this.ledgeTrapCollapseBtn.title = tr.situationCollapseTitle(
        tr.ledgeTrapWidgetTitle,
      );
    if (this.combosWidgetTitleEl)
      this.combosWidgetTitleEl.textContent = tr.combosWidgetTitle;
    if (this.combosCollapseBtn)
      this.combosCollapseBtn.title = tr.situationCollapseTitle(
        tr.combosWidgetTitle,
      );
    if (this.diWidgetTitleEl)
      this.diWidgetTitleEl.textContent = tr.diWidgetTitle;
    if (this.diCollapseBtn)
      this.diCollapseBtn.title = tr.situationCollapseTitle(tr.diWidgetTitle);
    if (this.hudToggleBtn) {
      this.hudToggleBtn.textContent = tr.hudOverlay;
      this.hudToggleBtn.title = tr.hudOverlayTitle;
    }
    if (this.qaOverlayExitBtn) {
      this.qaOverlayExitBtn.textContent = "✕ " + tr.hideQuickAttackOverlayBtn;
    }
    if (this.replayInfoHeaderTitle)
      this.replayInfoHeaderTitle.textContent = tr.replayInfoWidgetTitle;
    if (this.replayInfoCollapseBtn)
      this.replayInfoCollapseBtn.title = tr.situationCollapseTitle(
        tr.replayInfoWidgetTitle,
      );
    if (this.replayInfoFileLabel)
      this.replayInfoFileLabel.textContent = tr.replayInfoFileLabel;
    if (this.replayInfoDateLabel)
      this.replayInfoDateLabel.textContent = tr.replayInfoRecordedLabel;
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

  private dismissQuickAttackOverlay(): void {
    if (this.stageRenderer.isQuickAttackOverlayActive()) {
      this.stageRenderer.setQuickAttackOverlay(null);
      this.stageRenderer.setHoveredQuickAttackIndex(null);
      if (this.qaOverlayExitBtn) {
        this.qaOverlayExitBtn.hidden = true;
      }
      if (this.currentReplay) {
        this.renderCharacterMetaPanel(this.currentReplay);
      }
      if (this.lastFrame !== undefined) {
        const currIdx = this.playback?.currentIndex ?? 0;
        this.renderFrame(this.lastFrame, currIdx, true);
      }
    }
  }

  private updatePlayerPanelColors(): void {
    for (const panel of this.panels) {
      const panelEl = panel.damageEl.closest(
        ".player-panel",
      ) as HTMLElement | null;
      if (panelEl) {
        panelEl.style.setProperty(
          "--player-color",
          getPlayerColor(panel.port, this.perspectivePort),
        );
      }
    }
  }

  private buildPlayerPanels(replay: Replay): void {
    this.playersEl.innerHTML = "";
    const tr = t();

    this.panels = getSeatedPorts(replay).map((port) => {
      const settings = replay.gameStart.ports[port];
      const color = getPlayerColor(port, this.perspectivePort);

      const panel = document.createElement("div");
      panel.className = "player-panel";
      panel.style.setProperty("--player-color", color);

      const name = replay.gameStart?.playerNames?.[port] || PORT_LABELS[port];
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
    const targets: Array<{ x: number; y: number }> = [];
    if (this.stageRenderer.isQuickAttackOverlayActive()) {
      const overlayPaths = this.stageRenderer.getQuickAttackOverlayPaths();
      if (overlayPaths && overlayPaths.length > 0) {
        for (const path of overlayPaths) {
          for (const pt of path.points) {
            targets.push(pt);
          }
        }
      }
      // Include stage boundaries and upper platform area so stage is well framed
      targets.push({ x: -400, y: 0 }, { x: 400, y: 0 }, { x: 0, y: 250 });
    } else {
      for (const panel of this.panels) {
        const post = frame?.ports[panel.port]?.post;
        if (
          !post ||
          isDeadState(post.actionStateId) ||
          post.stocksRemaining < 0
        ) {
          continue;
        }
        const size = characterSize(post.characterId);
        const crouching = isCrouchState(post.actionStateId);
        const height = size.height * (crouching ? 0.5 : 1.0);
        const halfWidth = size.width / 2;

        targets.push(
          { x: post.positionX - halfWidth, y: post.positionY },
          { x: post.positionX + halfWidth, y: post.positionY + height },
        );
      }
    }
    this.camera.update(
      targets,
      snap || this.stageRenderer.isQuickAttackOverlayActive(),
    );

    this.stageRenderer.render(
      this.camera,
      frame,
      this.currentReplay?.gameStart.stageId,
      this.hoverScreen,
      this.currentReplay,
      _frameIndex,
      this.perspectivePort,
    );

    if (this.qaOverlayExitBtn) {
      this.qaOverlayExitBtn.hidden =
        !this.stageRenderer.isQuickAttackOverlayActive();
    }

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
      replay.gameStart?.playerNames?.[port] || PORT_LABELS[port];

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

    if (
      ev.kind === "fthrow-entered" ||
      ev.kind === "fthrow-success" ||
      ev.kind === "fthrow-failure"
    ) {
      if (perspective === null) {
        switch (ev.kind) {
          case "fthrow-entered":
            return {
              text: `${ev.frame} — ${tr.playerFthrowEntered(name(ev.puffPort))}`,
              kind: "entered",
            };
          case "fthrow-success":
            return {
              text: `${ev.frame} — ${tr.playerFthrowFollowup(name(ev.puffPort), ev.followupHits)}`,
              kind: "success",
            };
          case "fthrow-failure":
            return {
              text: `${ev.frame} — ${tr.playerFthrowNoFollowup(name(ev.puffPort))}`,
              kind: "failure",
            };
        }
      }

      const isPuff = ev.puffPort === perspective;
      switch (ev.kind) {
        case "fthrow-entered":
          return {
            text: `${ev.frame} — ${isPuff ? tr.fthrowEntered : tr.opponentFthrowEntered}`,
            kind: "entered",
          };
        case "fthrow-success":
          return isPuff
            ? {
                text: `${ev.frame} — ${tr.fthrowFollowupSuccess(ev.followupHits)}`,
                kind: "success",
              }
            : {
                text: `${ev.frame} — ${tr.opponentFthrowFollowupHit(ev.followupHits)}`,
                kind: "failure",
              };
        case "fthrow-failure":
          return isPuff
            ? {
                text: `${ev.frame} — ${tr.fthrowNoFollowup}`,
                kind: "failure",
              }
            : {
                text: `${ev.frame} — ${tr.opponentFthrowEscaped}`,
                kind: "success",
              };
      }
    }

    if (
      ev.kind === "shield-pressure-entered" ||
      ev.kind === "shield-break" ||
      ev.kind === "shield-grab" ||
      ev.kind === "shield-escape"
    ) {
      if (perspective === null) {
        switch (ev.kind) {
          case "shield-pressure-entered":
            return {
              text: `${ev.frame} — ${tr.playerShieldPressureEntered(name(ev.attackerPort), ev.hitsOnShield)}`,
              kind: "entered",
            };
          case "shield-break":
            return {
              text: `${ev.frame} — ${tr.playerShieldBreakForced(name(ev.attackerPort))}`,
              kind: "success",
            };
          case "shield-grab":
            return {
              text: `${ev.frame} — ${tr.playerShieldPressureGrab(name(ev.attackerPort))}`,
              kind: "success",
            };
          case "shield-escape":
            return {
              text: `${ev.frame} — ${tr.playerShieldPressureEscaped(name(ev.attackerPort))}`,
              kind: "failure",
            };
        }
      }

      const isAttacker = ev.attackerPort === perspective;
      switch (ev.kind) {
        case "shield-pressure-entered":
          return {
            text: `${ev.frame} — ${isAttacker ? tr.shieldPressureEntered(ev.hitsOnShield) : tr.opponentShieldPressureEntered(ev.hitsOnShield)}`,
            kind: "entered",
          };
        case "shield-break":
          return isAttacker
            ? {
                text: `${ev.frame} — ${tr.shieldBreakForced}`,
                kind: "success",
              }
            : {
                text: `${ev.frame} — ${tr.shieldBroken}`,
                kind: "failure",
              };
        case "shield-grab":
          return isAttacker
            ? {
                text: `${ev.frame} — ${tr.shieldPressureGrab}`,
                kind: "success",
              }
            : {
                text: `${ev.frame} — ${tr.opponentShieldPressureGrab}`,
                kind: "failure",
              };
        case "shield-escape":
          return isAttacker
            ? {
                text: `${ev.frame} — ${tr.shieldPressureEscaped}`,
                kind: "failure",
              }
            : {
                text: `${ev.frame} — ${tr.opponentShieldPressureEscaped}`,
                kind: "success",
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
      const name = replay.gameStart?.playerNames?.[port] || PORT_LABELS[port];
      btn.textContent = name;

      btn.addEventListener("click", () => {
        const wasOverlayActive =
          this.stageRenderer.isQuickAttackOverlayActive();
        this.perspectivePort = port;
        const newCharId = replay.gameStart.ports[port]?.characterId;
        if (wasOverlayActive && isPikachuCharacter(newCharId)) {
          const newPaths = extractAllQuickAttackPaths(replay, port, true);
          this.stageRenderer.setQuickAttackOverlay(newPaths);
          this.stageRenderer.setHoveredQuickAttackIndex(null);
        } else {
          this.stageRenderer.setQuickAttackOverlay(null);
          this.stageRenderer.setHoveredQuickAttackIndex(null);
        }
        this.onPerspectiveChangedCb?.(port);
        this.updatePlayerPanelColors();
        this.renderStatsPanel(replay);
        this.renderCharacterMetaPanel(replay);
        this.buildEventLog();
        this.updateEventLogHighlight(this.playback?.currentIndex ?? 0);
        this.onFrameChange(
          this.playback?.currentIndex ?? 0,
          this.playback?.isPlaying ?? false,
          "jump",
        );
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

  private renderLogFilterWidget(): void {
    const tr = t();
    this.logFilterHeaderTitle.textContent = tr.logFiltersTitle;
    this.logFilterChips.innerHTML = "";

    const categories: Array<{
      id: "recovery" | "ledge" | "angel" | "neutral" | "character";
      label: string;
    }> = [
      { id: "recovery", label: tr.logFilterRecovery },
      { id: "ledge", label: tr.logFilterLedge },
      { id: "angel", label: tr.logFilterAngel },
      { id: "neutral", label: tr.logFilterNeutral },
      { id: "character", label: tr.logFilterCharacter },
    ];

    for (const cat of categories) {
      const chip = document.createElement("button");
      chip.className = `log-filter-chip ${this.activeLogCategories.has(cat.id) ? "active" : ""}`;
      chip.textContent = cat.label;
      chip.addEventListener("click", () => {
        if (this.activeLogCategories.has(cat.id)) {
          this.activeLogCategories.delete(cat.id);
        } else {
          this.activeLogCategories.add(cat.id);
        }
        try {
          localStorage.setItem(
            "rmgr-viewer-log-categories",
            JSON.stringify([...this.activeLogCategories]),
          );
        } catch {
          // Ignore localStorage write error
        }
        this.renderLogFilterWidget();
        this.buildEventLog();
        this.updateEventLogHighlight(this.playback?.currentIndex ?? 0);
      });
      this.logFilterChips.appendChild(chip);
    }
  }

  private buildEventLog(): void {
    if (this.perspectivePort === null) {
      this.currentLogEvents = [];
      return;
    }

    this.currentLogEvents = this.matchEvents.filter((ev) => {
      if (ev.kind === "neutral-hit") {
        if (!this.activeLogCategories.has("neutral")) return false;
        return ev.attackerPort === this.perspectivePort;
      }
      if (
        ev.kind === "situation-entered" ||
        ev.kind === "recovery-success" ||
        ev.kind === "recovery-failure"
      ) {
        return this.activeLogCategories.has("recovery");
      }
      if (
        ev.kind === "ledge-getup-entered" ||
        ev.kind === "ledge-getup-success" ||
        ev.kind === "ledge-getup-failure"
      ) {
        return this.activeLogCategories.has("ledge");
      }
      if (
        ev.kind === "angel-entered" ||
        ev.kind === "angel-avoid-success" ||
        ev.kind === "angel-avoid-failure"
      ) {
        return this.activeLogCategories.has("angel");
      }
      if (
        ev.kind === "fthrow-entered" ||
        ev.kind === "fthrow-success" ||
        ev.kind === "fthrow-failure" ||
        ev.kind === "shield-pressure-entered" ||
        ev.kind === "shield-break" ||
        ev.kind === "shield-grab" ||
        ev.kind === "shield-escape"
      ) {
        return this.activeLogCategories.has("character");
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
      this.recoveryWidget.hidden = true;
      this.edgeGuardWidget.hidden = true;
      this.ledgeGetupWidget.hidden = true;
      this.ledgeTrapWidget.hidden = true;
      this.renderCombosPanel(replay);
      this.renderDIPanel(replay);
      this.renderCharacterMetaPanel(replay);
      return;
    }

    const stats = computeEdgeGuardStats(edgeEvents, this.perspectivePort);
    const ledgeStats = computeLedgeTrapStats(ledgeEvents, this.perspectivePort);
    const angelStats = computeAngelInvincibilityStats(
      angelEvents,
      this.perspectivePort,
    );
    const neutralStats = computeNeutralHitsStats(replay, this.perspectivePort);

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
        deltaSpan.title = `${tr.vsOverall(`${sign}${diff}%`)} (${Math.round(baselinePct)}% avg)`;
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
        deltaSpan.title = `${tr.vsOverall(`${sign}${diff.toFixed(1)}`)} (${baselineHits.toFixed(1)} avg)`;
        val.appendChild(deltaSpan);
      }

      if (subtext) {
        val.append(`  ${subtext}`);
      }

      row.appendChild(lbl);
      row.appendChild(val);
      this.statsPanel.appendChild(row);
    };

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
    const addLedgeRow = (
      label: string,
      successes: number,
      total: number,
      under100Successes: number,
      under100Total: number,
      over100Successes: number,
      over100Total: number,
      baselinePct?: number | null,
    ): void => {
      const row = document.createElement("div");
      row.className = "stat-row";

      const lbl = document.createElement("span");
      lbl.className = "stat-row-label";
      lbl.textContent = label;

      const val = document.createElement("div");
      val.className = "stat-row-value";

      const pctSpan = document.createElement("span");
      if (total === 0) {
        pctSpan.className = "stat-pct";
        pctSpan.textContent = "—";
      } else {
        const pct = Math.round((successes / total) * 100);
        pctSpan.className = "stat-pct pct-success";
        pctSpan.textContent = `${pct}%`;
      }

      const countSpan = document.createElement("span");
      countSpan.className = "stat-count";
      countSpan.textContent = ` (${successes}/${total})`;

      val.appendChild(pctSpan);
      val.appendChild(countSpan);

      if (baselinePct !== undefined && baselinePct !== null && total > 0) {
        const currentPct = (successes / total) * 100;
        const delta = Math.round(currentPct - baselinePct);
        const deltaSpan = document.createElement("span");
        deltaSpan.className = `stat-match-delta ${delta >= 0 ? "pct-delta-pos" : "pct-delta-neg"}`;
        deltaSpan.textContent = delta >= 0 ? `+${delta}%` : `${delta}%`;
        val.appendChild(deltaSpan);
      }

      row.appendChild(lbl);
      row.appendChild(val);

      if (total > 0) {
        const sub = document.createElement("div");
        sub.className = "stat-subdetail";
        const uPct =
          under100Total > 0
            ? `${Math.round((under100Successes / under100Total) * 100)}%`
            : "—";
        const oPct =
          over100Total > 0
            ? `${Math.round((over100Successes / over100Total) * 100)}%`
            : "—";
        sub.textContent = `<100%: ${under100Successes}/${under100Total} (${uPct}) | ≥100%: ${over100Successes}/${over100Total} (${oPct})`;
        row.appendChild(sub);
      }

      this.statsPanel.appendChild(row);
    };

    addLedgeRow(
      tr.ledgeGetup,
      ledgeStats.ledgeGetupSuccesses,
      ledgeStats.ledgeGetupSituations,
      ledgeStats.ledgeGetupUnder100Successes,
      ledgeStats.ledgeGetupUnder100Situations,
      ledgeStats.ledgeGetupOver100Successes,
      ledgeStats.ledgeGetupOver100Situations,
      this.matchupBaseline?.ledgeGetupPct,
    );
    addLedgeRow(
      tr.ledgeTrap,
      ledgeStats.ledgeTrapSuccesses,
      ledgeStats.ledgeTrapSituations,
      ledgeStats.ledgeTrapUnder100Successes,
      ledgeStats.ledgeTrapUnder100Situations,
      ledgeStats.ledgeTrapOver100Successes,
      ledgeStats.ledgeTrapOver100Situations,
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

    this.buildSituationWidgets(replay);
    this.renderCombosPanel(replay);
    this.renderDIPanel(replay);
    this.renderCharacterMetaPanel(replay);
  }

  private buildSituationWidgets(replay: Replay): void {
    const tr = t();
    this.recoveryList.innerHTML = "";
    this.edgeGuardList.innerHTML = "";
    this.ledgeGetupList.innerHTML = "";
    this.ledgeTrapList.innerHTML = "";

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

    if (
      this.perspectivePort === null ||
      this.matchEvents.length === 0 ||
      replay.gameStart.stageId !== DREAM_LAND_STAGE_ID
    ) {
      this.recoveryWidget.hidden = true;
      this.edgeGuardWidget.hidden = true;
      this.ledgeGetupWidget.hidden = true;
      this.ledgeTrapWidget.hidden = true;
      return;
    }

    this.recoveryWidget.hidden = false;
    this.edgeGuardWidget.hidden = false;
    this.ledgeGetupWidget.hidden = false;
    this.ledgeTrapWidget.hidden = false;

    interface EdgeSituationRecord {
      enteredFrameIndex: number;
      enteredFrame: number;
      outcome: "success" | "failure" | "open";
      recoveringPort: PortIndex;
      edgeGuardingPort: PortIndex;
    }

    const edgeSituations: EdgeSituationRecord[] = [];
    let currentEdgeSit: EdgeSituationRecord | null = null;

    for (const ev of edgeEvents) {
      if (ev.kind === "situation-entered") {
        if (currentEdgeSit) {
          edgeSituations.push(currentEdgeSit);
        }
        currentEdgeSit = {
          enteredFrameIndex: ev.frameIndex,
          enteredFrame: ev.frame,
          outcome: "open",
          recoveringPort: ev.recoveringPort,
          edgeGuardingPort: ev.edgeGuardingPort,
        };
      } else if (
        ev.kind === "recovery-success" ||
        ev.kind === "recovery-failure"
      ) {
        if (currentEdgeSit) {
          currentEdgeSit.outcome =
            ev.kind === "recovery-success" ? "success" : "failure";
          edgeSituations.push(currentEdgeSit);
          currentEdgeSit = null;
        }
      }
    }
    if (currentEdgeSit) {
      edgeSituations.push(currentEdgeSit);
    }

    interface LedgeSituationRecord {
      enteredFrameIndex: number;
      enteredFrame: number;
      outcome: "success" | "failure" | "open";
      ledgePort: PortIndex;
      trapPort: PortIndex;
      damageAtEntry: number;
      isUnder100: boolean;
    }

    const ledgeSituations: LedgeSituationRecord[] = [];
    let currentLedgeSit: LedgeSituationRecord | null = null;

    for (const ev of ledgeEvents) {
      if (ev.kind === "ledge-getup-entered") {
        if (currentLedgeSit) {
          ledgeSituations.push(currentLedgeSit);
        }
        currentLedgeSit = {
          enteredFrameIndex: ev.frameIndex,
          enteredFrame: ev.frame,
          outcome: "open",
          ledgePort: ev.ledgePort,
          trapPort: ev.trapPort,
          damageAtEntry: ev.damageAtEntry,
          isUnder100: ev.isUnder100,
        };
      } else if (
        ev.kind === "ledge-getup-success" ||
        ev.kind === "ledge-getup-failure"
      ) {
        if (currentLedgeSit) {
          currentLedgeSit.outcome =
            ev.kind === "ledge-getup-success" ? "success" : "failure";
          ledgeSituations.push(currentLedgeSit);
          currentLedgeSit = null;
        }
      }
    }
    if (currentLedgeSit) {
      ledgeSituations.push(currentLedgeSit);
    }

    const recoverySituations = edgeSituations.filter(
      (s) => s.recoveringPort === this.perspectivePort,
    );
    const edgeGuardSituations = edgeSituations.filter(
      (s) => s.edgeGuardingPort === this.perspectivePort,
    );
    const ledgeGetupSituations = ledgeSituations.filter(
      (s) => s.ledgePort === this.perspectivePort,
    );
    const ledgeTrapSituations = ledgeSituations.filter(
      (s) => s.trapPort === this.perspectivePort,
    );

    const renderList = (
      container: HTMLDivElement,
      items: Array<{
        enteredFrameIndex: number;
        enteredFrame: number;
        outcome: "success" | "failure" | "open";
        damageAtEntry?: number;
        isUnder100?: boolean;
      }>,
      isSuccessOutcome: (outcome: "success" | "failure") => boolean,
    ): void => {
      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "situation-empty";
        empty.textContent = tr.noSituations;
        container.appendChild(empty);
        return;
      }

      items.forEach((sit, index) => {
        const row = document.createElement("div");
        row.className = "situation-row";

        const indexEl = document.createElement("span");
        indexEl.className = "situation-index";
        indexEl.textContent = `#${index + 1}`;

        const timeEl = document.createElement("span");
        timeEl.className = "situation-time";
        timeEl.textContent = `${formatElapsed(sit.enteredFrameIndex)} (${sit.enteredFrame}F)`;

        let isSuccess: boolean | null;
        if (sit.outcome === "open") {
          isSuccess = null;
        } else {
          isSuccess = isSuccessOutcome(sit.outcome);
        }

        row.appendChild(indexEl);
        row.appendChild(timeEl);

        if (sit.damageAtEntry !== undefined) {
          const bracketEl = document.createElement("span");
          const isUnder100 = sit.isUnder100 ?? sit.damageAtEntry < 100;
          bracketEl.className = `situation-bracket ${isUnder100 ? "bracket-under100" : "bracket-over100"}`;
          bracketEl.textContent = `${isUnder100 ? "<100%" : "≥100%"} (${sit.damageAtEntry}%)`;
          row.appendChild(bracketEl);
        }

        const badgeEl = document.createElement("span");
        if (isSuccess === true) {
          badgeEl.className = "situation-badge success";
          badgeEl.textContent = tr.situationSuccessBadge;
        } else if (isSuccess === false) {
          badgeEl.className = "situation-badge failure";
          badgeEl.textContent = tr.situationFailureBadge;
        } else {
          badgeEl.className = "situation-badge open";
          badgeEl.textContent = tr.situationOpenBadge;
        }
        row.appendChild(badgeEl);

        row.addEventListener("click", () => {
          this.dismissQuickAttackOverlay();
          // Seek 1.5 seconds (90 frames at 60fps) before the situation began and play automatically
          const targetFrameIndex = Math.max(0, sit.enteredFrameIndex - 90);
          this.playback?.seek(targetFrameIndex);
          this.playback?.play();
        });

        container.appendChild(row);
      });
    };

    renderList(
      this.recoveryList,
      recoverySituations,
      (outcome) => outcome === "success",
    );
    renderList(
      this.edgeGuardList,
      edgeGuardSituations,
      (outcome) => outcome === "failure",
    );
    renderList(
      this.ledgeGetupList,
      ledgeGetupSituations,
      (outcome) => outcome === "success",
    );
    renderList(
      this.ledgeTrapList,
      ledgeTrapSituations,
      (outcome) => outcome === "failure",
    );
  }

  private renderCombosPanel(replay: Replay): void {
    const tr = t();
    this.combosList.innerHTML = "";

    if (replay.frames.length === 0) {
      this.combosWidget.hidden = true;
      return;
    }

    const allCombos = computeKillCombos(replay);
    const combos =
      this.perspectivePort !== null
        ? allCombos.filter((c) => c.attackerPort === this.perspectivePort)
        : allCombos;

    this.combosWidget.hidden = false;

    if (combos.length === 0) {
      const empty = document.createElement("div");
      empty.className = "situation-empty";
      empty.textContent = tr.noCombos;
      this.combosList.appendChild(empty);
      return;
    }

    const allHits = extractAllHitsWithDI(replay);

    combos.forEach((c, index) => {
      const row = document.createElement("div");
      row.className = "situation-row";

      const indexEl = document.createElement("span");
      indexEl.className = "situation-index";
      indexEl.textContent = `#${index + 1}`;

      const timeEl = document.createElement("span");
      timeEl.className = "situation-time";
      timeEl.textContent = `${formatElapsed(c.startFrameIndex)} (${c.startFrame}F)`;

      const hitsEl = document.createElement("span");
      hitsEl.className = "combo-hits-badge";
      hitsEl.textContent = tr.comboHitsBadge(c.hitCount);

      const dmgEl = document.createElement("span");
      dmgEl.className = "combo-damage";
      dmgEl.textContent = `${Math.round(c.startDamage)}% → ${Math.round(c.endDamage)}%`;

      const koBadgeEl = document.createElement("span");
      koBadgeEl.className = "combo-kill-badge";
      koBadgeEl.textContent = tr.comboKillBadge;

      row.appendChild(indexEl);
      row.appendChild(timeEl);
      row.appendChild(hitsEl);
      row.appendChild(dmgEl);
      row.appendChild(koBadgeEl);

      // Find hits belonging to this combo to extract victim DI
      const comboHits = allHits.filter(
        (h) =>
          h.victimPort === c.victimPort &&
          h.hitFrameIndex >= c.startFrameIndex &&
          h.hitFrameIndex <= c.endFrameIndex + 20,
      );

      if (comboHits.length > 0) {
        const lastHit = comboHits[comboHits.length - 1];
        if (lastHit) {
          const diBadgeEl = document.createElement("span");
          diBadgeEl.className = "combo-di-badge";
          const dir =
            lastHit.relative !== "neutral"
              ? lastHit.relative
              : lastHit.cardinal;
          diBadgeEl.textContent =
            lastHit.inputCount > 0 ? `${lastHit.inputCount}x DI` : `No DI`;
          diBadgeEl.title = `Victim DI on final hit: ${lastHit.inputCount}x (${dir}), ${Math.round(lastHit.displacement.distance)}u displacement`;
          row.appendChild(diBadgeEl);
        }
      }

      row.addEventListener("click", () => {
        this.dismissQuickAttackOverlay();
        this.playback?.seek(c.jumpFrameIndex);
        this.playback?.play();
      });

      this.combosList.appendChild(row);
    });
  }

  private renderDIPanel(replay: Replay): void {
    const tr = t();
    this.diList.innerHTML = "";

    if (replay.frames.length === 0 || this.diEvents.length === 0) {
      this.diWidget.hidden = true;
      return;
    }

    const filteredHits =
      this.perspectivePort !== null
        ? this.diEvents.filter((h) => h.victimPort === this.perspectivePort)
        : this.diEvents;

    this.diWidget.hidden = false;

    if (filteredHits.length === 0) {
      const empty = document.createElement("div");
      empty.className = "situation-empty";
      empty.textContent = tr.noDIFound;
      this.diList.appendChild(empty);
      return;
    }

    filteredHits.forEach((h, index) => {
      const itemWrap = document.createElement("div");
      itemWrap.className =
        "di-item-wrapper" + (this.selectedDIHitId === h.id ? " selected" : "");
      itemWrap.id = `di-item-${h.id}`;
      itemWrap.dataset.hitId = h.id;

      const row = document.createElement("div");
      row.className = "di-item-row";

      const indexEl = document.createElement("span");
      indexEl.className = "situation-index";
      indexEl.textContent = `#${index + 1}`;

      const timeEl = document.createElement("span");
      timeEl.className = "situation-time";
      timeEl.textContent = `${formatElapsed(h.hitFrameIndex)} (${h.hitFrameNumber}F)`;

      const dmgEl = document.createElement("span");
      dmgEl.className = "combo-damage";
      dmgEl.textContent = `+${Math.round(h.damageDealt)}%`;

      const badgeEl = document.createElement("span");
      const glyph = DI_ARROW_GLYPHS[h.cardinal] ?? "•";
      const dir = h.relative !== "neutral" ? h.relative : h.cardinal;

      if (h.inputCount >= 2) {
        badgeEl.className = "di-badge-strong";
        badgeEl.textContent = `${glyph} ${h.inputCount}x (${dir})`;
      } else if (h.inputCount === 1) {
        badgeEl.className = "di-badge-standard";
        badgeEl.textContent = `${glyph} 1x (${dir})`;
      } else {
        badgeEl.className = "di-badge-none";
        badgeEl.textContent = `No DI`;
      }

      row.appendChild(indexEl);
      row.appendChild(timeEl);
      row.appendChild(dmgEl);
      row.appendChild(badgeEl);

      const detail = document.createElement("div");
      detail.className = "di-inline-detail";
      detail.hidden = this.selectedDIHitId !== h.id;

      const victimCharId =
        this.currentReplay?.frames[0]?.ports[h.victimPort]?.post.characterId ??
        0;
      const victimChar = characterName(victimCharId);
      const victimName = `${PORT_LABELS[h.victimPort]} (${victimChar})`;

      let attackerName = "Opponent";
      if (h.attackerPort !== null) {
        const attackerCharId =
          this.currentReplay?.frames[0]?.ports[h.attackerPort]?.post
            .characterId ?? 0;
        const attackerChar = characterName(attackerCharId);
        attackerName = `${PORT_LABELS[h.attackerPort]} (${attackerChar})`;
      }

      let cancellationHtml = "";
      if (h.inputs.length >= 2) {
        const activeInps = h.inputs.filter((i) => i.isActivation);
        if (activeInps.length >= 2) {
          const grossDist = activeInps.reduce(
            (sum, i) => sum + Math.hypot(i.stickX * 2.1, i.stickY * 2.1),
            0,
          );
          const netDist = Math.hypot(
            activeInps.reduce((sum, i) => sum + i.stickX * 2.1, 0),
            activeInps.reduce((sum, i) => sum + i.stickY * 2.1, 0),
          );
          if (grossDist > 0 && netDist < grossDist * 0.85) {
            const cancelPct = Math.round((1 - netDist / grossDist) * 100);
            cancellationHtml = `<div class="di-cancel-warning">${tr.diCancellationNotice(Math.round(grossDist), Math.round(netDist), cancelPct)}</div>`;
          }
        }
      }

      const pipsHtml = h.inputs
        .map((inp) => {
          const activeClass = inp.isActivation
            ? h.inputCount >= 2
              ? "active-strong"
              : "active"
            : "";
          const pipGlyph = inp.isActivation ? glyph : "·";
          return `<span class="di-stick-pip ${activeClass}" data-frame="${inp.frameIndex}" title="Hitlag F+${inp.hitlagFrame}: Stick (${inp.stickX}, ${inp.stickY})">${pipGlyph}</span>`;
        })
        .join("");

      detail.innerHTML = `
        <div class="di-live-details">
          <div class="di-live-detail-item">
            <span class="di-live-label">Victim / Attacker</span>
            <span class="di-live-val">${victimName} ← ${attackerName}</span>
          </div>
          <div class="di-live-detail-item">
            <span class="di-live-label">Damage & Hitlag</span>
            <span class="di-live-val">+${Math.round(h.damageDealt)}% (${h.diWindowFrames}F window)</span>
          </div>
          <div class="di-live-detail-item">
            <span class="di-live-label">Displacement</span>
            <span class="di-live-val">${Math.round(h.displacement.distance)}u shift (${h.cardinal})</span>
          </div>
          <div class="di-live-detail-item">
            <span class="di-live-label">Efficiency</span>
            <span class="di-live-val">${h.efficiency}%</span>
          </div>
        </div>
        ${cancellationHtml}
        ${
          h.inputs.length > 0
            ? `
          <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px;">
            <span class="di-live-label">Hitlag Stick Timeline (${h.inputs.length}F):</span>
            <div class="di-stick-strip">${pipsHtml}</div>
          </div>
        `
            : ""
        }
      `;

      const pipEls = detail.querySelectorAll<HTMLElement>(".di-stick-pip");
      pipEls.forEach((pipEl) => {
        const frameIdx = Number(pipEl.dataset.frame);
        pipEl.addEventListener("click", (e) => {
          e.stopPropagation();
          this.dismissQuickAttackOverlay();
          this.playback?.seek(frameIdx);
          this.playback?.pause();
        });
      });

      row.addEventListener("click", () => {
        this.dismissQuickAttackOverlay();
        if (this.selectedDIHitId === h.id && !detail.hidden) {
          this.selectedDIHitId = null;
          itemWrap.classList.remove("selected");
          detail.hidden = true;
        } else {
          this.selectedDIHitId = h.id;
          const allWrappers =
            this.diList.querySelectorAll<HTMLElement>(".di-item-wrapper");
          allWrappers.forEach((w) => {
            const isMatch = w.dataset.hitId === h.id;
            w.classList.toggle("selected", isMatch);
            const d = w.querySelector<HTMLElement>(".di-inline-detail");
            if (d) d.hidden = !isMatch;
          });
          this.playback?.seek(h.hitFrameIndex);
          this.playback?.play();
        }
      });

      itemWrap.appendChild(row);
      itemWrap.appendChild(detail);
      this.diList.appendChild(itemWrap);
    });

    this.updateDILiveMonitor(this.playback?.currentIndex ?? 0);
  }

  private updateDILiveMonitor(frameIndex: number): void {
    if (!this.currentReplay || this.diEvents.length === 0) return;

    const filteredHits =
      this.perspectivePort !== null
        ? this.diEvents.filter((h) => h.victimPort === this.perspectivePort)
        : this.diEvents;

    // Find if a hit is currently active in hitlag or initial knockback (within 22 frames of hitlag end)
    const activeHit = filteredHits.find(
      (h) =>
        frameIndex >= h.hitFrameIndex &&
        frameIndex <= h.endHitlagFrameIndex + 22,
    );

    const allWrappers =
      this.diList.querySelectorAll<HTMLElement>(".di-item-wrapper");

    allWrappers.forEach((wrap) => {
      const hitId = wrap.dataset.hitId;
      const isSelected = this.selectedDIHitId === hitId;
      const isActiveHit = Boolean(activeHit && activeHit.id === hitId);
      const detail = wrap.querySelector<HTMLElement>(".di-inline-detail");

      wrap.classList.toggle("active-playing", isActiveHit);
      if (detail) {
        detail.hidden = !isSelected && !isActiveHit;
      }

      if (isActiveHit && detail) {
        const pips = detail.querySelectorAll<HTMLElement>(".di-stick-pip");
        pips.forEach((pip) => {
          const pipFrame = Number(pip.dataset.frame);
          if (pipFrame === frameIndex) {
            pip.style.borderColor = "#ffffff";
            pip.style.outline = "1px solid #ffffff";
          } else {
            pip.style.borderColor = "";
            pip.style.outline = "";
          }
        });
      }
    });
  }

  private renderCharacterMetaPanel(replay: Replay): void {
    const tr = t();
    if (this.perspectivePort === null) {
      this.characterMetaWidget.hidden = true;
      return;
    }

    const charId = replay.gameStart.ports[this.perspectivePort]?.characterId;
    if (charId === undefined) {
      this.characterMetaWidget.hidden = true;
      return;
    }

    const iconicColor = getCharacterIconicColor(charId);
    this.characterMetaWidget.style.setProperty(
      "--char-iconic-color",
      iconicColor,
    );

    if (isJigglypuffCharacter(charId)) {
      this.characterMetaWidget.hidden = false;
      this.characterMetaHeaderTitle.textContent = tr.characterMetaTitle(
        characterName(charId),
      );
      this.characterMetaPanel.innerHTML = "";

      const puffEvents = this.matchEvents.filter(
        (ev): ev is JigglypuffFThrowEvent =>
          ev.kind === "fthrow-entered" ||
          ev.kind === "fthrow-success" ||
          ev.kind === "fthrow-failure",
      );
      const stats = computeJigglypuffFThrowStats(
        puffEvents,
        this.perspectivePort,
      );

      const row = document.createElement("div");
      row.className = "stat-row";

      const lbl = document.createElement("div");
      lbl.className = "stat-row-label";
      lbl.textContent = tr.fthrowFollowup;

      const val = document.createElement("div");
      val.className = "stat-row-value";

      const pctSpan = document.createElement("span");
      pctSpan.className = `stat-pct ${stats.totalThrows > 0 ? "pct-success" : ""}`;
      pctSpan.textContent =
        stats.followupRate !== null
          ? `${Math.round(stats.followupRate)}%`
          : "—";
      val.appendChild(pctSpan);

      if (stats.totalThrows > 0) {
        val.append(
          `  ${tr.fthrowFollowupSummary(stats.followupSuccesses, stats.totalThrows, stats.noFollowups)}`,
        );
      } else {
        val.append(`  ${tr.noFthrows}`);
      }

      row.appendChild(lbl);
      row.appendChild(val);
      this.characterMetaPanel.appendChild(row);

      const puffSituations = getJigglypuffFThrowSituations(
        puffEvents,
        this.perspectivePort,
      );

      if (puffSituations.length > 0) {
        const listEl = document.createElement("div");
        listEl.className = "situation-list";

        puffSituations.forEach((sit, idx) => {
          const itemRow = document.createElement("div");
          itemRow.className = "situation-row";

          const indexEl = document.createElement("span");
          indexEl.className = "situation-index";
          indexEl.textContent = `#${idx + 1}`;

          const timeEl = document.createElement("span");
          timeEl.className = "situation-time";
          timeEl.textContent = `${formatElapsed(sit.enteredFrameIndex)} (${sit.enteredFrameIndex}F)`;

          const badgeEl = document.createElement("span");
          if (sit.outcome === "success") {
            badgeEl.className = "situation-badge success";
            badgeEl.textContent = tr.fthrowSuccessBadge;
          } else if (sit.outcome === "failure") {
            badgeEl.className = "situation-badge failure";
            badgeEl.textContent = tr.fthrowFailureBadge;
          } else {
            badgeEl.className = "situation-badge open";
            badgeEl.textContent = tr.situationOpenBadge;
          }

          itemRow.appendChild(indexEl);
          itemRow.appendChild(timeEl);
          itemRow.appendChild(badgeEl);

          itemRow.addEventListener("click", () => {
            this.dismissQuickAttackOverlay();
            const targetFrameIndex = Math.max(0, sit.enteredFrameIndex - 90);
            this.playback?.seek(targetFrameIndex);
            this.playback?.play();
          });

          listEl.appendChild(itemRow);
        });

        this.characterMetaPanel.appendChild(listEl);
      }
      return;
    }

    if (isNessCharacter(charId) || isYoshiCharacter(charId)) {
      this.characterMetaWidget.hidden = false;
      this.characterMetaHeaderTitle.textContent = tr.characterMetaTitle(
        characterName(charId),
      );
      this.characterMetaPanel.innerHTML = "";

      const shieldEvents = this.matchEvents.filter(
        (ev): ev is ShieldPressureEvent =>
          ev.kind === "shield-pressure-entered" ||
          ev.kind === "shield-break" ||
          ev.kind === "shield-grab" ||
          ev.kind === "shield-escape",
      );
      const stats = computeShieldPressureStats(
        shieldEvents,
        this.perspectivePort,
      );

      const row = document.createElement("div");
      row.className = "stat-row";

      const lbl = document.createElement("div");
      lbl.className = "stat-row-label";
      lbl.textContent = tr.shieldPressureTwoHits;

      const val = document.createElement("div");
      val.className = "stat-row-value";

      const pctSpan = document.createElement("span");
      pctSpan.className = `stat-pct ${stats.totalPressures > 0 ? "pct-success" : ""}`;
      pctSpan.textContent =
        stats.conversionRate !== null
          ? `${Math.round(stats.conversionRate)}%`
          : "—";
      val.appendChild(pctSpan);

      if (stats.totalPressures > 0) {
        val.append(
          `  ${tr.shieldPressureBreakdown(
            stats.shieldBreaks,
            stats.grabs,
            stats.neither,
            stats.totalPressures,
          )}`,
        );
      } else {
        val.append(`  ${tr.noShieldPressures}`);
      }

      row.appendChild(lbl);
      row.appendChild(val);
      this.characterMetaPanel.appendChild(row);

      const shieldSituations = getShieldPressureSituations(
        shieldEvents,
        this.perspectivePort,
      );

      if (shieldSituations.length > 0) {
        const listEl = document.createElement("div");
        listEl.className = "situation-list";

        shieldSituations.forEach((sit, idx) => {
          const itemRow = document.createElement("div");
          itemRow.className = "situation-row";

          const indexEl = document.createElement("span");
          indexEl.className = "situation-index";
          indexEl.textContent = `#${idx + 1}`;

          const timeEl = document.createElement("span");
          timeEl.className = "situation-time";
          timeEl.textContent = `${formatElapsed(sit.enteredFrameIndex)} (${sit.enteredFrameIndex}F)`;

          const hitsEl = document.createElement("span");
          hitsEl.className = "situation-bracket bracket-under100";
          hitsEl.textContent = tr.hitsUnit(sit.hitsOnShield);

          const badgeEl = document.createElement("span");
          if (sit.outcome === "shield-break") {
            badgeEl.className = "situation-badge success";
            badgeEl.textContent = tr.shieldBreakBadge;
          } else if (sit.outcome === "shield-grab") {
            badgeEl.className = "situation-badge success";
            badgeEl.textContent = tr.shieldGrabBadge;
          } else if (sit.outcome === "shield-escape") {
            badgeEl.className = "situation-badge failure";
            badgeEl.textContent = tr.shieldEscapeBadge;
          } else {
            badgeEl.className = "situation-badge open";
            badgeEl.textContent = tr.situationOpenBadge;
          }

          itemRow.appendChild(indexEl);
          itemRow.appendChild(timeEl);
          itemRow.appendChild(hitsEl);
          itemRow.appendChild(badgeEl);

          itemRow.addEventListener("click", () => {
            this.dismissQuickAttackOverlay();
            const targetFrameIndex = Math.max(0, sit.enteredFrameIndex - 90);
            this.playback?.seek(targetFrameIndex);
            this.playback?.play();
          });

          listEl.appendChild(itemRow);
        });

        this.characterMetaPanel.appendChild(listEl);
      }
      return;
    }

    if (isPikachuCharacter(charId)) {
      this.characterMetaWidget.hidden = false;
      this.characterMetaHeaderTitle.textContent = tr.characterMetaTitle(
        characterName(charId),
      );
      this.characterMetaPanel.innerHTML = "";

      const pikaPaths = extractAllQuickAttackPaths(
        replay,
        this.perspectivePort,
        true,
      );

      const isOverlayActive = this.stageRenderer.isQuickAttackOverlayActive();
      if (this.qaOverlayExitBtn) {
        this.qaOverlayExitBtn.hidden = !isOverlayActive;
      }

      const toggleBtn = document.createElement("button");
      toggleBtn.className = `qa-overlay-btn ${isOverlayActive ? "active" : ""}`;
      toggleBtn.textContent = isOverlayActive
        ? tr.hideQuickAttackOverlayBtn
        : tr.overlayQuickAttackBtn;

      toggleBtn.addEventListener("click", () => {
        if (this.stageRenderer.isQuickAttackOverlayActive()) {
          this.dismissQuickAttackOverlay();
        } else {
          this.playback?.pause();
          this.stageRenderer.setQuickAttackOverlay(pikaPaths);
          this.stageRenderer.setHoveredQuickAttackIndex(null);
          if (this.qaOverlayExitBtn) {
            this.qaOverlayExitBtn.hidden = false;
          }
          this.renderCharacterMetaPanel(replay);
          if (this.lastFrame !== undefined) {
            const currIdx = this.playback?.currentIndex ?? 0;
            this.renderFrame(this.lastFrame, currIdx, true);
          }
        }
      });

      this.characterMetaPanel.appendChild(toggleBtn);

      if (isOverlayActive && pikaPaths.length > 0) {
        const listEl = document.createElement("div");
        listEl.className = "situation-list qa-overlay-list";

        pikaPaths.forEach((path) => {
          const itemRow = document.createElement("div");
          itemRow.className = "situation-row";

          const indexEl = document.createElement("span");
          indexEl.className = "situation-index";
          indexEl.textContent = `#${path.index}`;

          const timeEl = document.createElement("span");
          timeEl.className = "situation-time";
          timeEl.textContent = `${formatElapsed(path.startFrameIndex)} (${path.startFrame}F)`;

          const zipsEl = document.createElement("span");
          zipsEl.className = "situation-bracket bracket-under100";
          zipsEl.textContent = `${path.zipCount} ${path.zipCount === 1 ? "zip" : "zips"}`;

          itemRow.appendChild(indexEl);
          itemRow.appendChild(timeEl);
          itemRow.appendChild(zipsEl);

          itemRow.addEventListener("mouseenter", () => {
            this.stageRenderer.setHoveredQuickAttackIndex(path.index);
            if (this.lastFrame !== undefined) {
              const currIdx = this.playback?.currentIndex ?? 0;
              this.renderFrame(this.lastFrame, currIdx, false);
            }
          });

          itemRow.addEventListener("mouseleave", () => {
            this.stageRenderer.setHoveredQuickAttackIndex(null);
            if (this.lastFrame !== undefined) {
              const currIdx = this.playback?.currentIndex ?? 0;
              this.renderFrame(this.lastFrame, currIdx, false);
            }
          });

          itemRow.addEventListener("click", () => {
            this.dismissQuickAttackOverlay();
            const targetFrameIndex = Math.max(0, path.startFrameIndex - 30);
            this.playback?.seek(targetFrameIndex);
            this.playback?.play();
          });

          listEl.appendChild(itemRow);
        });

        this.characterMetaPanel.appendChild(listEl);
      }
      return;
    }

    this.characterMetaWidget.hidden = true;
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
    this.updateDILiveMonitor(index);
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
    this.diEvents = extractAllHitsWithDI(replay);
    const edgeEvents = computeEdgeGuardEvents(replay);
    const ledgeEvents = computeLedgeTrapEvents(replay);
    const angelEvents = computeAngelInvincibilityEvents(replay);
    const neutralEvents = computeNeutralHitEvents(replay);
    const puffEvents = computeJigglypuffFThrowEvents(replay);
    const shieldEvents = computeShieldPressureEvents(replay);
    this.matchEvents = [
      ...edgeEvents,
      ...ledgeEvents,
      ...angelEvents,
      ...neutralEvents,
      ...puffEvents,
      ...shieldEvents,
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
    this.stageRenderer.setQuickAttackOverlay(null);
    this.stageRenderer.setHoveredQuickAttackIndex(null);
    if (this.qaOverlayExitBtn) {
      this.qaOverlayExitBtn.hidden = true;
    }
    this.camera = new Camera(width, height);

    this.buildPlayerPanels(replay);
    this.buildPerspectiveToggle(replay);
    this.renderStatsPanel(replay);
    this.renderDIPanel(replay);
    this.renderCharacterMetaPanel(replay);
    this.renderLogFilterWidget();
    this.renderReplayInfo(loaded);
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

  private renderReplayInfo(loaded: LoadedReplay | null): void {
    if (!loaded) {
      this.replayInfoWidget.hidden = true;
      return;
    }
    this.replayInfoWidget.hidden = false;
    this.replayInfoFileName.textContent = loaded.sourceName;
    this.replayInfoFileName.title = loaded.sourceName;

    const d = loaded.recordedAt;
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const hh = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    const localStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    this.replayInfoDateLocal.textContent = localStr;
    this.replayInfoDateLocal.title = `UTC: ${d.toISOString().replace(".000Z", "Z").replace("T", " ")}`;
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
