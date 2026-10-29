# Roadmap and known issues

The current list of what's wrong or missing, most important first. Remove items when they ship and
record the behavior in the relevant living doc.

## Product gaps

- **Unused analysis.** `computeCharacterBaselines`/`computeBaselineDeltas`,
  `library/neutralScorePanel.ts` and `library/matchupPicker.ts` are implemented and tested, but no
  view renders them. Use them or delete them. (Opponent strength and main detection now feed the
  Progress page.)
- **Duplicate files.** Import says "Skipped N duplicate copies", and stats count each game ID once,
  but nothing lists which files are copies or helps tidy the folder. That belongs with file
  organization.
- **Hit reel next steps:** after a page refresh the web app has to re-import the folder before the
  reel can read replays (desktop doesn't). The "big ones" cutoff (stock lost or 30%+) is a first
  guess, and against a top player it still keeps about half the hits.
- **Opponent tag merges, remaining:** the Edge Guard Workshop's opponent filter and clip search's
  player list still use raw tags. Merging tags can join two sessions into one, and the absorbed
  session's comment is orphaned (its id disappears).
- **Punish finder next steps:** filter by the punisher's position or percent too (not just the
  victim's), show what followed the opener (the route, not just the starter), and let a search be
  saved as a study item next to a goal. The opener grouping uses the move id, so the same move
  across characters with different specials stays separate. Results are capped at the top 50.
- **Progress page next steps:** let the user move the baseline cutoff (for example "since I started
  working on X"), and add per-matchup scopes once a matchup has enough sessions.
- **Goals aren't tracked.** Players work on specific habits (attack only on a real opening, bait then
  punish, avoid cornered up-tilt). The signals exist (STATISTICS.md §6), but there's no way to name a
  goal and see it trend.

## Metric correctness

- **Edge-guard effectiveness and the other headline rates need tuning**, possibly per matchup and
  starting position. Treat them as provisional (see [community/edge-guards.md](community/edge-guards.md)).
- **"Reversal" is mostly scramble.** The 60-frame neutral reset makes any counter-hit within a second
  of the last hit a reversal, about a third of all openings. Consider a shorter reset, or splitting
  "escaped disadvantage" from "traded back in a scramble". See ANALYSIS_SPECIFICATIONS.md §4.4.
- **Land punish shadows whiff punish** for aerials: a whiffed aerial that lands is labeled
  `landing-lag`. That works for "punished a commitment", but merges two coaching cues.
- **Player-facing move names** (`src/moveNames.ts`) cover the shared moves and the original 12's
  specials. Remix characters' specials fall back to engine names, and the match view still shows
  engine names.

## Match view

- **VOD playback defaults:** picture-in-picture should default to video large and replay small
  (today `pipPrimary = "canvas"`).
- **Split "Playback mode: Replay"** into _Replay 🔊_ (default; replay visible, YouTube audio keeps
  playing) and _Replay 🔇_ (replay only, YouTube not playing).
- **Character animation corrections:**
  - **Link:** grounded special `0xe8` is a boomerang throw (currently the Up-B animation); aerial
    `0xe4` is Up-B in the air (unset); `0xeb`/`0xec` are bomb pull on the ground and in the air
    (unset; landing while holding a pulled bomb enters the same state and isn't a second pull);
    `0x74` throws the held bomb (unset); `0xe5` grounded is a boomerang throw (currently Up-B). The
    notes list `0xe8` both as the grounded and as the aerial boomerang; check the state table before
    implementing.
  - **Yoshi:** `0xde` grounded egg throw (unset); `0xe2` aerial down-B hip drop (currently a tiny egg
    throw); `0xe1` down-B landing (currently neutral-B).
  - **Jigglypuff:** `0xe0` is just another mid-air jump; no special animation needed.
  - **Samus:** `0xe3` screw attack (unset); `0xdf` charge-shot charging (unset); `0xe6` bomb drop
    (currently screw attack); `0xde` firing the charged shot (currently plays the charge-up).

## Housekeeping

- `scripts/classifyLatencyProfile.ts` writes `scripts/classify-latency-profile.sqlite`. That file is
  output, not source, and is gitignored.
