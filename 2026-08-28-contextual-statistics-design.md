# Contextual Statistics Design

**Date:** 2026-08-28
**Status:** Design proposal
**Scope:** Cross-sectional aggregation only. Time-series / progress tracking is explicitly out of scope (see [Out of Scope](#out-of-scope)).

---

## 1. Problem

The viewer currently shows a single global rate for each situational stat — `RECOVERY 69%`, `EDGE GUARD 25%`, `LEDGE GETUP 91%` — pooled across every game, every character, and every opponent.

These numbers are close to meaningless, and we can now demonstrate that quantitatively rather than argue it from intuition.

All figures below come from 168 real 2-player games (`replays/nue replays`, tag `nue`, 5 opponents), computed with the existing analysis modules.

### 1.1 The headline number is an average of incompatible things

Global recovery across the corpus is **74.2% (720/970)**. Broken out by the character being played:

| My character    | Recovery      | Edge guard       |
| --------------- | ------------- | ---------------- |
| Pikachu         | 78% (469/601) | **19%** (85/448) |
| Luigi (JP)      | 81% (25/31)   | 21% (5/24)       |
| Jigglypuff (JP) | 75% (18/24)   | 37% (13/35)      |
| Yoshi (JP)      | 61% (50/82)   | 47% (23/49)      |
| Ness (JP)       | 59% (22/37)   | 41% (9/22)       |
| Fox (JP)        | 58% (19/33)   | 29% (8/28)       |
| DK (JP)         | 50% (5/10)    | 38% (6/16)       |
| Falcon (JP)     | 50% (4/8)     | 67% (14/21)      |
| Pikachu (JP)    | 100% (12/12)  | **79%** (22/28)  |

The recovery ordering is exactly what a player would predict — Pikachu and Luigi at the top, DK and Falcon at the bottom. That is good news: **the metric is measuring something real, and that real thing is mostly the character, not the player.** Pooling it into one number averages away the only signal it contains.

### 1.2 Edge guard is driven by the _opponent's_ character, not yours

Same player, same character (Pikachu), split by who is recovering:

| Matchup                   | Edge guard rate   |
| ------------------------- | ----------------- |
| Pikachu vs Pikachu        | **7.5%** (22/293) |
| Pikachu vs Samus          | 32% (10/31)       |
| Pikachu vs Mario          | 29% (7/24)        |
| Pikachu vs Donkey Kong    | **46%** (26/57)   |
| Pikachu vs Captain Falcon | **55%** (17/31)   |

A 7x spread with the player and their character held constant. This confirms the framing exactly: _"Samus edge-guarding Pikachu 50% of the time is extremely good; Samus edge-guarding Falcon 50% is bad."_

**Design consequence — the two headline situational stats have different natural owners:**

- **Recovery success ≈ f(my character)** — ~12 parameters
- **Edge guard success ≈ f(opponent character)** — ~12 parameters

Both are estimable. The full matchup interaction (144 cells) is not — see §4.

### 1.3 Opponent strength dominates everything else

Pikachu only, split by opponent:

| Opponent | n   | Recovery      | Edge guard      | Opening share |
| -------- | --- | ------------- | --------------- | ------------- |
| somei    | 8   | 91% (21/23)   | 46% (26/57)     | 60%           |
| Wario    | 40  | 79% (234/297) | 22% (45/209)    | 44%           |
| kix      | 30  | 76% (214/281) | **8%** (14/182) | 48%           |

Edge guard swings 8% → 46% on the same character. Any global rate is really just a weighted average of _who you happened to play recently_.

---

## 2. Core principles

### 2.1 Symmetric metrics self-normalize; asymmetric metrics need baselines

This is the most useful organizing idea in this document.

A **symmetric** metric compares you against your opponent _within the same game_, so matchup difficulty affects both sides and largely cancels. An **asymmetric** metric measures only your side of a situation, so it inherits the full matchup bias.

| Type           | Examples                                                     | Comparable across matchups?        |
| -------------- | ------------------------------------------------------------ | ---------------------------------- |
| **Symmetric**  | Opening share, per-reason opening differential, stock margin | Yes, directly                      |
| **Asymmetric** | Recovery %, edge guard %, ledge getup %, ledge trap %        | No — requires a character baseline |

Evidence that opening share behaves as claimed — it is perfectly monotone with opponent strength across all characters:

| Opponent   | Opening share | Win rate | Stock margin |
| ---------- | ------------- | -------- | ------------ |
| somei      | 58%           | 100%     | +1.69        |
| shidozz2   | 56%           | 64%      | +0.57        |
| kusora_JPN | 53%           | 81%      | +1.16        |
| kix        | 48%           | 0%       | −1.88        |
| Wario      | 44%           | 3%       | −1.50        |

**Symmetric metrics are the right choice for headline/driving numbers.** They need no baselines, no shrinkage-heavy machinery, and they are honest across every context.

### 2.2 Pool situations, not games

Every stat is already `successes / opportunities`, which means all of them are Beta-Binomial and one piece of machinery covers them all. Never average per-game percentages; always pool numerators and denominators. (The current `76/110` display suggests this is already correct — preserve it.)

### 2.3 Partition on effort; do not adjust for it

Games against much weaker opponents are a different data-generating process, and the corpus shows the signature clearly:

| Opponent   | Strength  | Advantage leak /opening | Conceded openings that are reversals |
| ---------- | --------- | ----------------------- | ------------------------------------ |
| somei      | weakest   | **3.6**                 | **53%**                              |
| shidozz2   | mid       | 2.8                     | 43%                                  |
| kusora_JPN | mid       | 2.6                     | 33%                                  |
| Wario      | strong    | 3.8                     | 29%                                  |
| kix        | strongest | 4.5                     | 37%                                  |

Leak and conceded-reversal rate should be _lowest_ against the weakest opponent if effort were constant. Instead somei is the worst on both. That is the fingerprint of experimenting and getting hit while attacking — real behaviour, but not a measurement of skill.

The risk this creates: **as the player improves, they may sandbag harder against weak opponents, and the pooled number moves the wrong way.** Filtering is the fix, not weighting.

---

## 3. Inferring relative opponent strength

No manual tiering. Estimate from loaded data.

### 3.1 Estimator

Use **average stock margin**, shrunk toward 0:

```
margin_raw   = mean(myFinalStocks − oppFinalStocks)  over decided games
strength_hat = −1 × margin_raw × n / (n + K_opp)      K_opp ≈ 5 games
```

Win rate is the wrong choice: it **saturates**. kix (0%) and Wario (3%) are indistinguishable by win rate, but margin separates them cleanly (−1.88 vs −1.50) and correctly identifies kix as the harder opponent. Margin retains resolution exactly where win/loss loses it.

### 3.2 Cross-check with a process metric

Opening share against that opponent is an independent, non-saturating estimate (58 / 56 / 53 / 48 / 44 above). Where margin and opening share disagree sharply, prefer margin but flag low confidence.

Note kusora_JPN as a caution: 81% win rate but only 53% opening share, and margin (+1.16) below somei (+1.69). The two signals disagree; the tier should be treated as uncertain rather than asserted.

### 3.3 Tiering

Bucket relative to the player, with a deliberate dead zone:

| Tier      | Condition                   |
| --------- | --------------------------- |
| **Above** | shrunk margin ≤ −0.5        |
| **Peer**  | −0.5 < shrunk margin < +0.5 |
| **Below** | shrunk margin ≥ +0.5        |

Require **n ≥ 4** games before assigning a tier; otherwise `unknown` and excluded from filtered views.

For this corpus: `kix`, `Wario` → Above. `shidozz2` → Peer. `kusora_JPN`, `somei` → Below.

### 3.4 Use

Default the driving statistics to **Peer + Above** games. Expose the filter; do not hide the excluded games — surface them in a separate "Experimentation" view.

---

## 4. What is actually estimable

Matchup granularity is not available at this data volume:

- 67 distinct `(my character × opponent character)` cells across 168 games
- **6** cells have n ≥ 5
- **44** cells have n = 1

One exception: `Pikachu vs Pikachu` at n=51 (466 recovery situations). Dittos and a player's core matchups will always be dense; the tail never will be.

**Therefore the aggregation hierarchy is:**

```
global
 └─ my character            ← recovery baselines live here (12 params)
     └─ opponent character  ← edge guard baselines live here (12 params)
         └─ full matchup    ← display only when n is sufficient; never a baseline
```

### 4.1 Shrinkage

Every asymmetric rate is displayed shrunk toward its parent level:

```
adjusted = (successes + K · parent_rate) / (opportunities + K)      K ≈ 15 opportunities
```

Worked example from the corpus (parent = global 74.2%):

| Character    | Raw           | Shrunk | Δ vs global |
| ------------ | ------------- | ------ | ----------- |
| Pikachu (JP) | 100% (12/12)  | 86%    | +11pp       |
| Pikachu      | 78% (469/601) | 78%    | +4pp        |
| Kirby (JP)   | 33% (1/3)     | 67%    | −7pp        |
| Falcon (JP)  | 50% (4/8)     | 66%    | −8pp        |

A 12/12 becomes "clearly above baseline" instead of a meaningless 100%; a 1/3 stops screaming. High-volume cells (Pikachu, 601 situations) are untouched.

**This replaces the low-sample warning badges.** Every cell becomes displayable, with confidence expressed through the value itself rather than a warning icon.

### 4.2 Game variant — correction

Earlier discussion assumed NA vs JP was a game-level partition. It is not. All 168 games report `goodName: SmashRemix2.0.1` — a single ROM. The NA/JP distinction is carried **per character** (`Pikachu` vs `Pikachu (JP)`), and both casts appear within a single game (e.g. `Yoshi (JP) vs Pikachu (JP)`, `Pikachu vs Pikachu`).

**Consequence: there is no variant dimension.** `Pikachu` and `Pikachu (JP)` are simply distinct character IDs, which the existing code already handles. This removes an entire axis from the design. Remix characters fall out naturally as additional IDs; group them as `Other` for rollups and exclude from headline numbers by default.

---

## 5. Neutral game extraction

`computeNeutralHitEvents()` already produces a far richer event than the UI currently uses. Each `NeutralHitEvent` carries `reason`, `outcome`, `totalHitsLanded`, `totalDamageDealt`, `damageTakenDuringAdvantage`, and the conversion flags `convertedToEdgeGuard` / `convertedToLedgeTrap` / `convertedToKill`.

Critically, events are recorded for **both** players, so every metric below has a "won by me" and "conceded by me" side. The differential is the signal.

### 5.1 Opening share — the primary neutral metric

```
openingShare = openingsWon / (openingsWon + openingsLost)
```

Symmetric, self-normalizing, monotone with opponent strength (§2.1). This is the single best neutral-game number available and requires no baseline.

### 5.2 Opening reason mix — the neutral fingerprint

`reason` is a 7-way taxonomy: `whiff-punish`, `reversal`, `landing-lag`, `jump-punish`, `standing-hit`, `shield-pressure`, `unknown`. Computing won% and conceded% per reason produces a style fingerprint and, more usefully, a **per-reason differential**.

Whiff-punish differential (won% − conceded%) across the corpus:

| Opponent   | Won | Conceded | Differential |
| ---------- | --- | -------- | ------------ |
| somei      | 47% | 21%      | **+26**      |
| shidozz2   | 37% | 28%      | +9           |
| kix        | 40% | 37%      | +3           |
| kusora_JPN | 36% | 36%      | 0            |
| Wario      | 31% | 41%      | **−10**      |

Against Wario the relationship **inverts** — he punishes whiffs more than he is punished. That is a specific, actionable weakness statement of a kind the current UI cannot produce.

Reversal differential is equally informative and points the opposite way (conceding 53% reversals to somei = recklessness against a weak opponent).

**Recommended extraction — per (character, opponent) slice:**

| Metric                     | Definition                                     | Reads as                  |
| -------------------------- | ---------------------------------------------- | ------------------------- |
| Opening share              | won / (won + lost)                             | Neutral quality           |
| Reason differential        | won% − conceded%, per reason                   | _How_ neutral is won/lost |
| Openings per minute        | won / minutes                                  | Engagement / pace         |
| Damage per opening         | Σ`totalDamageDealt` / openings                 | Conversion efficiency     |
| Advantage leak per opening | Σ`damageTakenDuringAdvantage` / openings       | Advantage retention       |
| Conversion funnel          | % of openings → edge guard / ledge trap / kill | Where advantage dies      |

Corpus values for the last three, showing they separate opponents cleanly:

| Opponent   | Dmg/opening | Leak/opening | → kill |
| ---------- | ----------- | ------------ | ------ |
| somei      | 32.7        | 3.6          | 27%    |
| kusora_JPN | 31.7        | 2.6          | 31%    |
| shidozz2   | 24.9        | 2.8          | 23%    |
| Wario      | 21.8        | 3.8          | 18%    |
| kix        | 20.0        | 4.5          | 15%    |

### 5.3 Denominators are data

Rate stats hide volume. `openings per minute` and `edge guard situations faced per stock` are neutral-game quality measures already latent in the existing events. Recovery rate rising while recovery _situations per minute_ also rises is not improvement — it is getting hit more. Surface opportunity rates next to success rates.

---

## 6. The driving statistic

The player needs something to latch onto. Requirements: one number, honest across contexts, not dominated by matchup.

**Proposal: `Neutral Score` = opening share, within the current filter.**

Rationale:

- Symmetric — no baselines, no shrinkage needed, comparable everywhere
- Empirically monotone with opponent strength on real data
- Directly coachable — it decomposes into the reason differentials in §5.2
- Robust to the sandbagging problem in a way asymmetric rates are not

Supporting it, a small fixed panel:

1. **Neutral score** (opening share) — headline
2. **Conversion** (damage per opening, → kill %) — what you do with openings
3. **Advantage retention** (leak per opening) — what you give back
4. **Recovery Δ** — shrunk rate vs. your character's baseline, shown as `+4pp`, not `78%`
5. **Edge guard Δ** — shrunk rate vs. the opponent character's baseline

Items 4–5 are shown **as deltas against baseline**, never as bare percentages. `Edge guard 8%` is demoralizing and uninformative; `Edge guard −3pp vs. expected for Pikachu-vs-Pikachu` is honest and actionable.

### 6.1 Character filtering and main detection

Because asymmetric stats are only meaningful within a character, the default view should be **filtered to one character**.

Detect the main automatically from usage share:

```
main = argmax(gamesPlayed)  if  share ≥ 0.25
```

Corpus: Pikachu 78/168 = **46%** → clear main, no prompt needed.

If no character clears 25% (a genuine all-rounder or a 12CB-heavy player), do **not** prompt on load. Default to the "All characters" view showing only symmetric metrics — which remain valid unfiltered — and expose a character picker. Asymmetric stats stay hidden until a character is selected. Prompting for a main is the last resort, not the first.

### 6.2 12 Character Battle

12CB is _a_ slice, not a privileged data source — players face varied matchups in ordinary play regardless. It gets no special treatment in the aggregation. (Its value as a cross-cast strength measure is a separate, out-of-scope question.)

---

## 7. Implementation order

1. **Opponent strength inference + tiering** (§3) — pure function over loaded summaries, no UI change
2. **Symmetric neutral metrics** (§5.1, §5.2) — opening share, reason differentials, conversion, leak; all already derivable from existing events
3. **Neutral Score panel + effort filter** (§6) — the driving statistic
4. **Character-level baselines + shrinkage** (§4.1) — replaces low-sample warnings
5. **Recovery Δ / Edge guard Δ** (§6, items 4–5) — needs 4 first
6. **Opportunity-rate displays** (§5.3)

Steps 1–3 deliver the motivating number and require no baseline estimation. Step 4 is the largest lift.

---

## 8. Out of scope

- **Time-series / progress tracking.** Deliberately deferred. Note that everything above is designed to be sliceable by time later: pooled situation counts, per-opponent partitions, and baseline deltas are all trend-ready.
- **Empirically weighting a composite** by regressing win/loss on the rate stats. Correct idea, and it would answer "which weakness matters most" — but with 168 games and ~6 predictors it would overfit badly. Revisit at a few hundred games with proper cross-validation.
- **Cross-player baselines.** Everything here is single-player-relative. A population baseline needs a corpus from many players.
- **12CB-specific cross-cast strength rating.**

---

## 9. Open questions / verification needed

1. **`Pikachu vs Pikachu` edge guard at 7.5% (22/293)** is plausible given Pikachu's recovery and kix/Wario's skill, but it is extreme enough to warrant a sanity check against video before it is built into a baseline. If the edge-guard situation detector is over-triggering on unwinnable situations, the denominator is inflated.
2. **`unknown` opening reason** runs 3–8% of openings. Worth checking whether these cluster on a specific missing classification.
3. **`kusora_JPN` tier is ambiguous** (§3.2) — 81% win rate but 53% opening share. Which signal is right affects whether ~43 games land in the default view.
4. **`K` values** (`K ≈ 15` for shrinkage, `K_opp ≈ 5` for strength) are reasonable starting points, not tuned. They should be validated once there is enough data to hold out a test set.

---

## 10. Queued follow-up work (unrelated to this design, recorded 2026-08-28)

Not part of the statistics design above — captured here only as a reminder for later, per the user's request when this implementation was kicked off.

### VOD playback mode defaults

1. **PiP default should be video-large / replay-small** — currently defaults the opposite way (`pipPrimary = "canvas"`, i.e. replay big). Flip the default so the video is the large element and the replay is the small inset.
2. **Split "Playback mode: Replay" into two variants**: today, Replay mode keeps the YouTube video playing in the background (muted from view but still audible) so the user gets audio. Add:
   - **"Replay 🔊"** (new default) — current behavior: replay visible, YouTube audio still plays in the background.
   - **"Replay 🔇"** — new: replay only, YouTube video does not play at all (no background audio).

### Character animation state corrections

**Link:**

1. Special `0xe8` (grounded) is a **boomerang throw** — currently mapped to the Up-B animation. Wrong; fix to boomerang. (Aerial counterpart may already be fine — grounded/aerial pairs are usually shared, no need to touch if already correct.)
2. Special `0xe4` (aerial) is his **Up-B in the air** — currently unset. Add the Up-B animation here.
3. Special `0xeb` (grounded) is **pulling out a bomb**; `0xec` (aerial) is the same in the air — both currently unset. Note: landing while holding a pulled bomb transitions into this same state, it is not a second bomb pull — don't treat the landing transition as a new event.
4. State `0x74` is **throwing the bomb he's holding** — currently unset.
5. Special `0xe8` — see item 1; this is the **aerial boomerang throw**, currently unset. (Double-check against item 1's grounded `0xe8` — the user's notes list `0xe8` for both the grounded throw in item 1 and the aerial throw in item 5; verify the correct IDs against the actual state table before implementing, since one of these two entries likely has a typo.)
6. Special `0xe5` (grounded) is the **boomerang throw on the ground** — currently incorrectly mapped to the Up-B animation.

**Yoshi:**

7. Special `0xde` (grounded) is **throwing an egg** — currently unset.
8. Special `0xe2` (aerial) is his **down-B "hip drop" in the air** — currently incorrectly shows him throwing an egg (and an oddly tiny one).
9. Special `0xe1` is the **landing animation after down-B** — currently incorrectly uses his neutral-B animation.

**Jigglypuff:**

10. Special `0xe0` is **just another mid-air jump** (Puff has >2 jumps, hence the extra state) — no special animation needed; treat it as a normal jump.

**Samus:**

11. Special `0xe3` is her **screw attack** — needs an animation, currently unset.
12. Special `0xdf` is **charging her charge shot** — currently unset.
13. Special `0xe6` is **dropping a bomb** — currently incorrectly uses the screw attack animation.
14. Special `0xde` is **firing the charged shot** — currently incorrectly plays the charge-up animation instead.
