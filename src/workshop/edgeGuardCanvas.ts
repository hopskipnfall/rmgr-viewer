import type { EdgeGuardSituationData } from "./edgeGuardData.js";
import { drawGridBackground } from "../renderer/stage/backgrounds/gridBackground.js";
import { DREAM_LAND_RIGHT_SLOPE } from "../stageGeometry.js";

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
  private theme: GridTheme = "night";
  private situations: readonly EdgeGuardSituationData[] = [];
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private showTrails: boolean = true;
  private playbackFrame: number | null = null; // null = show start positions only
  private callbacks: CanvasCallbacks;

  // World bounds for the right half of Dream Land
  private readonly worldMinX = -600;
  private readonly worldMaxX = 9600;
  private readonly worldMinY = -4000;
  private readonly worldMaxY = 8800;

  // Viewport scale & offset
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: CanvasCallbacks = {},
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.callbacks = callbacks;

    this.setupEventListeners();
  }

  public setTheme(theme: GridTheme): void {
    this.theme = theme;
    this.draw();
  }

  public getTheme(): GridTheme {
    return this.theme;
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

  private getDpr(): number {
    return (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = this.getDpr();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.updateTransform();
    this.draw();
  }

  private updateTransform(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const worldW = this.worldMaxX - this.worldMinX;
    const worldH = this.worldMaxY - this.worldMinY;

    const pad = 24 * this.getDpr();
    const availW = w - 2 * pad;
    const availH = h - 2 * pad;

    this.scale = Math.min(availW / worldW, availH / worldH);
    // Center horizontally and vertically within available area
    const drawnW = worldW * this.scale;
    const drawnH = worldH * this.scale;
    this.offsetX = pad + (availW - drawnW) / 2;
    this.offsetY = pad + (availH - drawnH) / 2;
  }

  public worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const sx = this.offsetX + (wx - this.worldMinX) * this.scale;
    // Y is inverted: Smash +Y is up, Canvas +Y is down
    const sy = this.canvas.height - (this.offsetY + (wy - this.worldMinY) * this.scale);
    return { x: sx, y: sy };
  }

  public screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const wx = this.worldMinX + (sx - this.offsetX) / this.scale;
    const wy =
      this.worldMinY + (this.canvas.height - sy - this.offsetY) / this.scale;
    return { x: wx, y: wy };
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = this.getDpr();
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;

      const closest = this.findClosestSituation(mouseX, mouseY, 18 * dpr);
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
          this.canvas.style.cursor = "default";
          this.callbacks.onHoverSituation?.(null, null);
        }
      }
      this.draw();
    });

    this.canvas.addEventListener("mouseleave", () => {
      if (this.hoveredId !== null) {
        this.hoveredId = null;
        this.callbacks.onHoverSituation?.(null, null);
        this.draw();
      }
    });

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = this.getDpr();
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;

      const closest = this.findClosestSituation(mouseX, mouseY, 18 * dpr);
      if (closest) {
        this.selectedId = closest.id;
        this.callbacks.onSelectSituation?.(closest);
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

    const isLight = this.theme === "day";

    // 1. Grid Background (using standard app grid)
    drawGridBackground(ctx, canvas, isLight);

    // 2. Blast Zones & Guides
    this.drawBlastZones(isLight);

    // 3. Stage Geometry (Right Half of Dream Land)
    this.drawStageGeometry(isLight);

    // 4. Trajectories / Trails (if enabled or if situation is hovered/selected)
    this.drawTrajectories(isLight);

    // 5. Recovery Points / Simultaneous Playback Ghosts
    this.drawSituationPoints(isLight);
  }

  private drawBlastZones(isLight: boolean): void {
    const { ctx } = this;
    const dpr = this.getDpr();

    // Center / Mirror line at x = 0
    const topCenter = this.worldToScreen(0, 8300);
    const bottomCenter = this.worldToScreen(0, -3500);

    ctx.save();
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.strokeStyle = isLight
      ? "rgba(100, 116, 139, 0.4)"
      : "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(topCenter.x, topCenter.y);
    ctx.lineTo(bottomCenter.x, bottomCenter.y);
    ctx.stroke();

    // Stage center label
    ctx.fillStyle = isLight ? "#64748b" : "#94a3b8";
    ctx.font = `600 ${10 * dpr}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("STAGE CENTER (x = 0)", topCenter.x, topCenter.y - 8 * dpr);

    // Blast zone boundaries (x = 9000, y = 8300, y = -3500)
    const rightTop = this.worldToScreen(9000, 8300);
    const rightBottom = this.worldToScreen(9000, -3500);

    ctx.strokeStyle = isLight
      ? "rgba(239, 68, 68, 0.35)"
      : "rgba(239, 68, 68, 0.25)";
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.beginPath();
    // Top blast line
    ctx.moveTo(topCenter.x, topCenter.y);
    ctx.lineTo(rightTop.x, rightTop.y);
    // Right blast line
    ctx.lineTo(rightBottom.x, rightBottom.y);
    // Bottom blast line
    ctx.lineTo(bottomCenter.x, bottomCenter.y);
    ctx.stroke();

    ctx.fillStyle = isLight ? "#ef4444" : "#f87171";
    ctx.font = `${9 * dpr}px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("RIGHT BLAST ZONE (x = 9000)", rightTop.x - 6 * dpr, rightTop.y + 14 * dpr);
    ctx.fillText("UPPER BLAST ZONE (y = 8300)", rightTop.x - 6 * dpr, rightTop.y - 6 * dpr);
    ctx.fillText("LOWER BLAST ZONE (y = -3500)", rightBottom.x - 6 * dpr, rightBottom.y + 14 * dpr);

    ctx.restore();
  }

  private drawStageGeometry(isLight: boolean): void {
    const { ctx } = this;
    const dpr = this.getDpr();

    // Stage Hull Polygon:
    // (0, 0) -> (2318, 0) -> right slope -> (1972, -1072) -> (0, -1072) -> close
    const pts = [
      { x: 0, y: 0 },
      { x: 2318, y: 0 },
      ...DREAM_LAND_RIGHT_SLOPE.slice(1),
      { x: 0, y: -1072 },
    ];

    ctx.save();
    ctx.beginPath();
    const p0 = this.worldToScreen(pts[0]!.x, pts[0]!.y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) {
      const p = this.worldToScreen(pts[i]!.x, pts[i]!.y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();

    // Hull fill
    ctx.fillStyle = isLight ? "#cbd5e1" : "#1e293b";
    ctx.fill();

    // Faceted structural ribs inside hull
    ctx.strokeStyle = isLight
      ? "rgba(100, 116, 139, 0.3)"
      : "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 1 * dpr;
    const internalRibs = [
      [{ x: 0, y: -400 }, { x: 2150, y: -600 }],
      [{ x: 0, y: -800 }, { x: 1972, y: -1072 }],
      [{ x: 1200, y: 0 }, { x: 1000, y: -1072 }],
    ];
    for (const rib of internalRibs) {
      const r0 = this.worldToScreen(rib[0]!.x, rib[0]!.y);
      const r1 = this.worldToScreen(rib[1]!.x, rib[1]!.y);
      ctx.beginPath();
      ctx.moveTo(r0.x, r0.y);
      ctx.lineTo(r1.x, r1.y);
      ctx.stroke();
    }

    // Hull outline
    ctx.strokeStyle = isLight ? "#64748b" : "#475569";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // Ground surface top edge: (0, 0) to (2318, 0)
    const g0 = this.worldToScreen(0, 0);
    const g1 = this.worldToScreen(2318, 0);
    ctx.strokeStyle = isLight ? "#0284c7" : "#38bdf8";
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(g0.x, g0.y);
    ctx.lineTo(g1.x, g1.y);
    ctx.stroke();

    // Right Ledge marker: (2318, 0)
    ctx.fillStyle = isLight ? "#f59e0b" : "#fbbf24";
    ctx.beginPath();
    ctx.arc(g1.x, g1.y, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `600 ${9 * dpr}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("LEDGE", g1.x + 6 * dpr, g1.y - 4 * dpr);

    // Right Platform: leftX: 951, rightX: 1892, y: 907
    const rp0 = this.worldToScreen(951, 907);
    const rp1 = this.worldToScreen(1892, 907);
    ctx.strokeStyle = isLight ? "#0284c7" : "#38bdf8";
    ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(rp0.x, rp0.y);
    ctx.lineTo(rp1.x, rp1.y);
    ctx.stroke();

    // Top Platform right half: leftX: 0, rightX: 570, y: 1542
    const tp0 = this.worldToScreen(0, 1542);
    const tp1 = this.worldToScreen(570, 1542);
    ctx.beginPath();
    ctx.moveTo(tp0.x, tp0.y);
    ctx.lineTo(tp1.x, tp1.y);
    ctx.stroke();

    // Platform labels
    ctx.fillStyle = isLight ? "#64748b" : "#94a3b8";
    ctx.font = `${8.5 * dpr}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("SIDE PLATFORM", (rp0.x + rp1.x) / 2, rp0.y - 5 * dpr);
    ctx.fillText("TOP PLATFORM", tp1.x / 2, tp0.y - 5 * dpr);

    ctx.restore();
  }

  private drawTrajectories(isLight: boolean): void {
    const { ctx } = this;
    const dpr = this.getDpr();

    for (const sit of this.situations) {
      const isHovered = sit.id === this.hoveredId;
      const isSelected = sit.id === this.selectedId;

      if (!this.showTrails && !isHovered && !isSelected) {
        continue;
      }

      if (sit.trajectory.length < 2) continue;

      const isSuccess = sit.outcome === "success";
      // Success (KO): Blue / cyan
      // Failure (Recovered): Red / orange
      let strokeStyle: string;
      const alpha = isHovered || isSelected ? 0.9 : 0.22;

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
      ctx.lineWidth = (isHovered || isSelected ? 2.5 : 1.2) * dpr;

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

      // If hovered or selected, draw directional arrow or end point
      if ((isHovered || isSelected) && maxPts > 1) {
        const lastPt = sit.trajectory[maxPts - 1]!;
        const pEnd = this.worldToScreen(lastPt.x, lastPt.y);
        ctx.fillStyle = isSuccess
          ? (isLight ? "#0284c7" : "#38bdf8")
          : (isLight ? "#dc2626" : "#f87171");
        ctx.beginPath();
        ctx.arc(pEnd.x, pEnd.y, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawSituationPoints(isLight: boolean): void {
    const dpr = this.getDpr();

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
      this.drawSinglePoint(sit, false, isLight, dpr);
    }
    if (priority) {
      this.drawSinglePoint(priority, true, isLight, dpr);
    }
  }

  private drawSinglePoint(
    sit: EdgeGuardSituationData,
    isPriority: boolean,
    isLight: boolean,
    dpr: number,
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

    // Base colors matching app standard
    // Success: Blue (#38bdf8 / #1d4ed8 / #60a5fa)
    // Fail: Red (#f87171 / #dc2626)
    const fillColor = isSuccess
      ? (isLight ? "#0284c7" : "#38bdf8")
      : (isLight ? "#dc2626" : "#f87171");

    const radius = (isPriority ? 8 : 4.5) * dpr;

    ctx.save();
    if (isPriority) {
      // Glow halo
      ctx.shadowColor = isSuccess ? "#38bdf8" : "#f87171";
      ctx.shadowBlur = 10 * dpr;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 * dpr;
    } else {
      ctx.strokeStyle = isLight
        ? "rgba(15, 23, 42, 0.4)"
        : "rgba(0, 0, 0, 0.6)";
      ctx.lineWidth = 1 * dpr;
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
      ctx.font = `bold ${10 * dpr}px sans-serif`;
      ctx.textAlign = "center";
      const outcomeText = isSuccess ? "KO" : "SAFE";
      const label = `${outcomeText} (${sit.jumpsAtEntry}J)`;
      ctx.fillText(label, s.x, s.y - 12 * dpr);
    }

    ctx.restore();
  }
}
