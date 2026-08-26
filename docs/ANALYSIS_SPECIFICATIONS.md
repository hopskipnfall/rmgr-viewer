# Super Smash Bros. (N64) Analysis Engine Specifications

This document defines the mathematical models, action state taxonomies, state machine transition conditions, and coordinate geometry used by `rmgr-viewer` to extract gameplay metrics and situational events from `.rmgr` replay streams.

---

## Table of Contents

1. [Core Engine Principles & Coordinate System](#1-core-engine-principles--coordinate-system)
2. [Edge Guarding & Offstage Recovery](#2-edge-guarding--offstage-recovery)
3. [Ledge Trapping & Ledge Getup](#3-ledge-trapping--ledge-getup)
4. [Neutral Game & Opening Classification](#4-neutral-game--opening-classification)
5. [Directional Influence (DI) Measurement & Physics](#5-directional-influence-di-measurement--physics)
6. [Kill Combos Engine](#6-kill-combos-engine)
7. [Angel Invincibility (Respawn Platform)](#7-angel-invincibility-respawn-platform)
8. [Character-Specific Analytical Modules](#8-character-specific-analytical-modules)
   - [Pikachu Quick Attack (Up-B) Trajectory](#81-pikachu-quick-attack-up-b-trajectory)
   - [Jigglypuff Forward Throw Follow-ups](#82-jigglypuff-forward-throw-follow-ups)
   - [Shield Pressure, Shield Breaks & Conversions](#83-shield-pressure-shield-breaks--conversions)
9. [Cross-Replay Aggregation & Historical Baselines](#9-cross-replay-aggregation--historical-baselines)
10. [Playback Engine & HUD System](#10-playback-engine--hud-system)

---

## 1. Core Engine Principles & Coordinate System

- **Tick Rate**: 60 Hz (1 frame = 16.666 ms).
- **Coordinate Space**: Units are standard N64 world units. Origin $(0, 0)$ is the stage center at ground level on neutral stages (e.g. Dream Land main platform surface).
- **Replay Ingestion**: Replays provide sequential `PostFrameUpdate` structures containing:
  - `actionStateId` (uint16)
  - `positionX`, `positionY`, `positionZ` (float32)
  - `damagePercent` (float32 / int16)
  - `stocksRemaining` (uint8)
  - `hitstunCounter` (uint16)
  - `comboHitCount` (uint16)
  - `controller` input bitmasks & analog stick coordinates $(X, Y) \in [-80, +80]$.

---

## 2. Edge Guarding & Offstage Recovery

Implemented in [`src/edgeGuard.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/edgeGuard.ts).

### 2.1 Danger Zone Geometry (Dream Land)

A player is defined as offstage in the **Danger Zone** when their horizontal position exceeds a linearly interpolated diagonal boundary:
$$\text{Threshold}(y) = X_{\text{LO}} + \left(\frac{\text{clamp}(y, Y_{\text{LO}}, Y_{\text{HI}}) - Y_{\text{LO}}}{Y_{\text{HI}} - Y_{\text{LO}}}\right) \cdot (X_{\text{HI}} - X_{\text{LO}})$$

- $Y_{\text{LO}} = 58$, $Y_{\text{HI}} = 4158$
- $X_{\text{LO}} = 2916$, $X_{\text{HI}} = 3570$
- Condition: $|positionX| > \text{Threshold}(positionY)$

### 2.2 Entry Conditions

A recovery situation opens on the first frame where:

1. One player is outside the danger zone ($|positionX| > \text{Threshold}(y)$).
2. The player is **actionable** (not in hitstun: `isHitstunState` is false).
3. Neither player is in a dead or respawning state:
   - `0x000`–`0x004` (DeadD, DeadS, DeadU, ScreenKO, ScreenKOWait)
   - `0x005` (Entry)
   - `0x007`–`0x009` (Revive1, Revive2, ReviveWait)

_Hitstun Gating Rule_: If a player is launched offstage in hitstun and dies without exiting hitstun, it is classified as a direct blastzone launch kill (not an edge-guard recovery situation). If hitstun ends offstage, the recovery situation initiates on that frame.

### 2.3 Resolution Conditions

- **Recovery Failure (Edge Guard Success)**:
  - Recovering player's `stocksRemaining` drops below their entry stock count.
- **Recovery Success (Edge Guard Failure)**:
  - Recovering player grabs the ledge (`0x054` CliffCatch, `0x055` CliffWait, `0x056` CliffQuick, `0x059` CliffSlow).
  - Recovering player reaches the stage surface and sustains grounded, actionable state without taking damage for $30\text{ consecutive frames}$ ($0.5\text{ s}$).
  - Edge-guarder dies while offstage (`stocksRemaining` drops).

---

## 3. Ledge Trapping & Ledge Getup

Implemented in [`src/ledgeTrap.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/ledgeTrap.ts).

### 3.1 Entry Conditions

Initiated when a player enters:

- `0x054` (`CliffCatch`) or `0x055` (`CliffWait`).
- The player hanging on ledge is marked as `ledgePort`; the opponent is `trapPort`.
- Stratified by entry damage: `<100%` vs `≥100%`.

### 3.2 Ledge Action State Taxonomy

- **Climb**: `0x056`–`0x058` (Quick $<100\%$), `0x059`–`0x05b` (Slow $\ge 100\%$).
- **Attack**: `0x05c`–`0x05d` (Quick $<100\%$), `0x05e`–`0x05f` (Slow $\ge 100\%$).
- **Roll / Escape**: `0x060`–`0x061` (Quick $<100\%$), `0x062`–`0x063` (Slow $\ge 100\%$).
- **Ledge Drop / Platform Pass**: Transitioning to airborne fall `0x01a` / `0x01b` or pass `0x021`.

### 3.3 Resolution Criteria

- **Ledge Getup Success (Ledge Trap Failure)**:
  - Ledge player lands on stage or platform and maintains non-hitstun state for $30\text{ consecutive grounded frames}$ ($0.5\text{ s}$).
  - Ledge player lands a hit on the trapper during or within 30 frames of getup execution.
  - Trapper loses a stock.
- **Ledge Getup Failure (Ledge Trap Success)**:
  - Ledge player takes damage / enters hitstun (`0x025`–`0x039`) or grab capture (`0x0ab`–`0x0bc`) before establishing safe neutral.
  - Ledge player loses a stock.
  - Ledge player is forced back offstage without establishing stage control.

---

## 4. Neutral Game & Opening Classification

Implemented in [`src/neutralHits.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/neutralHits.ts).

### 4.1 Advantage Hierarchy & Neutral Interaction Chains

Gameplay flows through a 5-tier advantage state machine:

```
[ Level 4: Stock Lost / Blastzone KO ]
                 ▲
[ Level 3: Offstage (Edge Guard Situation) ]
                 ▲
[ Level 2: Ledge (Ledge Trap Situation) ]
                 ▲
[ Level 1: Stage Advantage (Combos, Juggles, Tech Chases, Scramble) ]
                 ▲
[ Level 0: True Neutral (Equal Stage Positioning, Actionable) ]
```

An **End-to-End Neutral Interaction** begins on the first hit or grab landed in Level 0 (True Neutral) and tracks the full conversion sequence across all advantage levels until:

1. **Level 4 (KO)**: Defender loses a stock.
2. **Neutral Reset**: Exactly 60 consecutive frames ($1.0\text{ s}$ at 60 fps) elapse where both players are fully actionable, undamaged, and on stage.
3. **Reversal**: Defender turns advantage around via counter-attack or crouch-cancel punish.

### 4.2 The 1-Second (60-Frame) Neutral Reset Rule

Neutral officially resets when **60 consecutive frames** satisfy all of the following conditions:

1. **Zero damage/hits/grabs** occur.
2. **Both players are fully actionable** (neither player in hitstun, grab capture, tumble with hitstun, knockdown/prone `0x032`–`0x037`, shield stun `0x023`, or dead/respawning `0x000`–`0x009`).
3. **Neither player is in a tracked situation** (offstage recovery, ledge getup, or angel invincibility).

Follow-up hits landed before 60 consecutive actionable frames elapse extend the existing interaction rather than opening a new neutral event.

### 4.3 Disadvantage Exclusion

A hit or grab is only classified as the opening of a **Neutral Interaction** if neither player is currently in an active disadvantage state:

- Excludes frames where victim is in an active **Recovery Situation** (`buildRecoveryMap`).
- Excludes frames where victim is in an active **Ledge Getup Situation** (`buildLedgeMap`).
- Excludes active Respawn Angel Invincibility (`buildAngelMap`).

### 4.4 Priority Classification Hierarchy

When a fresh hit (`comboHitCount` increments from 0) or fresh grab (`0x0ab`–`0x0bc`) lands in True Neutral, the preceding frames are evaluated sequentially:

```
                      [ Fresh Hit / Grab in Neutral ]
                                     │
                 Did victim attack into attacker's shield
                 within preceding 45 frames (0.75s)?
                             /               \
                          [YES]              [NO]
                           │                  │
                UNSAFE SHIELD PRESSURE    Did victim land from the air / in landing lag
                                          within preceding 30 frames (0.5s)?
                                                      /              \
                                                   [YES]             [NO]
                                                    │                 │
                                               LAND PUNISH      Did victim whiff an attack / grab
                                                                within preceding 30 frames (0.5s)?
                                                                            /             \
                                                                         [YES]            [NO]
                                                                          │                │
                                                                    WHIFF PUNISH     Did victim jump without attacking
                                                                                     within preceding 30 frames (0.5s)?
                                                                                                 /             \
                                                                                              [YES]            [NO]
                                                                                               │                │
                                                                                          JUMP PUNISH    Was victim grounded
                                                                                                         at hit frame?
                                                                                                             /       \
                                                                                                          [YES]      [NO]
                                                                                                           │          │
                                                                                                     STANDING HIT   UNKNOWN
                                                                                                     / STANDING GRAB
```

1. **`shield-pressure` ("Unsafe Shield Pressure")**: Victim initiated an attack within the preceding 45 frames that made contact with the opponent's shield (`0x098`–`0x09b` or shield stun `0x09b`/`0x023`), and was punished out of shield.
2. **`landing-lag` ("Land Punish")**: Victim was in landing lag animation (`0x01f`, `0x020`, `0x03b`, `0x0db`) or transitioned from airborne to grounded within 30 frames ($0.5\text{ s}$) prior to being hit.
3. **`whiff-punish` ("Whiff Punish")**: Victim initiated an attack or grab that ended without landing a hit within 30 frames prior to being hit.
4. **`jump-punish` ("Jump Punish")**: Victim initiated jump squat (`0x014`, `0x015`) or airborne jump (`0x016`–`0x019`) without executing an aerial attack within 30 frames prior to being hit.
5. **`standing-hit` / `standing-grab` ("Standing Hit" / "Standing Grab")**: Victim was grounded in neutral stand/walk/run/crouch when hit or grabbed.
6. **`unknown` ("Neutral Hit")**: Airborne neutral hit outside of above conditions.

---

## 5. Directional Influence (DI) Measurement & Physics

Implemented in [`src/di.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/di.ts).

### 5.1 Smash 64 DI Engine Mechanics

Unlike subsequent Smash titles where DI alters trajectory angle continuously or during launch velocity calculation, **Super Smash Bros. (N64) applies discrete coordinate displacement during hitlag**:

- DI occurs on the **final 1–2 frames of hitlag** prior to knockback launch.
- Stick displacement multiplier: **$2.1\text{ units}$ per clamped analog stick coordinate**.
- Coordinate clamping: Analog stick $X$ and $Y$ are clamped to $[-80, +80]$.
- Minimum activation threshold: Analog magnitude $r = \sqrt{x^2 + y^2} \ge 53$ and outside deadzone $(|x| > 30 \lor |y| > 30)$.

### 5.2 Hitlag Calculation Formula

$$\text{HitlagBase}(\text{damage}) = \left\lfloor \frac{\text{damage}}{3} \right\rfloor + \text{Bonus}$$

- Regional Bonus: $\text{Bonus}_U = 5$ frames (NTSC-U), $\text{Bonus}_J = 4$ frames (NTSC-J).
- Electric Modifier: Attacks with electric attribute (`0x037` DamageElec) apply $\lfloor \text{HitlagBase} \times 1.5 \rfloor$.
- Laying / Prone Target: Damage is halved before base hitlag calculation: $\lfloor \lceil\text{damage}/2\rceil / 3 \rfloor + \text{Bonus}$.

### 5.3 Directional Classification

Displacement angle $\theta = \operatorname{atan2}(\Delta y, \Delta x)$:

- **8-Way Cardinal**:
  - Neutral ($r < 53$)
  - Up ($67.5^\circ \le \theta < 112.5^\circ$)
  - Down ($-112.5^\circ \le \theta < -67.5^\circ$)
  - Left ($157.5^\circ \le \theta \le 180^\circ \lor -180^\circ \le \theta < -157.5^\circ$)
  - Right ($-22.5^\circ \le \theta < 22.5^\circ$)
  - Up-Right, Up-Left, Down-Right, Down-Left
- **Relative Direction**: Evaluated relative to the attacker's position (`Away`, `In`, `Up`, `Down`, `Up-Away`, `Up-In`, `Down-Away`, `Down-In`).

### 5.4 Collision Clipping Fallback & Cancellation Detection

- **Constrained Displacement**: If stage geometry (floor/wall collision) zeroes or clips $\Delta x$ or $\Delta y$, the visualizer falls back to the raw controller stick vector for direction determination.
- **DI Cancellation**: Detected when opposing directional inputs are entered across consecutive hitlag frames (e.g. Stick Left on frame $N$, Stick Right on frame $N+1$), resulting in net displacement cancellation ($\text{Net Distance} \ll \text{Gross Distance}$).

---

## 6. Kill Combos Engine

Implemented in [`src/combos.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/combos.ts).

### 6.1 Qualification Criteria

A sequence is classified as a **Kill Combo** if:

1. Hit count $\ge 3$ consecutive hits (`comboHitCount >= 3`).
2. Combo chain directly results in stock loss:
   - **Direct KO**: Victim transitions to dead state (`0x000`–`0x004`) during hitstun.
   - **Offstage Lethal Gimp**: Combo ends offstage with victim in disadvantage/fall, and victim dies without ever:
     - Touching ground or platform on stage.
     - Grabbing the ledge (`0x054`, `0x055`).
     - Taking damage from any subsequent separate exchange.

---

## 7. Angel Invincibility (Respawn Platform)

Implemented in [`src/angelInvincibility.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/angelInvincibility.ts).

### 7.1 Lifecycle

- **Trigger**: Player descends and drops from revival platform (`0x007`–`0x009`).
- **Invincibility Duration**: $120\text{ frames}$ ($2.0\text{ s}$) from platform departure.
- **Avoid Success (Opponent)**: Opponent sustains zero damage until the 120-frame invincibility timer expires.
- **Avoid Failure / Hit Landed (Respawner)**: Respawner lands one or more hits on the opponent during the 120-frame window.

---

## 8. Character-Specific Analytical Modules

Implemented in [`src/characterMeta.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/characterMeta.ts).

### 8.1 Pikachu Quick Attack (Up-B) Trajectory

- **State IDs**: `0x0e5` (`SpecialHi` - Zip 1) and `0x0e6` (`SpecialHiEnd` - Zip 2).
- **Extraction**:
  - Trajectory vectors extracted per zip segment from velocity and position deltas.
  - Successive angle delta calculated to evaluate angle distinction requirements ($>38^\circ$ between Zip 1 and Zip 2).
  - Canvas stage overlay renders full recovery paths, zip turnpoints, and frame coordinates.

### 8.2 Jigglypuff Forward Throw Follow-ups

- **State ID**: `0x0a9` (`ThrowF`).
- **Tracking**:
  - Detects throw release and monitors opponent damage and combo counter.
  - Follow-up success: Another hit lands during hitstun or within $30\text{ frames}$ ($0.5\text{ s}$) grace window.
  - Drop / Escaped: Opponent resets to neutral or lands without receiving follow-up attack.

### 8.3 Shield Pressure, Shield Breaks & Conversions

- **Qualification**: $\ge 2$ confirmed hits on opponent's shield (`0x033`–`0x036` ShieldStun, ShieldWait).
- **Outcomes**:
  1. **Shield Break**: Shield depleted into `0x037` (`ShieldBreakFly`) or `0x038` (`ShieldBreakFall`).
  2. **Shield Grab**: Attacker cancels pressure into a successful grab (`0x0a6` Grab, `0x0ab` Capture).
  3. **Shield Escape / Neither**: Defender safely rolls, spot-dodges, passes through platform, or resets without being broken or grabbed within 30 frames.

---

## 9. Cross-Replay Aggregation & Historical Baselines

Implemented in [`src/data/aggregate.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/data/aggregate.ts) and [`src/data/identity.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/data/identity.ts).

### 9.1 Identity Matching

- In-memory session identity matching aliases case-insensitively.
- Strict resolution hierarchy:
  1. Manual per-game port override.
  2. Single seated port matching configured alias set.
  3. Ambiguous (returns `null`).

### 9.2 Weighted Aggregation Formulas

For any metric $M$ across set of replays $G$:
$$\text{Overall Rate} = \frac{\sum_{g \in G} \text{Successes}_g}{\sum_{g \in G} \text{Situations}_g} \times 100\%$$
$$\text{Average Neutral Hits / Stock} = \frac{\sum_{g \in G} \text{Total Neutral Hits Taken}_g}{\sum_{g \in G} \text{Total Stocks Lost}_g}$$

### 9.3 Matchup Baseline Deltas ($\Delta\%$)

- When inspecting from the **User Perspective**, match statistics display delta comparisons against historical averages:
  $$\Delta = \text{Match Rate}\% - \text{Historical Baseline}\%$$
- When inspecting from the **Opponent Perspective**, deltas are **suppressed** to prevent comparing opponent match play against the user's personal baseline.

---

## 10. Playback Engine & HUD System

Implemented in [`src/playback.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/playback.ts), [`src/renderer.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/renderer.ts), and [`src/match/matchView.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/match/matchView.ts).

- **Delta Time Accumulator**: Supports exact speed scaling (`1.0x` = 60 FPS, `0.5x` = 30 FPS, `0.25x` = 15 FPS) without frame desynchronization.
- **Event Log Categorization**:
  - `Recovery`: Offstage recovery & edgeguard outcomes.
  - `Ledge`: Ledge getup & ledge trap outcomes.
  - `Angel`: Respawn invincibility outcomes.
  - `Neutral`: Openings scored (`kind: success`) & punishes taken (`kind: failure`).
  - `Character`: Character-specific techniques (Quick Attack, F-throw, Shield Pressure).
  - `Window Starts (Debug)`: Default-disabled filter for start-of-window markers (`"Recovering"`, `"Angel invincibility"`, etc.).
- **Camera Interpolation**: Bounding-box lerp tracking all non-dead character sprites and relevant stage collision boundaries.
