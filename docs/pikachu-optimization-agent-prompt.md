# Task: Optimize Pikachu's recovery-classifier latency without changing its answers

## Project context

`rmgr-viewer` (working directory `/Users/ness/workspaces/rmgr-viewer`, branch `recovery-classifier-ts`) is a Nintendo 64 Smash Bros. replay analysis tool. It includes a "recovery-reachability classifier" (`src/recoveryHeuristics.ts`) that answers one question for a given character at a given frame: from this exact position/velocity/jumps-remaining, can they reach the ledge, reach the stage, or are they dead no matter what they do? It's pure physics simulation, ported from a Python reference implementation and independently validated against real recorded matches. It runs across every offstage "recovery situation" found in every imported replay.

Nine characters are currently modeled (Fox, Donkey Kong, Samus, Link, Yoshi, Pikachu, Jigglypuff, Captain Falcon, Kirby — plus JP region variants for most of them). Each character has its own simulator function, dispatched by `classify()` near the bottom of `src/recoveryHeuristics.ts`.

## The problem

A profiling run across every replay in the project's real test corpus (`/Users/ness/workspaces/rmgr-viewer/replays/`, 283 files) found:

- 41,834 total `classify()` calls, 28.66 seconds of total time spent inside `classify()`, across a 53.72-second end-to-end run.
- **Pikachu alone accounts for 94.7% of all that time** (~27.1s of the 28.7s), despite being only ~11.6% of all calls. Its calls average 6ms versus sub-millisecond for every other character, and individual calls have taken as long as **542.8ms**.
- Every other character (Fox, DK, Samus, Falcon, Yoshi, Kirby, Jigglypuff, and their JP variants) is negligible by comparison — well under a second combined across the whole corpus.

This makes replay import/analysis slow, and it's overwhelmingly a Pikachu-specific problem. Your job is to make Pikachu's classification dramatically faster without changing what it concludes for any input, ever.

## Why Pikachu is slow (read the code yourself, this is a sketch not a spec)

Pikachu's move (Quick Attack) is modeled as a nested exhaustive search, roughly:
- an outer loop over activation delay (`PIKA.ACTIVATION_DELAY_STEP` = 5 frame steps),
- times an aim grid for the first "zip" (`pikaAngleCandidates()` — 36 angle steps plus a "straight up" special case, so 37 angles — times `PIKA.MAGNITUDE_SAMPLES` — `[60, 70, 80]`, 3 magnitudes),
- and for any candidate that doesn't resolve immediately, a **second** full re-aim grid of the same shape (`pikaFullReAimGrid()` / `pikaSimulateEndAndBeyond()`) simulating the character falling and being allowed to re-aim a second zip.

Each grid cell runs a short frame-by-frame physics simulation (`pikaSimulateZip`, `pikaSimulateEndAndBeyond`, etc. — see `outcomeThisFrame`, `applyGravity`, `applyFriction` for the shared primitives other characters also use). In the worst case this is tens of thousands of simulated grid cells for one `classify()` call.

There's already one optimization in place: `fastRejectPikachuDead()` plus two precomputed boundary tables (`PIKACHU_DEAD_BOUNDARY_JUMPS_0` / `_JUMPS_1`) that let a clearly-hopeless position skip the search entirely and return `"dead"` immediately. **This only helps the confidently-dead tail.** It does nothing for the cases where the answer is `"dead-if-ledge-occupied"` or `"reaches-stage"` — and per the profiling data, those are exactly the verdicts on most of the slowest individual calls. When the real answer is "survivable," the search currently has no way to know that quickly; it has to actually find (or exhaustively fail to find) a working strategy.

## The one hard constraint: this is a pure performance task

**`classify()` must return byte-for-byte identical results for every input, before and after your changes.** Not "almost always" — always. This classifier's entire value depends on it being correct against real match data (every character's model has been checked against real replays before shipping, and that process has caught real bugs more than once — see `scripts/recoveryValidation.ts`'s doc comment and the git history of `src/recoveryHeuristics.ts` for examples). A performance win that quietly makes the search less thorough and changes an answer on some input is not a win, it's a regression wearing a costume. If you're ever tempted to trade a small chance of a wrong answer for a big speedup, stop and either find a way to prove the trade-off is actually risk-free, or don't make it.

## Tools already built for you

1. **`scripts/classifyLatencyProfile.ts`** — run with `npx tsx scripts/classifyLatencyProfile.ts --label "some description"`. Drives the real production entry point (`computeClassifiedSituations`, the same function the app calls when you import a replay) across every file in `replays/`, and records every single `classify()` call — character, every input (x/y/vx/vy/jumpsRemaining/actionStateId/facingDirection), the verdict, and duration — into a **versioned** SQLite database at `scripts/classify-latency-profile.sqlite`. It never drops old data: every invocation adds a new row to a `runs` table (with a label, git SHA, dirty-flag, and totals), so you can directly compare before/after any change:
   ```sql
   SELECT r.label, cc.character_name, AVG(cc.duration_ms) AS avg_ms, COUNT(*) AS n
   FROM classify_calls cc JOIN runs r ON r.id = cc.run_id
   GROUP BY r.id, cc.character_name ORDER BY cc.character_name, r.started_at;
   ```
   There's already a `"baseline"` run recorded (run #1) — the numbers above come from it. Query it (any sqlite3 client, or `node:sqlite`) before you touch any code, to build your own understanding of where the time actually goes: distribution of `x`/`y`/`vx`/`vy` on the slow calls, how verdict correlates with duration, whether slow calls cluster in a particular jumpsRemaining/action-state combination, etc.

