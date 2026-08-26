import { ButtonBit, hasButton, type PreFrameUpdate } from "@rmg-k/rmgr";

/** Layout of button glyphs on the pad, in drawing order. */
const BUTTON_LAYOUT: ReadonlyArray<{
  bit: number;
  label: string;
  x: number;
  y: number;
  color: string;
}> = [
  { bit: ButtonBit.A, label: "A", x: 92, y: 40, color: "#4f9fdb" },
  { bit: ButtonBit.B, label: "B", x: 74, y: 56, color: "#e0473f" },
  { bit: ButtonBit.Z, label: "Z", x: 108, y: 12, color: "#8a4fdb" },
  { bit: ButtonBit.Start, label: "S", x: 60, y: 12, color: "#cccccc" },
  { bit: ButtonBit.L, label: "L", x: 8, y: 8, color: "#999999" },
  { bit: ButtonBit.R, label: "R", x: 116, y: 8, color: "#999999" },
  { bit: ButtonBit.DUp, label: "↑", x: 24, y: 34, color: "#cccccc" },
  { bit: ButtonBit.DDown, label: "↓", x: 24, y: 58, color: "#cccccc" },
  { bit: ButtonBit.DLeft, label: "←", x: 12, y: 46, color: "#cccccc" },
  { bit: ButtonBit.DRight, label: "→", x: 36, y: 46, color: "#cccccc" },
];

const C_BUTTONS: ReadonlyArray<{ bit: number; dx: number; dy: number }> = [
  { bit: ButtonBit.CUp, dx: 0, dy: -1 },
  { bit: ButtonBit.CDown, dx: 0, dy: 1 },
  { bit: ButtonBit.CLeft, dx: -1, dy: 0 },
  { bit: ButtonBit.CRight, dx: 1, dy: 0 },
];

const STICK_CENTER = { x: 92, y: 66 };
const STICK_RADIUS = 16;
/** Stick values are clamped to +/-0x50 by the game (docs/RMGR_SPEC.md §4.3). */
const STICK_MAX = 0x50;
const C_STICK_CENTER = { x: 122, y: 66 };
const C_STICK_RADIUS = 8;

export class ControllerPad {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  render(pre: PreFrameUpdate | undefined): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1c1f2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!pre) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("no input this frame", canvas.width / 2, canvas.height / 2);
      return;
    }

    // Buttons
    for (const btn of BUTTON_LAYOUT) {
      const pressed = hasButton(pre.buttons, btn.bit);
      ctx.beginPath();
      ctx.arc(btn.x, btn.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = pressed ? btn.color : "rgba(255,255,255,0.08)";
      ctx.fill();
      ctx.fillStyle = pressed ? "#0a0a0a" : "rgba(255,255,255,0.4)";
      ctx.font = "9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.label, btn.x, btn.y + 1);
    }
    ctx.textBaseline = "alphabetic";

    // Main analog stick
    ctx.beginPath();
    ctx.arc(STICK_CENTER.x, STICK_CENTER.y, STICK_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Smash 64 DI activation threshold boundary (R = 53 / 80)
    const diRadius = (53 / STICK_MAX) * STICK_RADIUS;
    ctx.beginPath();
    ctx.arc(STICK_CENTER.x, STICK_CENTER.y, diRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    const dotX = STICK_CENTER.x + (pre.stickX / STICK_MAX) * STICK_RADIUS;
    const dotY = STICK_CENTER.y - (pre.stickY / STICK_MAX) * STICK_RADIUS;
    const stickMag = Math.hypot(pre.stickX, pre.stickY);
    const isDIActive = stickMag >= 53;

    if (isDIActive) {
      // Glowing DI active ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isDIActive ? "#38bdf8" : "#e0e0e0";
    ctx.fill();

    // C-buttons, drawn as a small diamond around a center point, lit when held
    ctx.beginPath();
    ctx.arc(C_STICK_CENTER.x, C_STICK_CENTER.y, C_STICK_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,204,0,0.25)";
    ctx.stroke();
    for (const c of C_BUTTONS) {
      const held = hasButton(pre.buttons, c.bit);
      ctx.beginPath();
      ctx.arc(
        C_STICK_CENTER.x + c.dx * C_STICK_RADIUS,
        C_STICK_CENTER.y + c.dy * C_STICK_RADIUS,
        3,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = held ? "#ffcc00" : "rgba(255,204,0,0.2)";
      ctx.fill();
    }
  }
}
