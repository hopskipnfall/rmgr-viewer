import type { PortIndex } from "@rmg-k/rmgr";

/** Classic Smash Bros. port colors: P1 red, P2 blue, P3 yellow, P4 green. */
export const PORT_COLORS: Record<PortIndex, string> = {
  0: "#e0473f",
  1: "#4f7fdb",
  2: "#e0c93f",
  3: "#4fbf6a",
};

export const PORT_LABELS: Record<PortIndex, string> = {
  0: "P1",
  1: "P2",
  2: "P3",
  3: "P4",
};

export const MAIN_PLAYER_COLOR = "#3b82f6"; // Blue
export const OPPONENT_COLOR = "#8a94a6"; // Grey

export function getPlayerColor(
  port: PortIndex,
  perspectivePort?: PortIndex | null,
): string {
  if (perspectivePort === null || perspectivePort === undefined) {
    return PORT_COLORS[port];
  }
  return port === perspectivePort ? MAIN_PLAYER_COLOR : OPPONENT_COLOR;
}