2. **`scripts/recoveryValidation.ts`** (`npx tsx scripts/recoveryValidation.ts`) — the correctness check against real data. For every real recovery situation in the corpus, it runs `classify()` at the entry frame and flags any case where the classifier said "cannot reach ledge/stage" but the player actually did (without a hit assisting them). Run this before you start (note the current wrong-count as your baseline — should be 1, a pre-existing unrelated Yoshi issue) and after every change. **The wrong-count must not increase.**

3. **`src/recoveryHeuristics.test.ts`** — the existing test suite (frozen-oracle comparisons, fuzz tests, boundary cases). Must stay green: `npx vitest run src/recoveryHeuristics.test.ts`.

4. **A profiling hook already wired into `classify()` itself** — `startClassifyProfiling()` / `stopClassifyProfiling()` / the `ClassifyCallRecord` type, exported from `src/recoveryHeuristics.ts`. It's a thin wrapper (near-zero overhead when not active) around the actual dispatch logic (`classifyImpl`). You don't need to build your own instrumentation — the profiling script above already uses this.

## What "avoid overfitting" means here

Use the SQLite data to find **structural, general patterns** — not to hardcode special cases for the specific replay files in the corpus. Good examples of what you're looking for:
- "Real Pikachu recoveries overwhelmingly arrive at (or near) terminal fall velocity, because that's what happens after falling for more than a couple seconds — so the search almost always runs at one specific `vy`. Is there a way to precompute/cache more of the search for that regime, the way the existing dead-boundary table does for the 'definitely dead' side?"
- "Most of the slow calls resolve to a *survivable* verdict — is there a way to build an analogous fast-accept table/heuristic for 'definitely fine' the way `fastRejectPikachuDead` does for 'definitely dead', so the expensive search only has to run for the genuinely ambiguous middle?"
- "Within one call's nested grid search, is the loop order wasting time — e.g. always starting from angle index 0 regardless of which direction is actually promising given the character's position relative to the stage?"
- "Is the same sub-computation (e.g. the windup phase, which doesn't depend on aim at all) being redundantly re-simulated across grid cells that don't need to differ there?"
- "Do other already-solved characters (Falcon, Kirby, DK) get their speed from a closed-form/analytic shortcut instead of frame-stepping — could any part of Pikachu's per-frame simulation be replaced the same way?"

Bad approach: writing `if (x === -8546 && y === 1606) return "dead-if-ledge-occupied"` because that's a literal row in the profiling database. That's memorization, not optimization — it'll do nothing for the next real match.

The SQLite data is for **understanding distributions and finding the shape of the problem**, not for hardcoding answers.

## Suggested iteration loop

1. Query `scripts/classify-latency-profile.sqlite`'s `"baseline"` run to characterize what's slow: which verdicts dominate the slow calls, what the position/velocity distributions look like for slow vs. fast calls, whether jumpsRemaining or a specific angle/magnitude region correlates with cost.
2. Read the Pikachu section of `src/recoveryHeuristics.ts` in full (roughly the `PIKA` constant block, `pikaSimulateWindup`, `pikaSimulateZip`, `pikaFullReAimGrid`/`pikaSimulateEndAndBeyond`, `pikachuRecoveryOutcomes`, and the existing `fastRejectPikachuDead`/`PIKACHU_DEAD_BOUNDARY_*` fast path) to understand the actual algorithm precisely — the sketch above is not a substitute for reading it.
3. Form one hypothesis for a structural change. Before implementing, think through how you'll prove it doesn't change any answer.
4. Implement it.
5. Verify correctness, in this order: `npx vitest run` (full suite, not just recoveryHeuristics.test.ts), then `npx tsx scripts/recoveryValidation.ts` (wrong-count must not increase from baseline). Consider also writing a large randomized differential check — call both the old and new logic across many thousands of random/real inputs and assert identical verdicts — before you're confident; a handful of unit tests is not enough given how much surface area this search covers.
6. Re-run `npx tsx scripts/classifyLatencyProfile.ts --label "<describe the change>"` and compare the new run against `"baseline"` (and against your own prior iterations) via the SQL query above.
7. Repeat. Keep each iteration's change small enough that if correctness fails, you know exactly what caused it.

## A resource you may want

There is another active Claude Code session on this machine named **"Game Expert"** (session id `local_37a9fba3-98c4-41f8-a44e-00ccd780a2a5`, working directory `/Users/ness/workspaces/smashremix`, a decompilation of this game's source) that has been deeply involved in building and validating every character model in this classifier, including Pikachu's. If you want to understand *why* Pikachu's real in-game move works the way it does at the source level — e.g. to find a genuinely faster equivalent formulation you can validate against the actual game logic, rather than just re-ordering the empirical search — you can reach it with `mcp__ccd_session_mgmt__send_message` (send_message/list_events/get_session tools). It has no memory of this specific task, so brief it fully if you use it, the same way this document briefs you. This is optional, not required.

## Constraints

- Do not commit or push anything without the user explicitly asking for it in this conversation. Uncommitted, working-tree changes are fine and expected between iterations.
- Do not modify `scripts/classify-latency-profile.sqlite`'s existing `"baseline"` run data — only add new runs.
- Do not weaken `scripts/recoveryValidation.ts`, its wrong-count threshold, or any existing test to make a change look successful. If a change makes something fail, the change is wrong, not the check.
