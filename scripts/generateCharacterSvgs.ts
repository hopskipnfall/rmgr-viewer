import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../characters-svg");
mkdirSync(outDir, { recursive: true });

// Also write to public/characters for app asset access
const publicOutDir = resolve(__dirname, "../public/characters");
mkdirSync(publicOutDir, { recursive: true });

interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

function identityMatrix(): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function transformPoint(
  m: Matrix,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

class SvgContextMock {
  private matrixStack: Matrix[] = [identityMatrix()];
  private stateStack: Array<{
    matrix: Matrix;
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    lineCap: CanvasLineCap;
    lineJoin: CanvasLineJoin;
    globalAlpha: number;
    lineDash: number[];
  }> = [];

  public fillStyle = "#000000";
  public strokeStyle = "#000000";
  public lineWidth = 1;
  public lineCap: CanvasLineCap = "butt";
  public lineJoin: CanvasLineJoin = "miter";
  public globalAlpha = 1;
  public shadowColor = "transparent";
  public shadowBlur = 0;
  public shadowOffsetX = 0;
  public shadowOffsetY = 0;

  private currentLineDash: number[] = [];
  private currentPathD = "";
  public svgElements: string[] = [];

  private get currentMatrix(): Matrix {
    return this.matrixStack[this.matrixStack.length - 1]!;
  }

  save(): void {
    this.matrixStack.push({ ...this.currentMatrix });
    this.stateStack.push({
      matrix: { ...this.currentMatrix },
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      globalAlpha: this.globalAlpha,
      lineDash: [...this.currentLineDash],
    });
  }

  restore(): void {
    if (this.matrixStack.length > 1) {
      this.matrixStack.pop();
    }
    const state = this.stateStack.pop();
    if (state) {
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.lineCap = state.lineCap;
      this.lineJoin = state.lineJoin;
      this.globalAlpha = state.globalAlpha;
      this.currentLineDash = state.lineDash;
    }
  }

  translate(x: number, y: number): void {
    const t: Matrix = { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
    this.matrixStack[this.matrixStack.length - 1] = multiplyMatrix(
      this.currentMatrix,
      t,
    );
  }

  rotate(angle: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const r: Matrix = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
    this.matrixStack[this.matrixStack.length - 1] = multiplyMatrix(
      this.currentMatrix,
      r,
    );
  }

  scale(sx: number, sy: number): void {
    const s: Matrix = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
    this.matrixStack[this.matrixStack.length - 1] = multiplyMatrix(
      this.currentMatrix,
      s,
    );
  }

  beginPath(): void {
    this.currentPathD = "";
  }

  closePath(): void {
    if (this.currentPathD) {
      this.currentPathD += " Z";
    }
  }

  moveTo(x: number, y: number): void {
    const pt = transformPoint(this.currentMatrix, x, y);
    this.currentPathD += ` M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  }

  lineTo(x: number, y: number): void {
    const pt = transformPoint(this.currentMatrix, x, y);
    this.currentPathD += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    const cp = transformPoint(this.currentMatrix, cpx, cpy);
    const pt = transformPoint(this.currentMatrix, x, y);
    this.currentPathD += ` Q ${cp.x.toFixed(2)} ${cp.y.toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  }

  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    const cp1 = transformPoint(this.currentMatrix, cp1x, cp1y);
    const cp2 = transformPoint(this.currentMatrix, cp2x, cp2y);
    const pt = transformPoint(this.currentMatrix, x, y);
    this.currentPathD += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  }

  arc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false,
  ): void {
    this.ellipse(cx, cy, r, r, 0, startAngle, endAngle, counterclockwise);
  }

  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false,
  ): void {
    const diff = Math.abs(endAngle - startAngle);
    if (diff >= Math.PI * 1.999) {
      const steps = 36;
      for (let i = 0; i <= steps; i++) {
        const theta =
          startAngle +
          (i / steps) * (counterclockwise ? -Math.PI * 2 : Math.PI * 2);
        const unrotatedX = rx * Math.cos(theta);
        const unrotatedY = ry * Math.sin(theta);
        const rotCos = Math.cos(rotation);
        const rotSin = Math.sin(rotation);
        const localX = cx + unrotatedX * rotCos - unrotatedY * rotSin;
        const localY = cy + unrotatedX * rotSin + unrotatedY * rotCos;
        const pt = transformPoint(this.currentMatrix, localX, localY);
        if (i === 0) {
          this.currentPathD += ` M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        } else {
          this.currentPathD += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        }
      }
      this.closePath();
      return;
    }

    const steps = 24;
    const sweep = endAngle - startAngle;
    for (let i = 0; i <= steps; i++) {
      const theta = startAngle + (i / steps) * sweep;
      const unrotatedX = rx * Math.cos(theta);
      const unrotatedY = ry * Math.sin(theta);
      const rotCos = Math.cos(rotation);
      const rotSin = Math.sin(rotation);
      const localX = cx + unrotatedX * rotCos - unrotatedY * rotSin;
      const localY = cy + unrotatedX * rotSin + unrotatedY * rotCos;
      const pt = transformPoint(this.currentMatrix, localX, localY);
      if (i === 0 && !this.currentPathD) {
        this.currentPathD += ` M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      } else {
        this.currentPathD += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      }
    }
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number | number[] = 0,
  ): void {
    const radius = typeof r === "number" ? r : (r[0] ?? 0);
    if (radius <= 0) {
      this.rect(x, y, w, h);
      return;
    }
    this.moveTo(x + radius, y);
    this.lineTo(x + w - radius, y);
    this.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.lineTo(x + w, y + h - radius);
    this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.lineTo(x + radius, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
  }

  fill(): void {
    if (!this.currentPathD.trim()) return;
    const opacityAttr =
      this.globalAlpha < 1
        ? ` fill-opacity="${this.globalAlpha.toFixed(3)}"`
        : "";
    this.svgElements.push(
      `<path d="${this.currentPathD.trim()}" fill="${this.fillStyle}"${opacityAttr} />`,
    );
  }

  stroke(): void {
    if (!this.currentPathD.trim()) return;
    const strokeWidth = this.lineWidth.toFixed(2);
    const lineCap =
      this.lineCap !== "butt" ? ` stroke-linecap="${this.lineCap}"` : "";
    const lineJoin =
      this.lineJoin !== "miter" ? ` stroke-linejoin="${this.lineJoin}"` : "";
    const dashAttr =
      this.currentLineDash.length > 0
        ? ` stroke-dasharray="${this.currentLineDash.join(",")}"`
        : "";
    const opacityAttr =
      this.globalAlpha < 1
        ? ` stroke-opacity="${this.globalAlpha.toFixed(3)}"`
        : "";

    this.svgElements.push(
      `<path d="${this.currentPathD.trim()}" fill="none" stroke="${this.strokeStyle}" stroke-width="${strokeWidth}"${lineCap}${lineJoin}${dashAttr}${opacityAttr} />`,
    );
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.beginPath();
    this.rect(x, y, w, h);
    this.fill();
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.beginPath();
    this.rect(x, y, w, h);
    this.stroke();
  }

  setLineDash(segments: number[]): void {
    this.currentLineDash = [...segments];
  }

  measureText(text: string): { width: number } {
    return { width: text.length * 6 };
  }

  fillText(text: string, x: number, y: number): void {
    const pt = transformPoint(this.currentMatrix, x, y);
    this.svgElements.push(
      `<text x="${pt.x.toFixed(2)}" y="${pt.y.toFixed(2)}" fill="${this.fillStyle}" font-family="system-ui, sans-serif" font-size="10">${text}</text>`,
    );
  }

  toSvgString(width = 128, height = 128): string {
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      `  <g id="character">`,
      ...this.svgElements.map((el) => `    ${el}`),
      `  </g>`,
      `</svg>`,
      "",
    ].join("\n");
  }
}

// Import StageRenderer to invoke the exact polygon rendering methods
import { StageRenderer } from "../src/renderer.js";

interface CharacterDef {
  id: number;
  filename: string;
  name: string;
  methodName: string;
  playerColor: string;
  heightPx: number;
  halfWidth: number;
}

const CHARACTERS: CharacterDef[] = [
  {
    id: 0x00,
    filename: "mario",
    name: "Mario",
    methodName: "drawMarioPolygons",
    playerColor: "#ef4444",
    heightPx: 68,
    halfWidth: 30,
  },
  {
    id: 0x01,
    filename: "fox",
    name: "Fox",
    methodName: "drawFoxPolygons",
    playerColor: "#ef4444",
    heightPx: 82,
    halfWidth: 35,
  },
  {
    id: 0x02,
    filename: "donkey_kong",
    name: "Donkey Kong",
    methodName: "drawDonkeyKongPolygons",
    playerColor: "#ef4444",
    heightPx: 84,
    halfWidth: 42,
  },
  {
    id: 0x03,
    filename: "samus",
    name: "Samus",
    methodName: "drawSamusPolygons",
    playerColor: "#ef4444",
    heightPx: 94,
    halfWidth: 37,
  },
  {
    id: 0x04,
    filename: "luigi",
    name: "Luigi",
    methodName: "drawLuigiPolygons",
    playerColor: "#ef4444",
    heightPx: 75,
    halfWidth: 32,
  },
  {
    id: 0x05,
    filename: "link",
    name: "Link",
    methodName: "drawLinkPolygons",
    playerColor: "#ef4444",
    heightPx: 82,
    halfWidth: 36,
  },
  {
    id: 0x06,
    filename: "yoshi",
    name: "Yoshi",
    methodName: "drawYoshiPolygons",
    playerColor: "#ef4444",
    heightPx: 75,
    halfWidth: 34,
  },
  {
    id: 0x07,
    filename: "captain_falcon",
    name: "Captain Falcon",
    methodName: "drawFalconPolygons",
    playerColor: "#ef4444",
    heightPx: 90,
    halfWidth: 25,
  },
  {
    id: 0x08,
    filename: "kirby",
    name: "Kirby",
    methodName: "drawKirbyPolygons",
    playerColor: "#ef4444",
    heightPx: 52,
    halfWidth: 26,
  },
  {
    id: 0x09,
    filename: "pikachu",
    name: "Pikachu",
    methodName: "drawPikachuPolygons",
    playerColor: "#ef4444",
    heightPx: 59,
    halfWidth: 28,
  },
  {
    id: 0x0a,
    filename: "jigglypuff",
    name: "Jigglypuff",
    methodName: "drawJigglypuffPolygons",
    playerColor: "#ef4444",
    heightPx: 52,
    halfWidth: 26,
  },
  {
    id: 0x0b,
    filename: "ness",
    name: "Ness",
    methodName: "drawNessPolygons",
    playerColor: "#ef4444",
    heightPx: 67,
    halfWidth: 29,
  },
  {
    id: 0x34,
    filename: "bowser",
    name: "Bowser",
    methodName: "drawBowserPolygons",
    playerColor: "#ef4444",
    heightPx: 94,
    halfWidth: 46,
  },
  {
    id: 0x1d,
    filename: "falco",
    name: "Falco",
    methodName: "drawFalcoPolygons",
    playerColor: "#3b82f6",
    heightPx: 88,
    halfWidth: 32,
  },
  {
    id: 0x1e,
    filename: "ganondorf",
    name: "Ganondorf",
    methodName: "drawGanondorfPolygons",
    playerColor: "#8b5cf6",
    heightPx: 95,
    halfWidth: 42,
  },
  {
    id: 0x1f,
    filename: "young_link",
    name: "Young Link",
    methodName: "drawYoungLinkPolygons",
    playerColor: "#22c55e",
    heightPx: 64,
    halfWidth: 28,
  },
  {
    id: 0x20,
    filename: "dr_mario",
    name: "Dr. Mario",
    methodName: "drawDrMarioPolygons",
    playerColor: "#ef4444",
    heightPx: 67,
    halfWidth: 30,
  },
  {
    id: 0x21,
    filename: "wario",
    name: "Wario",
    methodName: "drawWarioPolygons",
    playerColor: "#eab308",
    heightPx: 72,
    halfWidth: 38,
  },
  {
    id: 0x22,
    filename: "dark_samus",
    name: "Dark Samus",
    methodName: "drawDarkSamusPolygons",
    playerColor: "#06b6d4",
    heightPx: 94,
    halfWidth: 37,
  },
  {
    id: 0x26,
    filename: "lucas",
    name: "Lucas",
    methodName: "drawLucasPolygons",
    playerColor: "#f59e0b",
    heightPx: 62,
    halfWidth: 27,
  },
  {
    id: 0x35,
    filename: "giga_bowser",
    name: "Giga Bowser",
    methodName: "drawGigaBowserPolygons",
    playerColor: "#b91c1c",
    heightPx: 98,
    halfWidth: 48,
  },
  {
    id: 0x36,
    filename: "piano",
    name: "Mad Piano",
    methodName: "drawPianoPolygons",
    playerColor: "#64748b",
    heightPx: 72,
    halfWidth: 44,
  },
  {
    id: 0x37,
    filename: "wolf",
    name: "Wolf",
    methodName: "drawWolfPolygons",
    playerColor: "#a855f7",
    heightPx: 88,
    halfWidth: 34,
  },
  {
    id: 0x38,
    filename: "conker",
    name: "Conker",
    methodName: "drawConkerPolygons",
    playerColor: "#f97316",
    heightPx: 62,
    halfWidth: 30,
  },
  {
    id: 0x39,
    filename: "mewtwo",
    name: "Mewtwo",
    methodName: "drawMewtwoPolygons",
    playerColor: "#c084fc",
    heightPx: 90,
    halfWidth: 34,
  },
  {
    id: 0x3a,
    filename: "marth",
    name: "Marth",
    methodName: "drawMarthPolygons",
    playerColor: "#3b82f6",
    heightPx: 84,
    halfWidth: 32,
  },
  {
    id: 0x3b,
    filename: "sonic",
    name: "Sonic",
    methodName: "drawSonicPolygons",
    playerColor: "#2563eb",
    heightPx: 68,
    halfWidth: 30,
  },
  {
    id: 0x3c,
    filename: "sandbag",
    name: "Sandbag",
    methodName: "drawSandbagPolygons",
    playerColor: "#d97706",
    heightPx: 60,
    halfWidth: 24,
  },
  {
    id: 0x3d,
    filename: "super_sonic",
    name: "Super Sonic",
    methodName: "drawSuperSonicPolygons",
    playerColor: "#eab308",
    heightPx: 68,
    halfWidth: 30,
  },
  {
    id: 0x3e,
    filename: "sheik",
    name: "Sheik",
    methodName: "drawSheikPolygons",
    playerColor: "#0284c7",
    heightPx: 80,
    halfWidth: 30,
  },
  {
    id: 0x3f,
    filename: "marina",
    name: "Marina",
    methodName: "drawMarinaPolygons",
    playerColor: "#a855f7",
    heightPx: 75,
    halfWidth: 32,
  },
  {
    id: 0x40,
    filename: "dedede",
    name: "King Dedede",
    methodName: "drawDededePolygons",
    playerColor: "#ef4444",
    heightPx: 86,
    halfWidth: 44,
  },
  {
    id: 0x41,
    filename: "goemon",
    name: "Goemon",
    methodName: "drawGoemonPolygons",
    playerColor: "#0284c7",
    heightPx: 74,
    halfWidth: 34,
  },
  {
    id: 0x42,
    filename: "peppy",
    name: "Peppy Hare",
    methodName: "drawPeppyPolygons",
    playerColor: "#22c55e",
    heightPx: 82,
    halfWidth: 32,
  },
  {
    id: 0x43,
    filename: "slippy",
    name: "Slippy Toad",
    methodName: "drawSlippyPolygons",
    playerColor: "#16a34a",
    heightPx: 68,
    halfWidth: 34,
  },
  {
    id: 0x44,
    filename: "banjo",
    name: "Banjo & Kazooie",
    methodName: "drawBanjoPolygons",
    playerColor: "#d97706",
    heightPx: 82,
    halfWidth: 40,
  },
  {
    id: 0x45,
    filename: "metal_luigi",
    name: "Metal Luigi",
    methodName: "drawMetalLuigiPolygons",
    playerColor: "#94a3b8",
    heightPx: 78,
    halfWidth: 32,
  },
  {
    id: 0x46,
    filename: "ebisumaru",
    name: "Ebisumaru",
    methodName: "drawEbisumaruPolygons",
    playerColor: "#7e22ce",
    heightPx: 72,
    halfWidth: 38,
  },
  {
    id: 0x47,
    filename: "dragon_king",
    name: "Dragon King",
    methodName: "drawDragonKingPolygons",
    playerColor: "#64748b",
    heightPx: 84,
    halfWidth: 34,
  },
  {
    id: 0x48,
    filename: "crash",
    name: "Crash Bandicoot",
    methodName: "drawCrashPolygons",
    playerColor: "#f97316",
    heightPx: 76,
    halfWidth: 32,
  },
  {
    id: 0x49,
    filename: "peach",
    name: "Peach",
    methodName: "drawPeachPolygons",
    playerColor: "#ec4899",
    heightPx: 86,
    halfWidth: 36,
  },
  {
    id: 0x4a,
    filename: "roy",
    name: "Roy",
    methodName: "drawRoyPolygons",
    playerColor: "#dc2626",
    heightPx: 82,
    halfWidth: 32,
  },
  {
    id: 0x4b,
    filename: "dr_luigi",
    name: "Dr. Luigi",
    methodName: "drawDrLuigiPolygons",
    playerColor: "#10b981",
    heightPx: 78,
    halfWidth: 32,
  },
  {
    id: 0x4c,
    filename: "lanky_kong",
    name: "Lanky Kong",
    methodName: "drawLankyKongPolygons",
    playerColor: "#ea580c",
    heightPx: 84,
    halfWidth: 42,
  },
];

const animState = {
  taunting: false,
  inCombo: false,
  isRoll: false,
  isTechRoll: false,
  isTechInPlace: false,
  isTumble: false,
  isProne: false,
  isDownBound: false,
  isInvulnerable: false,
  isSpecial: false,
  isLanding: false,
  isHeavyLanding: false,
  isDizzy: false,
  isSleep: false,
  isOpponent: false,
  actionFrameCounter: 0,
};

console.log("Generating SVGs for all 12 Smash 64 characters...");

for (const char of CHARACTERS) {
  const svgCtx = new SvgContextMock();
  const fakeCanvas = {
    getContext: () => svgCtx,
    width: 128,
    height: 128,
  } as unknown as HTMLCanvasElement;

  const renderer = new StageRenderer(fakeCanvas);
  const x = 64;
  const y = 114;
  const topY = y - char.heightPx;
  const centerY = y - char.heightPx * 0.5;
  const halfWidth = char.halfWidth;
  const heightPx = char.heightPx;
  const effectiveDir = 1;

  // Invoke private polygon drawing method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (renderer as any)[char.methodName](
    x,
    y,
    topY,
    centerY,
    halfWidth,
    heightPx,
    effectiveDir,
    char.playerColor,
    animState,
  );

  const svgContent = svgCtx.toSvgString(128, 128);
  const targetPath = resolve(outDir, `${char.filename}.svg`);
  const publicTargetPath = resolve(publicOutDir, `${char.filename}.svg`);

  writeFileSync(targetPath, svgContent, "utf-8");
  writeFileSync(publicTargetPath, svgContent, "utf-8");
  console.log(
    `✓ Generated ${char.name} -> characters-svg/${char.filename}.svg`,
  );
}

console.log(
  "\nAll 12 character SVGs generated successfully in characters-svg/ and public/characters/!",
);
