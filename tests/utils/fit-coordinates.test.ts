import { describe, it, expect } from "vitest";
import { normalizeFitPosition } from "~/utils/fit-coordinates";

describe("fit-coordinates", () => {
  it("accepts decimal degrees", () => {
    const pos = normalizeFitPosition(37.7749, -122.4194);
    expect(pos).toEqual({ lat: 37.7749, lon: -122.4194 });
  });

  it("converts semicircles to degrees", () => {
    // Roughly 37.7749, -122.4194 in semicircles
    const latSemi = Math.round((37.7749 * Math.pow(2, 31)) / 180);
    const lonSemi = Math.round((-122.4194 * Math.pow(2, 31)) / 180);
    const pos = normalizeFitPosition(latSemi, lonSemi);
    expect(pos).not.toBeNull();
    expect(pos!.lat).toBeCloseTo(37.7749, 4);
    expect(pos!.lon).toBeCloseTo(-122.4194, 4);
  });

  it("treats 0,0 as missing", () => {
    expect(normalizeFitPosition(0, 0)).toBeNull();
  });
});

