export type BackgroundTheme = "mountain" | "beach" | "autumn" | "grid";

export interface CharacterAnimState {
  taunting: boolean;
  inCombo: boolean;
  isRoll: boolean;
  isTechRoll: boolean;
  isTechInPlace: boolean;
  isTumble: boolean;
  isProne: boolean;
  isDownBound: boolean;
  isInvulnerable: boolean;
  isSpecial: boolean;
  isLanding: boolean;
  isHeavyLanding?: boolean;
  isDizzy: boolean;
  isSleep: boolean;
  isOpponent: boolean;
  actionFrameCounter: number;
  isSuperArmor?: boolean;
}

export function toGrayscale(colorStr: string, overrideAlpha?: number): string {
  if (colorStr.startsWith("#")) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const finalAlpha = overrideAlpha ?? a;
    return finalAlpha < 1
      ? `rgba(${lum}, ${lum}, ${lum}, ${finalAlpha})`
      : `rgb(${lum}, ${lum}, ${lum})`;
  }
  if (colorStr.startsWith("rgba(") || colorStr.startsWith("rgb(")) {
    const match = colorStr.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (match && match[1] && match[2] && match[3]) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const finalAlpha = overrideAlpha ?? a;
      return finalAlpha < 1
        ? `rgba(${lum}, ${lum}, ${lum}, ${finalAlpha})`
        : `rgb(${lum}, ${lum}, ${lum})`;
    }
  }
  if (colorStr.startsWith("hsl(")) {
    return colorStr.replace(
      /hsl\(\s*[\d.]+\s*,\s*[\d.]+%?\s*,\s*([\d.]+%?)\s*\)/,
      "hsl(0, 0%, $1)",
    );
  }
  return colorStr;
}

export function toBlandPalette(
  colorStr: string,
  overrideAlpha?: number,
): string {
  const SATURATION_FACTOR = 0.35;

  if (colorStr.startsWith("#")) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const nr = Math.round(
      lum * (1 - SATURATION_FACTOR) + r * SATURATION_FACTOR,
    );
    const ng = Math.round(
      lum * (1 - SATURATION_FACTOR) + g * SATURATION_FACTOR,
    );
    const nb = Math.round(
      lum * (1 - SATURATION_FACTOR) + b * SATURATION_FACTOR,
    );
    const finalAlpha = overrideAlpha ?? a;
    return finalAlpha < 1
      ? `rgba(${nr}, ${ng}, ${nb}, ${finalAlpha})`
      : `rgb(${nr}, ${ng}, ${nb})`;
  }
  if (colorStr.startsWith("rgba(") || colorStr.startsWith("rgb(")) {
    const match = colorStr.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (match && match[1] && match[2] && match[3]) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const nr = Math.round(
        lum * (1 - SATURATION_FACTOR) + r * SATURATION_FACTOR,
      );
      const ng = Math.round(
        lum * (1 - SATURATION_FACTOR) + g * SATURATION_FACTOR,
      );
      const nb = Math.round(
        lum * (1 - SATURATION_FACTOR) + b * SATURATION_FACTOR,
      );
      const finalAlpha = overrideAlpha ?? a;
      return finalAlpha < 1
        ? `rgba(${nr}, ${ng}, ${nb}, ${finalAlpha})`
        : `rgb(${nr}, ${ng}, ${nb})`;
    }
  }
  if (colorStr.startsWith("hsl(")) {
    return colorStr.replace(
      /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+%?)\s*\)/,
      (_match, h, s, l) => {
        const sat = Math.round(parseFloat(s) * SATURATION_FACTOR);
        return `hsl(${h}, ${sat}%, ${l})`;
      },
    );
  }
  return colorStr;
}

export function resolveColor(
  hexOrCss: string,
  isOpponent: boolean,
  alpha?: number,
): string {
  if (isOpponent) {
    return toBlandPalette(hexOrCss, alpha);
  }
  if (alpha !== undefined && alpha < 1) {
    return hexToRgba(hexOrCss, alpha);
  }
  return hexOrCss;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
