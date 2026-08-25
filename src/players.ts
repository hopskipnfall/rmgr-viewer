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
