import type { EdgeGuardSituationData } from "./edgeGuardData.js";
import { Camera } from "../camera.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";
import { drawStage } from "../renderer/stage/stageGeometry.js";
import { drawGridBackground } from "../renderer/stage/backgrounds/gridBackground.js";

export type GridTheme = "day" | "night";

export interface CanvasCallbacks {
  readonly onHoverSituation?: (
    situation: EdgeGuardSituationData | null,
    screenPos: { x: number; y: number } | null,
  ) => void;
  readonly onSelectSituation?: (situation: EdgeGuardSituationData) => void;
}

export class EdgeGuardCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private isLight: boolean = false;
  private situations: readonly EdgeGuardSituationData[] = [];
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private showTrails: boolean = true;
  private playbackFrame: number | null = null; // null = show start positions only
  private callbacks: CanvasCallbacks;

  private initializedView = false;
  private cameraDragging = false;
  private dragMoved = false;
  private dragStartX = 0;
  private dragStartY = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: CanvasCallbacks = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.camera = new Camera(
      Math.max(100, canvas.width || 800),
      Math.max(100, canvas.height || 600),
    );

    this.setupEventListeners();
  }

  public setIsLight(isLight: boolean): void {
    if (this.isLight !== isLight) {
      this.isLight = isLight;
      this.draw();
    }
  }

  public getIsLight(): boolean {
    return this.isLight;
  }

  public setTheme(theme: GridTheme): void {
    this.setIsLight(theme === "day");
  }

  public getTheme(): GridTheme {
    return this.isLight ? "day" : "night";
  }

  public setShowTrails(show: boolean): void {
    this.showTrails = show;
    this.draw();
  }

  public setSituations(situations: readonly EdgeGuardSituationData[]): void {
    this.situations = situations;
    this.draw();
  }

  public setHoveredId(id: string | null): void {
    if (this.hoveredId !== id) {
      this.hoveredId = id;
      this.draw();
    }
  }

  public setSelectedId(id: string | null): void {
    if (this.selectedId !== id) {
      this.selectedId = id;
      this.draw();
    }
  }

  public setPlaybackFrame(frame: number | null): void {
    this.playbackFrame = frame;
    this.draw();
  }

  /** Frames the right side of Dream Land and edge guard recovery area. */
  public recenterCamera(): void {
    this.camera.unlockView();
    // Frame Dream Land right side & recovery zone:
    // Dream Land ground: x = -2318 to 2318, Y = 0.
    // Right blast zone: x = 9000, Y bounds = -3500 to 8300.
    // With Camera's 0.3 padding around (0, -2200) to (7800, 5800):
    // Center is (3900, 1800), spanX = 7800, padX = 2340 -> frames x from -2340 to 10140.
    // This cleanly puts stage center (x = 0) on the left and right blast zone (x = 9000) on the right.
    this.camera.update(
      [
        { x: 0, y: -2200 },
        { x: 7800, y: 5800 },
      ],
      true,
    );
    this.camera.lockView();
    this.draw();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const width = Math.max(200, Math.floor(rect.width));
    const height = Math.max(150, Math.floor(rect.height));
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);

    if (!this.initializedView) {
      this.recenterCamera();
      this.initializedView = true;
    } else {
      this.draw();
    }
  }

  public worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return this.camera.worldToScreen(wx, wy);
  }

  public screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return this.camera.screenToWorld(sx, sy);
  }

  private setupEventListeners(): void {
    this.canvas.style.cursor = "grab";

    // Mouse drag to pan
    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      this.cameraDragging = true;
      this.dragMoved = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.canvas.style.cursor = "grabbing";
    });

    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", (e) => {
        if (this.cameraDragging) {
          const dx = e.clientX - this.dragStartX;
          const dy = e.clientY - this.dragStartY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            this.dragMoved = true;
          }
          this.camera.panByScreenDelta(e.movementX, e.movementY);
          this.draw();
          return;
        }

        // Check hover when not dragging
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (
          mouseX < 0 ||
          mouseX > rect.width ||
          mouseY < 0 ||
          mouseY > rect.height
        ) {
          if (this.hoveredId !== null) {
            this.hoveredId = null;
            this.callbacks.onHoverSituation?.(null, null);
            this.draw();
          }
          return;
        }

        const closest = this.findClosestSituation(mouseX, mouseY, 16);
        if (closest) {
          this.hoveredId = closest.id;
          this.canvas.style.cursor = "pointer";
          this.callbacks.onHoverSituation?.(closest, {
            x: e.clientX,
            y: e.clientY,
          });
        } else {
          if (this.hoveredId !== null) {
            this.hoveredId = null;
            this.callbacks.onHoverSituation?.(null, null);
          }
          this.canvas.style.cursor = "grab";
        }
        this.draw();
      });

      window.addEventListener("mouseup", () => {
        if (this.cameraDragging) {
          this.cameraDragging = false;
          this.canvas.style.cursor = this.hoveredId ? "pointer" : "grab";
        }
      });
    }

    // Mouse wheel to zoom anchored at cursor
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const clampedDeltaY = Math.max(-100, Math.min(100, e.deltaY));
        const factor = Math.exp(-clampedDeltaY * 0.0015);
        this.camera.zoomAtScreenPoint(factor, screenX, screenY);
        this.draw();
      },
      { passive: false },
    );

    // Click on canvas to select a situation
    this.canvas.addEventListener("click", (e) => {
      if (this.dragMoved) {
        this.dragMoved = false;
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const closest = this.findClosestSituation(mouseX, mouseY, 16);
      if (closest) {
        this.selectedId = closest.id;
        this.callbacks.onSelectSituation?.(closest);
        this.draw();
      }
    });

    this.canvas.addEventListener("mouseleave", () => {
      if (this.hoveredId !== null) {
        this.hoveredId = null;
        this.callbacks.onHoverSituation?.(null, null);
        this.draw();
      }
    });
  }

  private findClosestSituation(
    sx: number,
    sy: number,
    maxRadiusPx: number,
  ): EdgeGuardSituationData | null {
    let closest: EdgeGuardSituationData | null = null;
    let minDistSq = maxRadiusPx * maxRadiusPx;

    for (const sit of this.situations) {
      // If playback is active, test current position; otherwise test starting position
      let ptX = sit.startX;
      let ptY = sit.startY;
      if (this.playbackFrame !== null && sit.trajectory.length > 0) {
        const idx = Math.min(this.playbackFrame, sit.trajectory.length - 1);
        const t = sit.trajectory[idx];
        if (t) {
          ptX = t.x;
          ptY = t.y;
        }
      }
      const s = this.worldToScreen(ptX, ptY);
      const dx = s.x - sx;
      const dy = s.y - sy;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = sit;
      }
    }

    return closest;
  }

  public draw(): void {
    const { ctx, canvas } = this;
    if (canvas.width === 0 || canvas.height === 0) return;

    const isLight = this.isLight;

    // 1. Exact Replay Grid Background
    drawGridBackground(ctx, canvas, isLight);

    // 2. Blast Zones & Guides (dashed lines without text labels)
    this.drawBlastZones(isLight);

    // 3. Exact Replay Stage Geometry (Dream Land platforms, slopes, ribs, silhouette, ledges)
    drawStage(
      ctx,
      this.camera,
      DREAM_LAND_STAGE_ID,
      0,
      "grid",
      isLight,
      canvas,
    );

    // 4. Trajectories (win/success blue, fail red)
    this.drawTrajectories(isLight);

    // 5. Recovery Points / Simultaneous Playback Ghosts
    this.drawSituationPoints(isLight);
  }

  private drawBlastZones(isLight: boolean): void {
    const { ctx } = this;

    // Center / Mirror line at x = 0
    const topCenter = this.worldToScreen(0, 8300);
    const bottomCenter = this.worldToScreen(0, -3500);

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isLight
      ? "rgba(100, 116, 139, 0.45)"
      : "rgba(148, 163, 184, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(topCenter.x, topCenter.y);
    ctx.lineTo(bottomCenter.x, bottomCenter.y);
    ctx.stroke();

    // Blast zone boundaries (x = 9000, y = 8300, y = -3500)
    const rightTop = this.worldToScreen(9000, 8300);
    const rightBottom = this.worldToScreen(9000, -3500);

    ctx.strokeStyle = isLight
      ? "rgba(239, 68, 68, 0.4)"
      : "rgba(239, 68, 68, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    // Top blast line
    ctx.moveTo(topCenter.x, topCenter.y);
    ctx.lineTo(rightTop.x, rightTop.y);
    // Right blast line
    ctx.lineTo(rightBottom.x, rightBottom.y);
    // Bottom blast line
    ctx.lineTo(bottomCenter.x, bottomCenter.y);
    ctx.stroke();

    ctx.restore();
  }

  private drawTrajectories(isLight: boolean): void {
    const { ctx } = this;

    for (const sit of this.situations) {
      const isHovered = sit.id === this.hoveredId;
      const isSelected = sit.id === this.selectedId;

      if (!this.showTrails && !isHovered && !isSelected) {
        continue;
      }

      if (sit.trajectory.length < 2) continue;

      const isSuccess = sit.outcome === "success";
      // Success (KO): Blue
      // Failure (Safe): Red
      let strokeStyle: string;
      const alpha = isHovered || isSelected ? 0.95 : 0.28;

      if (isSuccess) {
        strokeStyle = isLight
          ? `rgba(2, 132, 199, ${alpha})`
          : `rgba(56, 189, 248, ${alpha})`;
      } else {
        strokeStyle = isLight
          ? `rgba(220, 38, 38, ${alpha})`
          : `rgba(248, 113, 113, ${alpha})`;
      }

      ctx.save();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = isHovered || isSelected ? 2.5 : 1.5;

      // Limit trajectory to playbackFrame if active
      const maxPts =
        this.playbackFrame !== null
          ? Math.min(sit.trajectory.length, this.playbackFrame + 1)
          : sit.trajectory.length;

      ctx.beginPath();
      const p0 = this.worldToScreen(sit.trajectory[0]!.x, sit.trajectory[0]!.y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < maxPts; i++) {
        const pt = sit.trajectory[i]!;
        const p = this.worldToScreen(pt.x, pt.y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // If hovered or selected, draw end marker
      if ((isHovered || isSelected) && maxPts > 1) {
        const lastPt = sit.trajectory[maxPts - 1]!;
        const pEnd = this.worldToScreen(lastPt.x, lastPt.y);
        ctx.fillStyle = isSuccess
          ? isLight
            ? "#0284c7"
            : "#38bdf8"
          : isLight
            ? "#dc2626"
            : "#f87171";
        ctx.beginPath();
        ctx.arc(pEnd.x, pEnd.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawSituationPoints(isLight: boolean): void {
    // Draw regular points first, then hovered/selected on top
    const regular: EdgeGuardSituationData[] = [];
    let priority: EdgeGuardSituationData | null = null;

    for (const sit of this.situations) {
      if (sit.id === this.hoveredId || sit.id === this.selectedId) {
        priority = sit;
      } else {
        regular.push(sit);
      }
    }

    for (const sit of regular) {
      this.drawSinglePoint(sit, false, isLight);
    }
    if (priority) {
      this.drawSinglePoint(priority, true, isLight);
    }
  }

  private drawSinglePoint(
    sit: EdgeGuardSituationData,
    isPriority: boolean,
    isLight: boolean,
  ): void {
    const { ctx } = this;
    const isSuccess = sit.outcome === "success";

    // Position: current playback frame if playing, otherwise starting position
    let ptX = sit.startX;
    let ptY = sit.startY;
    if (this.playbackFrame !== null && sit.trajectory.length > 0) {
      const idx = Math.min(this.playbackFrame, sit.trajectory.length - 1);
      const t = sit.trajectory[idx];
      if (t) {
        ptX = t.x;
        ptY = t.y;
      }
    }

    const s = this.worldToScreen(ptX, ptY);

    // App standard colors:
    // Success (KO): Blue (#38bdf8 in dark, #0284c7 in light)
    // Fail (Safe): Red (#f87171 in dark, #dc2626 in light)
    const fillColor = isSuccess
      ? isLight
        ? "#0284c7"
        : "#38bdf8"
      : isLight
        ? "#dc2626"
        : "#f87171";

    const radius = isPriority ? 8 : 4.5;

    ctx.save();
    if (isPriority) {
      // Glow halo
      ctx.shadowColor = isSuccess ? "#38bdf8" : "#f87171";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = isLight
        ? "rgba(15, 23, 42, 0.45)"
        : "rgba(0, 0, 0, 0.65)";
      ctx.lineWidth = 1;
    }

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // If priority, draw small jumps indicator badge
    if (isPriority) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = isLight ? "#0f172a" : "#f8fafc";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      const outcomeText = isSuccess ? "KO" : "SAFE";
      const label = `${outcomeText} (${sit.jumpsAtEntry}J)`;
      ctx.fillText(label, s.x, s.y - 12);
    }

    ctx.restore();
  }
}
