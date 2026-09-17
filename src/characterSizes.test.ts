import { describe, it, expect } from "vitest";
import {
  characterSize,
  getCharacterIconicColor,
  VARIANT_TO_BASE_ID,
} from "./characterSizes.js";

describe("characterSizes height hierarchy", () => {
  it("satisfies the exact height ladder specified", () => {
    const samus = characterSize(0x03); // Samus
    const falcon = characterSize(0x07); // Captain Falcon
    const link = characterSize(0x05); // Link
    const fox = characterSize(0x01); // Fox
    const dk = characterSize(0x02); // Donkey Kong
    const yoshi = characterSize(0x06); // Yoshi
    const luigi = characterSize(0x04); // Luigi
    const ness = characterSize(0x0b); // Ness
    const mario = characterSize(0x00); // Mario
    const pika = characterSize(0x09); // Pikachu (Anchored)
    const kirby = characterSize(0x08); // Kirby
    const puff = characterSize(0x0a); // Jigglypuff

    // 1. Samus is the tallest
    expect(samus.height).toBeGreaterThan(falcon.height);

    // 2. Falcon is a tiny bit smaller than Samus
    expect(falcon.height).toBeGreaterThan(link.height);
    expect(falcon.height).toBeGreaterThan(fox.height);
    expect(falcon.height).toBeGreaterThan(dk.height);

    // 3. Link, Fox, DK are equal height and smaller than Falcon
    expect(link.height).toBeCloseTo(fox.height, 4);
    expect(link.height).toBeCloseTo(dk.height, 4);
    expect(link.height).toBeGreaterThan(yoshi.height);
    expect(link.height).toBeGreaterThan(luigi.height);

    // 4. Yoshi and Luigi are equal height and smaller than Link/Fox/DK
    expect(yoshi.height).toBeCloseTo(luigi.height, 4);
    expect(yoshi.height).toBeGreaterThan(ness.height);
    expect(yoshi.height).toBeGreaterThan(mario.height);

    // 5. Ness and Mario are equal height and smaller than Yoshi/Luigi
    expect(ness.height).toBeCloseTo(mario.height, 4);
    expect(ness.height).toBeGreaterThan(pika.height);

    // 6. Pikachu is smaller than Ness/Mario (Anchored)
    expect(pika.height).toBeGreaterThan(kirby.height);
    expect(pika.height).toBeGreaterThan(puff.height);

    // 7. Kirby and Puff are equal height and smaller than Pikachu
    expect(kirby.height).toBeCloseTo(puff.height, 4);
  });

  it("maps polygon and region variants correctly", () => {
    // Polygon Mario -> Mario
    expect(characterSize(0x0e)).toEqual(characterSize(0x00));
    // Polygon Fox -> Fox
    expect(characterSize(0x0f)).toEqual(characterSize(0x01));
    // Polygon Samus -> Samus
    expect(characterSize(0x11)).toEqual(characterSize(0x03));
    // Samus (JP) -> Samus
    expect(characterSize(0x24)).toEqual(characterSize(0x03));
    // Falcon (JP) -> Falcon: size is NOT region-split for Falcon (confirmed
    // from source, FTAttributes.size has no #if REGION_JP guard at all -
    // unlike his jump/tvel constants, which are region-split but don't
    // affect model size).
    expect(characterSize(0x28)).toEqual(characterSize(0x07));
    // Pikachu (JP) -> Pikachu: not region-split either (single value, no
    // #if in the struct).
    expect(characterSize(0x32)).toEqual(characterSize(0x09));
  });

  it("scales Mario, Luigi, and Kirby by their confirmed region ratio, not a flat collapse to the US size", () => {
    // FTAttributes.size (confirmed from source): Mario/Luigi US 1.12, JP
    // 1.00 (JP smaller); Kirby US 0.91, JP 0.94 (JP LARGER - opposite
    // direction from Mario/Luigi).
    const marioUs = characterSize(0x00);
    const marioJp = characterSize(0x2a);
    expect(marioJp.height / marioUs.height).toBeCloseTo(1.0 / 1.12, 3);
    expect(marioJp.width / marioUs.width).toBeCloseTo(1.0 / 1.12, 3);

    const luigiUs = characterSize(0x04);
    const luigiJp = characterSize(0x2b);
    expect(luigiJp.height / luigiUs.height).toBeCloseTo(1.0 / 1.12, 3);

    const kirbyUs = characterSize(0x08);
    const kirbyJp = characterSize(0x30);
    expect(kirbyJp.height / kirbyUs.height).toBeGreaterThan(1);
    expect(kirbyJp.height / kirbyUs.height).toBeCloseTo(0.94 / 0.91, 3);
  });

  it("still resolves every OTHER JP variant of Mario/Luigi/Kirby (icons, ledge-grab reach) to the base fighter", () => {
    // characterSize() is the only place these three diverge by region -
    // VARIANT_TO_BASE_ID itself still collapses them, so any other consumer
    // reading it directly (characterIcons.ts, ledgeGrabRange.ts) is unaffected.
    expect(VARIANT_TO_BASE_ID[0x2a]).toBe(0x00);
    expect(VARIANT_TO_BASE_ID[0x2b]).toBe(0x04);
    expect(VARIANT_TO_BASE_ID[0x30]).toBe(0x08);
  });

  it("returns iconic colors for characters and their variants", () => {
    // Mario
    expect(getCharacterIconicColor(0x00)).toBe("#ef4444");
    // Polygon Mario -> Mario red
    expect(getCharacterIconicColor(0x0e)).toBe("#ef4444");
    // Fox (Blue Fox)
    expect(getCharacterIconicColor(0x01)).toBe("#2563eb");
    // Jigglypuff
    expect(getCharacterIconicColor(0x0a)).toBe("#f472b6");
    // Captain Falcon
    expect(getCharacterIconicColor(0x07)).toBe("#3b82f6");
    // Pikachu
    expect(getCharacterIconicColor(0x09)).toBe("#eab308");
  });
});
