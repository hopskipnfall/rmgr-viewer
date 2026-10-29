/**
 * Dumps event-level analysis for every 2-player `.rmgr` under one or more directories
 * (recursively) as JSON Lines, one game per line: game metadata, every neutral opening (with the
 * attacker's and victim's action state and damage at the opening frame), every classified
 * recovery situation, and every ledge situation. Per-game summaries (corpusSummaries.ts) pool
 * these away; this keeps them so analysis scripts can slice by move, percent, time in game, etc.
 *
 * Point the output outside the repo: replay corpora are personal data and must not be committed.
 *
 * Usage: npx tsx scripts/corpusEvents.ts <out.jsonl> <dir> [...more dirs]
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  getSeatedPorts,
  parseReplay,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import {
  computeNeutralHitEvents,
  isAttackActionState,
} from "../src/neutralHits.js";
import { computeClassifiedSituations } from "../src/classifiedSituations.js";
import { computeLedgeTrapEvents } from "../src/ledgeTrap.js";
import { gameIdFor } from "../src/data/gameSummary.js";

function listRmgrFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRmgrFiles(full));
    else if (entry.name.endsWith(".rmgr")) out.push(full);
  }
  return out;
}

function stateAt(replay: Replay, frameIndex: number, port: PortIndex) {
  const s = replay.frames[frameIndex]?.ports[port]?.state;
  if (!s) return null;
  return {
    action: s.actionStateId,
    damage: Math.round(s.damagePercent),
    x: Math.round(s.positionX),
    y: Math.round(s.positionY),
    stocks: s.stocksRemaining + 1,
  };
}

/** The attacker's action state a few frames before the hit lands - the move that connected,
 * before hitlag/landing transitions overwrite it. */
function attackerMoveBefore(
  replay: Replay,
  frameIndex: number,
  port: PortIndex,
): number | null {
  for (let i = frameIndex; i >= Math.max(0, frameIndex - 3); i--) {
    const a = replay.frames[i]?.ports[port]?.state?.actionStateId;
    if (a !== undefined) return a;
  }
  return null;
}

