import { describe, it, expect } from "vitest";
import { ledgeGrabOffset } from "./ledgeGrabRange.js";

describe("ledgeGrabOffset", () => {
  it("returns the documented offset for each of the 12 base fighters", () => {
    expect(ledgeGrabOffset(0x00)).toEqual({ reachX: 400, heightY: 360 }); // Mario
    expect(ledgeGrabOffset(0x04)).toEqual({ reachX: 400, heightY: 360 }); // Luigi
    expect(ledgeGrabOffset(0x01)).toEqual({ reachX: 400, heightY: 400 }); // Fox
    expect(ledgeGrabOffset(0x02)).toEqual({ reachX: 500, heightY: 600 }); // Donkey Kong
    expect(ledgeGrabOffset(0x03)).toEqual({ reachX: 440, heightY: 550 }); // Samus
    expect(ledgeGrabOffset(0x07)).toEqual({ reachX: 440, heightY: 550 }); // Captain Falcon
    expect(ledgeGrabOffset(0x06)).toEqual({ reachX: 420, heightY: 400 }); // Yoshi
    expect(ledgeGrabOffset(0x09)).toEqual({ reachX: 400, heightY: 280 }); // Pikachu
    expect(ledgeGrabOffset(0x05)).toEqual({ reachX: 280, heightY: 400 }); // Link
    expect(ledgeGrabOffset(0x0b)).toEqual({ reachX: 280, heightY: 420 }); // Ness
    expect(ledgeGrabOffset(0x08)).toEqual({ reachX: 250, heightY: 400 }); // Kirby
    expect(ledgeGrabOffset(0x0a)).toEqual({ reachX: 250, heightY: 400 }); // Jigglypuff
  });

  it("applies the same offset to Japanese-region variants as their base fighter", () => {
    expect(ledgeGrabOffset(0x24)).toEqual(ledgeGrabOffset(0x03)); // Samus (JP)
    expect(ledgeGrabOffset(0x25)).toEqual(ledgeGrabOffset(0x0b)); // Ness (JP)
    expect(ledgeGrabOffset(0x27)).toEqual(ledgeGrabOffset(0x05)); // Link (JP)
    expect(ledgeGrabOffset(0x28)).toEqual(ledgeGrabOffset(0x07)); // Falcon (JP)
    expect(ledgeGrabOffset(0x29)).toEqual(ledgeGrabOffset(0x01)); // Fox (JP)
    expect(ledgeGrabOffset(0x2a)).toEqual(ledgeGrabOffset(0x00)); // Mario (JP)
    expect(ledgeGrabOffset(0x30)).toEqual(ledgeGrabOffset(0x08)); // Kirby (JP)
    expect(ledgeGrabOffset(0x32)).toEqual(ledgeGrabOffset(0x09)); // Pikachu (JP)
  });

  it("applies the same offset to Polygon/EU variants as their base fighter", () => {
    expect(ledgeGrabOffset(0x0e)).toEqual(ledgeGrabOffset(0x00)); // Polygon Mario
    expect(ledgeGrabOffset(0x23)).toEqual(ledgeGrabOffset(0x05)); // Link (EU)
  });

  it("returns undefined for a character with no known offset", () => {
    expect(ledgeGrabOffset(0xff)).toBeUndefined();
  });
});
