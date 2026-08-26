import { describe, it, expect } from "vitest";
import { characterSize, getCharacterIconicColor } from "./characterSizes.js";

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
    // Falcon (JP) -> Falcon
    expect(characterSize(0x28)).toEqual(characterSize(0x07));
    // Kirby (JP) -> Kirby
    expect(characterSize(0x30)).toEqual(characterSize(0x08));
    // Pikachu (JP) -> Pikachu
    expect(characterSize(0x32)).toEqual(characterSize(0x09));
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