async function main(): Promise<void> {
  const [outArg, ...dirs] = process.argv.slice(2);
  if (!outArg || dirs.length === 0) {
    console.error(
      "Usage: npx tsx scripts/corpusEvents.ts <out.jsonl> <dir> [...more]",
    );
    process.exit(2);
  }
  const files = dirs.flatMap((d) => listRmgrFiles(resolve(d))).sort();
  const lines: string[] = [];
  let failed = 0;

  for (const [i, path] of files.entries()) {
    let replay: Replay;
    try {
      const buf = readFileSync(path);
      replay = await parseReplay(
        new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
      );
    } catch {
      failed++;
      continue;
    }
    const seated = getSeatedPorts(replay);
    if (seated.length !== 2) continue;

    const neutral = computeNeutralHitEvents(replay).map((e) => ({
      f: e.frameIndex,
      end: e.endFrameIndex ?? null,
      atk: e.attackerPort,
      vic: e.victimPort,
      hitType: e.hitType,
      reason: e.reason,
      reasonDetail: e.reasonDetail ?? null,
      outcome: e.outcome ?? null,
      hits: e.totalHitsLanded ?? 0,
      dmg: e.totalDamageDealt ?? 0,
      leak: e.damageTakenDuringAdvantage ?? 0,
      toEdge: !!e.convertedToEdgeGuard,
      toLedge: !!e.convertedToLedgeTrap,
      toKill: !!e.convertedToKill,
      atkMove: attackerMoveBefore(replay, e.frameIndex, e.attackerPort),
      atkState: stateAt(replay, e.frameIndex, e.attackerPort),
      vicState: stateAt(replay, Math.max(0, e.frameIndex - 1), e.victimPort),
    }));

    const recovery = computeClassifiedSituations(replay).map((s) => ({
      f: s.enteredFrameIndex,
      end: s.resolutionFrameIndex,
      rec: s.recoveringPort,
      eg: s.edgeGuardingPort,
      result: s.resolutionKind,
      category: s.category,
      entryVerdict: s.entryVerdict,
      jumpVerdict: s.jumpVerdict,
      egHeldLedge: s.edgeGuarderHeldLedge,
      missedHog: s.missedLedgeHogOpportunity,
      recState: stateAt(replay, s.enteredFrameIndex, s.recoveringPort),
    }));

    // Every attack started outside an active interaction/recovery window: did it connect, and
    // was the attacker opened up within 30 frames of it ending?
    const busy = new Uint8Array(replay.frames.length);
    for (const e of neutral) busy.fill(1, e.f, (e.end ?? e.f) + 1);
    for (const s of recovery) busy.fill(1, s.f, s.end + 1);
    const openingFramesByVictim = new Map<number, number[]>();
    for (const e of neutral) {
      const list = openingFramesByVictim.get(e.vic) ?? [];
      list.push(e.f);
      openingFramesByVictim.set(e.vic, list);
    }
    const attacks: unknown[] = [];
    for (const port of seated) {
      const opp = seated.find((p) => p !== port)!;
      let i = 1;
      while (i < replay.frames.length) {
        const cur = replay.frames[i]?.ports[port]?.state;
        const prev = replay.frames[i - 1]?.ports[port]?.state;
        if (
          !cur ||
          !prev ||
          !isAttackActionState(cur.actionStateId) ||
          cur.actionStateId === prev.actionStateId ||
          busy[i]
        ) {
          i++;
          continue;
        }
        const start = i;
        const move = cur.actionStateId;
        while (replay.frames[i + 1]?.ports[port]?.state?.actionStateId === move)
          i++;
        const end = i;
        const oppStart = replay.frames[start]?.ports[opp]?.state;
        const oppAfter =
          replay.frames[Math.min(end + 2, replay.frames.length - 1)]?.ports[opp]
            ?.state;
        const connected =
          !!oppStart &&
          !!oppAfter &&
          oppAfter.damagePercent > oppStart.damagePercent;
        const shielded =
          !connected &&
          (() => {
            for (let k = start; k <= end + 2; k++) {
              const a = replay.frames[k]?.ports[opp]?.state?.actionStateId;
              if (a === 0x023 || a === 0x09b) return true;
            }
            return false;
          })();
        const punishedAt = (openingFramesByVictim.get(port) ?? []).find(
          (f) => f >= start && f <= end + 30,
        );
        attacks.push({
          port,
          f: start,
          len: end - start + 1,
          move,
          connected,
          shielded,
          punished: punishedAt !== undefined,
          me: stateAt(replay, start, port),
          opp: stateAt(replay, start, opp),
        });
        i++;
      }
    }

    const ledge = computeLedgeTrapEvents(replay).map((e) => ({
      f: e.frameIndex,
      kind: e.kind,
      ledgePort: e.ledgePort,
      trapPort: e.trapPort,
      dmg: Math.round(e.damageAtEntry),
    }));

    lines.push(
      JSON.stringify({
        id: gameIdFor(
          replay.header.recordedAtEpochMillis,
          replay.frames.length,
        ),
        path,
        recordedAt: new Date(replay.header.recordedAtEpochMillis).toISOString(),
        frames: replay.frames.length,
        stageId: replay.matchSettings?.stageId ?? 0,
        ports: seated.map((p) => ({
          port: p,
          name: replay.matchStart.playerNames[p] || "",
          characterId: replay.matchSettings?.characterId[p] ?? 0,
          placement: replay.matchResult?.placements[p] ?? null,
        })),
        neutral,
        recovery,
        ledge,
        attacks,
      }),
    );
    if ((i + 1) % 50 === 0) console.error(`${i + 1}/${files.length}`);
  }

  writeFileSync(resolve(outArg), lines.join("\n") + "\n");
  console.error(
    `Wrote ${lines.length} games (${failed} failed to parse) to ${outArg}`,
  );
}

main();
