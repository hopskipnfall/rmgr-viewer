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
  "20260820-175726-George-Harold.rmgr",
  "20260820-180010-George-Harold.rmgr",
  "20260820-180146-George-Harold.rmgr",
  "20260820-180229-George-Harold.rmgr",
  "20260820-180657-George-Harold.rmgr",
  "20260820-181042-George-Harold.rmgr",
  "20260820-181157-George-Harold.rmgr",
  "20260820-181413-George-Harold.rmgr",
  "20260820-181511-George-Harold.rmgr",
  "20260820-181820-George-Harold.rmgr",
  "20260820-181916-George-Harold.rmgr",
  "20260820-182308-George-Harold.rmgr",
  "20260820-182538-George-Harold.rmgr",
  "20260820-182632-George-Harold.rmgr",
  "20260820-182926-George-Harold.rmgr",
  "20260820-183112-George-Harold.rmgr",
  "20260820-183150-George-Harold.rmgr",
  "20260820-183423-George-Harold.rmgr",
  "20260820-183646-George-Harold.rmgr",
];
