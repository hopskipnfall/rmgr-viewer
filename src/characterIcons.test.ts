import { describe, it, expect } from "vitest";
import { characterIconUrl, characterIconHtml } from "./characterIcons.js";

describe("characterIconUrl", () => {
  it("returns an icon URL for each of the 12 base fighters", () => {
    expect(characterIconUrl(0x00)).toContain("mario.svg");
    expect(characterIconUrl(0x01)).toContain("fox.svg");
    expect(characterIconUrl(0x02)).toContain("donkey_kong.svg");
    expect(characterIconUrl(0x03)).toContain("samus.svg");
    expect(characterIconUrl(0x04)).toContain("luigi.svg");
    expect(characterIconUrl(0x05)).toContain("link.svg");
    expect(characterIconUrl(0x06)).toContain("yoshi.svg");
    expect(characterIconUrl(0x07)).toContain("captain_falcon.svg");
    expect(characterIconUrl(0x08)).toContain("kirby.svg");
    expect(characterIconUrl(0x09)).toContain("pikachu.svg");
    expect(characterIconUrl(0x0a)).toContain("jigglypuff.svg");
    expect(characterIconUrl(0x0b)).toContain("ness.svg");
  });

  it("resolves Japanese-region variants to their base fighter's icon", () => {
    expect(characterIconUrl(0x2a)).toBe(characterIconUrl(0x00)); // Mario (JP)
    expect(characterIconUrl(0x29)).toBe(characterIconUrl(0x01)); // Fox (JP)
    expect(characterIconUrl(0x30)).toBe(characterIconUrl(0x08)); // Kirby (JP)
  });

  it("resolves Polygon/EU variants to their base fighter's icon", () => {
    expect(characterIconUrl(0x0e)).toBe(characterIconUrl(0x00)); // Polygon Mario
    expect(characterIconUrl(0x23)).toBe(characterIconUrl(0x05)); // Link (EU)
  });

  it("returns undefined for a character with no icon", () => {
    expect(characterIconUrl(0xff)).toBeUndefined();
  });
});

describe("characterIconHtml", () => {
  it("includes an <img> tag with the icon URL for a base fighter", () => {
    const html = characterIconHtml(0x00); // Mario
    expect(html).toContain("<img");
    expect(html).toContain("mario.svg");
    expect(html).not.toContain("char-icon-jp-badge");
  });

  it("adds a visible (JP) badge for Japanese-region variants, using the base fighter's icon", () => {
    const html = characterIconHtml(0x2a); // Mario (JP)
    expect(html).toContain("mario.svg");
    expect(html).toContain("char-icon-jp-badge");
    expect(html).toContain("(JP)");
  });

  it("falls back to the plain character name when there's no icon", () => {
    const html = characterIconHtml(0x0c); // Master Hand - no icon
    expect(html).not.toContain("<img");
  });

  it("respects a custom className", () => {
    expect(characterIconHtml(0x00, "my-class")).toContain('class="my-class"');
  });
});
