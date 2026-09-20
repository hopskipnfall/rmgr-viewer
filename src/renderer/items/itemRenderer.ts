import {
  ITKind,
  ItemLinkId,
  WPKind,
  getItemKindName,
  type Frame,
  type ItemUpdate,
  type Replay,
} from "@rmg-k/rmgr";
import type { Camera } from "../../camera.js";
import {
  CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD,
  CHARGE_SHOT_FULL_CHARGE_SCALE,
  MARKER_TUNING_PX_PER_WORLD_UNIT,
} from "../common/index.js";
import {
  isChargingOrb,
  getWeaponInfo,
  drawCustomWeaponShape,
  drawCustomItemShape,
  drawGenericItemDiamond,
} from "./itemShapes.js";

/**
 * Weapons that should never be drawn with a marker because their visual is
 * already rendered by the attacker's own animation (e.g. Link's Spin Attack).
 */
export const HIDDEN_WEAPON_KINDS = new Set<number>([WPKind.SpinAttack]);

/**
 * Renders active projectiles and items on screen (weapons and items).
 * Select kinds get recognizable custom vector shapes; everything else gets
 * a generic colored diamond.
 */
export function drawItemObjects(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  items: readonly ItemUpdate[],
  replay?: Replay | null,
  frame?: Frame,
  isPaused?: boolean,
): void {
  if (items.length === 0) return;

  for (const item of items) {
    if (
      item.linkId === ItemLinkId.Weapon &&
      HIDDEN_WEAPON_KINDS.has(item.kind)
    ) {
      continue;
    }
    if (isChargingOrb(item, frame)) {
      continue;
    }

    const { x, y } = camera.worldToScreen(item.positionX, item.positionY);
    const isWeapon = item.linkId === ItemLinkId.Weapon;
    // Every marker size below (diamond radius, flame/boomerang/etc.
    // geometry) was tuned in fixed screen pixels against one particular
    // zoom level - unlike character bodies, which go through
    // camera.worldLengthToScreen() and so naturally shrink/grow with
    // the camera (e.g. the smaller canvas in PiP mode). Scaling around
    // the marker's own center point here makes markers track the same
    // zoom characters already do, without having to rewrite every shape
    // function in world units.
    const markerScale =
      camera.worldLengthToScreen(1) / MARKER_TUNING_PX_PER_WORLD_UNIT;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(markerScale, markerScale);
    ctx.translate(-x, -y);
    const spinAngle = item.frame * 0.45;
    const { isLuigi, dir } = getWeaponInfo(
      item,
      frame,
      replay,
      camera.isMirrored(),
    );
    const drewCustomShape = isWeapon
      ? drawCustomWeaponShape(
          ctx,
          item.kind,
          x,
          y,
          isLuigi,
          dir,
          spinAngle,
          item.scaleY,
        )
      : drawCustomItemShape(ctx, item.kind, x, y, item.frame);
    if (!drewCustomShape) {
      drawGenericItemDiamond(ctx, x, y, isWeapon);
    }
    ctx.restore();

    // Only show projectile/weapon names and IDs above the projectile when paused (similar to character position/state)
    if (isPaused) {
      // The generic diamond and most custom shapes are small enough for a
      // fixed label offset, but bigger shapes like boomerang, fireball, pk fire, bomb, and thunder jolt need more
      // clearance so the label doesn't sit on top of their aura/arc.
      const isThunderBolt =
        isWeapon &&
        (item.kind === WPKind.ThunderHead || item.kind === WPKind.ThunderTrail);
      const isVeryTall = !isWeapon && item.kind === ITKind.PKFirePillar;
      const isBomb =
        (!isWeapon &&
          (item.kind === ITKind.Bomb ||
            item.kind === ITKind.BobOmb ||
            item.kind === ITKind.RTTFBomb)) ||
        (isWeapon && item.kind === WPKind.SamusBomb);
      const isChargeShot = isWeapon && item.kind === WPKind.ChargeShot;
      const isLargeObject = isWeapon
        ? item.kind === WPKind.Boomerang ||
          item.kind === WPKind.Fireball ||
          item.kind === WPKind.PKFire ||
          item.kind === WPKind.ThunderJoltAir ||
          item.kind === WPKind.ThunderJoltGround ||
          item.kind === WPKind.Blaster ||
          item.kind === WPKind.Cutter ||
          item.kind === WPKind.EggThrow ||
          item.kind === WPKind.PKThunderHead
        : item.kind === ITKind.Hammer ||
          item.kind === ITKind.HomeRunBat ||
          item.kind === ITKind.BeamSword ||
          item.kind === ITKind.Crate ||
          item.kind === ITKind.Barrel ||
          item.kind === ITKind.Bumper ||
          item.kind === ITKind.StageBumper;

      const chargeShotOffset = isChargeShot
        ? camera.worldLengthToScreen(
            ((CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD *
              (item.scaleY ?? CHARGE_SHOT_FULL_CHARGE_SCALE)) /
              CHARGE_SHOT_FULL_CHARGE_SCALE) *
              1.45,
          ) + 14
        : 0;

      const baseOffset = isThunderBolt
        ? 96
        : isVeryTall
          ? 76
          : isBomb
            ? 48
            : isLargeObject
              ? 34
              : 24;
      const labelOffset = isChargeShot
        ? Math.max(34, chargeShotOffset)
        : Math.max(baseOffset, (baseOffset - 2) * markerScale);

      const baseName = getItemKindName(item.linkId, item.kind);
      const hexId = `0x${item.kind.toString(16)}`;
      const labelText = baseName.includes(hexId)
        ? baseName
        : `${baseName} (${hexId})`;

      ctx.save();
      const font = "bold 12px system-ui, -apple-system, sans-serif";
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textMetrics = ctx.measureText(labelText);
      const paddingX = 6;
      const pillWidth = Math.max(textMetrics.width + paddingX * 2, 28);
      const pillHeight = 18;
      const pillX = x - pillWidth / 2;
      const pillY = y - labelOffset - pillHeight / 2;
      const borderRadius = 4;

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, borderRadius);
      } else {
        ctx.rect(pillX, pillY, pillWidth, pillHeight);
      }
      ctx.fillStyle = "rgba(15, 17, 23, 0.85)";
      ctx.fill();
      ctx.strokeStyle = isWeapon
        ? "rgba(245, 208, 254, 0.6)"
        : "rgba(191, 219, 254, 0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isWeapon ? "#f5d0fe" : "#bfdbfe";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 2;
      ctx.fillText(labelText, x, pillY + pillHeight / 2);
      ctx.restore();
    }
  }
}
