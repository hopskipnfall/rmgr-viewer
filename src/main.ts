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
import { computeNeutralHitsPerStock } from "./neutralHits.js";
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

const stageRenderer = new StageRenderer(stageCanvas);

interface PlayerPanel {
  port: PortIndex;
  pad: ControllerPad;
  damageEl: HTMLElement;
  stocksEl: HTMLElement;
  stateEl: HTMLElement;
  positionEl: HTMLElement;
  neutralHitsEl: HTMLElement;
}

let camera: Camera;
let currentReplay: Replay | null = null;
let panels: PlayerPanel[] = [];
let playback: PlaybackController | null = null;
let lastFrame: Frame | undefined;
let hoverScreen: { x: number; y: number } | undefined;
let neutralHitsPerStock: Partial<Record<PortIndex, readonly number[]>> = {};

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
        <div class="full-row">Neutral hits this stock: <strong class="stat-neutral-hits">—</strong></div>
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
      neutralHitsEl: panel.querySelector(".stat-neutral-hits") as HTMLElement,
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
      panel.neutralHitsEl.textContent = "—";
      panel.pad.render(undefined);
      continue;
    }
    const { post, pre } = portData;
    panel.damageEl.textContent = `${post.damagePercent}%`;
    panel.stocksEl.textContent = String(post.stocksRemaining + 1);
    panel.stateEl.textContent = actionStateName(post.actionStateId);
    panel.positionEl.textContent = `(${post.positionX.toFixed(1)}, ${post.positionY.toFixed(1)})`;
    panel.neutralHitsEl.textContent = String(
      neutralHitsPerStock[panel.port]?.[frameIndex] ?? 0,
    );
    panel.pad.render(pre);
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
  const { replay, sourceName, recordedAt } = loaded;
  currentReplay = replay;
  neutralHitsPerStock = computeNeutralHitsPerStock(replay);

  const rect = stageWrap.getBoundingClientRect();
  const width = Math.max(200, Math.floor(rect.width));
  const height = Math.max(150, Math.floor(rect.height));
  stageRenderer.resize(width, height);
  camera = new Camera(width, height);

  buildPlayerPanels(replay);

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
    const url = `${import.meta.env.BASE_URL}replays/20260825-105731-Wario-Player.rmgr`;
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
