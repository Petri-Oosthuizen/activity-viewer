import { describe, it, expect } from "vitest";
import { computeSegmentDistanceMeters, filterGpsDistanceDeltaMeters, DEFAULT_GPS_DISTANCE_OPTIONS } from "~/utils/gps-distance";

describe("gps-distance", () => {
  it("filters jitter below minMoveMeters", () => {
    const opts = { ...DEFAULT_GPS_DISTANCE_OPTIONS, minMoveMeters: 10 };
    const prev = { lat: 0, lon: 0, t: 0 };
    const next = { lat: 0, lon: 0.00001, t: 1 }; // ~1.11m
    expect(filterGpsDistanceDeltaMeters(prev, next, opts)).toBe(0);
  });

  it("filters unrealistic speed spikes", () => {
    const opts = { ...DEFAULT_GPS_DISTANCE_OPTIONS, maxSpeedMps: 5 };
    const prev = { lat: 0, lon: 0, t: 0 };
    const next = { lat: 0, lon: 0.001, t: 1 }; // ~111m in 1s
    expect(filterGpsDistanceDeltaMeters(prev, next, opts)).toBe(0);
  });

  it("can compute 3D distance when elevation is included", () => {
    const opts = { ...DEFAULT_GPS_DISTANCE_OPTIONS, includeElevation: true, minMoveMeters: 0 };
    const prev = { lat: 0, lon: 0, t: 0, alt: 0 };
    const next = { lat: 0, lon: 0, t: 1, alt: 100 };
    const d = computeSegmentDistanceMeters(prev, next, opts);
    expect(d).toBeCloseTo(100, 6);
  });
});

