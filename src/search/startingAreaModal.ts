import { t } from "../i18n.js";
import { stageGeometry, DREAM_LAND_STAGE_ID } from "../stageGeometry.js";
import type { StartingAreaBox } from "../playlist.js";

// The modal only shows/allows selecting the right half (x >= 0) of Dream
// Land's blast zone - the caller mirrors the saved box across x=0 to also
// match recoveries on the left, so the user only ever has to draw one side.
const WORLD_MIN_X = 0;
const WORLD_MAX_X = 9000;
const WORLD_MIN_Y = -3500;
const WORLD_MAX_Y = 8300;

const CANVAS_WIDTH = 380;
const CANVAS_HEIGHT = 500;
const PADDING = 16;

function worldScale(): number {
  return Math.min(
    (CANVAS_WIDTH - PADDING * 2) / (WORLD_MAX_X - WORLD_MIN_X),
    (CANVAS_HEIGHT - PADDING * 2) / (WORLD_MAX_Y - WORLD_MIN_Y),
  );
}

function worldToScreen(x: number, y: number): { x: number; y: number } {
  const scale = worldScale();
  return {
    x: PADDING + (x - WORLD_MIN_X) * scale,
    y: CANVAS_HEIGHT - PADDING - (y - WORLD_MIN_Y) * scale,
  };
}

function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  const scale = worldScale();
  return {
    x: WORLD_MIN_X + (sx - PADDING) / scale,
    y: WORLD_MIN_Y + (CANVAS_HEIGHT - PADDING - sy) / scale,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  dragRectScreen: { x0: number; y0: number; x1: number; y1: number } | null,
): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Reference geometry: ground + platforms (right half only), for orientation.
  const platforms = stageGeometry(DREAM_LAND_STAGE_ID) ?? [];
  ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
  ctx.lineWidth = 2;
  for (const p of platforms) {
    if (p.rightX <= 0) continue;
    const left = worldToScreen(Math.max(0, p.leftX), p.y);
    const right = worldToScreen(p.rightX, p.y);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  // Stage center (x=0) reference line.
  const centerTop = worldToScreen(0, WORLD_MAX_Y);
  const centerBottom = worldToScreen(0, WORLD_MIN_Y);
  ctx.strokeStyle = "rgba(96, 165, 250, 0.5)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(centerTop.x, centerTop.y);
  ctx.lineTo(centerBottom.x, centerBottom.y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (dragRectScreen) {
    const x = Math.min(dragRectScreen.x0, dragRectScreen.x1);
    const y = Math.min(dragRectScreen.y0, dragRectScreen.y1);
    const w = Math.abs(dragRectScreen.x1 - dragRectScreen.x0);
    const h = Math.abs(dragRectScreen.y1 - dragRectScreen.y0);
    ctx.fillStyle = "rgba(168, 85, 247, 0.25)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(216, 180, 254, 0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Opens a click-and-drag box picker over Dream Land's right half
 * (x ∈ [0, 9000], the full blast zone width on that side) for the
 * "recovery starting position" search filter. Resolves with the drawn box
 * in world coordinates on Save, or null on Cancel/close/backdrop click.
 * The caller is expected to also match the box mirrored across x=0 -
 * see computeEdgeGuardClips()'s own handling of StartingAreaBox.
 */
export function openStartingAreaModal(
  modalContainer: HTMLElement,
  initial: StartingAreaBox | null,
): Promise<StartingAreaBox | null> {
  return new Promise((resolve) => {
    const tr = t();
    modalContainer.hidden = false;
    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="areaModalBackdrop"></div>
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>${escapeHtml(tr.startingAreaModalTitle)}</h3>
          <button class="modal-close" id="areaModalCloseBtn">✕</button>
        </div>
        <p class="modal-subtitle">${escapeHtml(tr.startingAreaModalSubtitle)}</p>
        <div class="modal-body">
          <canvas
            id="areaModalCanvas"
            width="${CANVAS_WIDTH}"
            height="${CANVAS_HEIGHT}"
            class="starting-area-canvas"
          ></canvas>
        </div>
        <div class="modal-footer">
          <button id="areaModalClearBtn" class="btn-secondary">${escapeHtml(tr.startingAreaModalClear)}</button>
          <button id="areaModalCancelBtn" class="btn-secondary">${escapeHtml(tr.cancel)}</button>
          <button id="areaModalSaveBtn" class="btn-primary">${escapeHtml(tr.save)}</button>
        </div>
      </div>
    `;

    const canvas = modalContainer.querySelector(
      "#areaModalCanvas",
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;

    let box: StartingAreaBox | null = initial;
    let dragStartScreen: { x: number; y: number } | null = null;
    let dragCurrentScreen: { x: number; y: number } | null = null;

    const currentDragRect = () =>
      dragStartScreen && dragCurrentScreen
        ? {
            x0: dragStartScreen.x,
            y0: dragStartScreen.y,
            x1: dragCurrentScreen.x,
            y1: dragCurrentScreen.y,
          }
        : box
          ? (() => {
              const p0 = worldToScreen(box!.minX, box!.maxY);
              const p1 = worldToScreen(box!.maxX, box!.minY);
              return { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y };
            })()
          : null;

    const redraw = () => drawScene(ctx, currentDragRect());
    redraw();

    const canvasPoint = (e: MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clamp(e.clientX - rect.left, 0, CANVAS_WIDTH),
        y: clamp(e.clientY - rect.top, 0, CANVAS_HEIGHT),
      };
    };

    canvas.addEventListener("mousedown", (e) => {
      dragStartScreen = canvasPoint(e);
      dragCurrentScreen = dragStartScreen;
      redraw();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragStartScreen) return;
      dragCurrentScreen = canvasPoint(e);
      redraw();
    });
    window.addEventListener("mouseup", () => {
      if (!dragStartScreen || !dragCurrentScreen) return;
      const w0 = screenToWorld(dragStartScreen.x, dragStartScreen.y);
      const w1 = screenToWorld(dragCurrentScreen.x, dragCurrentScreen.y);
      box = {
        minX: clamp(Math.min(w0.x, w1.x), WORLD_MIN_X, WORLD_MAX_X),
        maxX: clamp(Math.max(w0.x, w1.x), WORLD_MIN_X, WORLD_MAX_X),
        minY: clamp(Math.min(w0.y, w1.y), WORLD_MIN_Y, WORLD_MAX_Y),
        maxY: clamp(Math.max(w0.y, w1.y), WORLD_MIN_Y, WORLD_MAX_Y),
      };
      dragStartScreen = null;
      dragCurrentScreen = null;
      redraw();
    });

    const close = (result: StartingAreaBox | null) => {
      modalContainer.hidden = true;
      modalContainer.innerHTML = "";
      resolve(result);
    };

    modalContainer
      .querySelector("#areaModalBackdrop")
      ?.addEventListener("click", () => close(initial));
    modalContainer
      .querySelector("#areaModalCloseBtn")
      ?.addEventListener("click", () => close(initial));
    modalContainer
      .querySelector("#areaModalCancelBtn")
      ?.addEventListener("click", () => close(initial));
    modalContainer
      .querySelector("#areaModalClearBtn")
      ?.addEventListener("click", () => {
        box = null;
        redraw();
      });
    modalContainer
      .querySelector("#areaModalSaveBtn")
      ?.addEventListener("click", () => close(box));
  });
}
