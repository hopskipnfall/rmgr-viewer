/**
 * Filenames (basenames) of the bundled demo `.rmgr` replay files, served
 * statically from `public/replays/`.
 *
 * This is the single source of truth for "what ships as a demo replay" -
 * both the app (`main.ts`, to build fetch URLs at runtime) and
 * `scripts/generateDemoSummaries.ts` (to know which files to precompute
 * `GameSummary`s for) read from this list. Keep it in sync with the actual
 * contents of `public/replays/` - add/remove a filename here whenever a
 * demo replay is added/removed, then re-run
 * `npm run generate:demo-summaries`.
 */
export const DEMO_REPLAY_FILENAMES: readonly string[] = [
  "20260822-222803-George-Harold-6.rmgr",
  "20260822-222803-Harold-George-23.rmgr",
  "20260822-222803-Harold-George-37.rmgr",
  "20260825-105731-George-Harold.rmgr",
  // Full 12 Character Battle session, George vs Harold.
  "20260813-175723-George-Harold.rmgr",
  "20260813-180007-George-Harold.rmgr",
  "20260813-180143-George-Harold.rmgr",
  "20260813-180226-George-Harold.rmgr",
  "20260813-180654-George-Harold.rmgr",
  "20260813-181039-George-Harold.rmgr",
  "20260813-181154-George-Harold.rmgr",
  "20260813-181410-George-Harold.rmgr",
  "20260813-181508-George-Harold.rmgr",
  "20260813-181817-George-Harold.rmgr",
  "20260813-181913-George-Harold.rmgr",
  "20260813-182305-George-Harold.rmgr",
  "20260813-182535-George-Harold.rmgr",
  "20260813-182629-George-Harold.rmgr",
  "20260813-182923-George-Harold.rmgr",
  "20260813-183109-George-Harold.rmgr",
  "20260813-183147-George-Harold.rmgr",
  "20260813-183420-George-Harold.rmgr",
  "20260813-183643-George-Harold.rmgr",
];
