import { describe, it, expect } from "vitest";
import { computeActivityStats } from "~/utils/activity-stats";
import type { Activity } from "~/types/activity";

describe("activity-stats", () => {
  it("computes duration, distance, metric stats, and elevation gain", () => {
    const activity: Activity = {
      id: "a1",
      name: "A1",
      offset: 0,
      scale: 1,
      color: "#000",
      records: [
        { t: 0, d: 0, hr: 100, alt: 10 },
        { t: 10, d: 100, hr: 110, alt: 12 },
        { t: 20, d: 250, hr: 120, alt: 11 },
        { t: 30, d: 400, hr: 130, alt: 15 },
      ],
    };

    const stats = computeActivityStats(activity);
    expect(stats.durationSeconds).toBe(30);
    expect(stats.distanceMeters).toBe(400);
    expect(stats.metrics.hr.avg).toBeCloseTo((100 + 110 + 120 + 130) / 4, 6);
    expect(stats.metrics.hr.max).toBe(130);
    expect(stats.elevationGainMeters).toBeCloseTo((12 - 10) + (15 - 11), 6);
  });

  it("handles missing metrics and missing altitude", () => {
    const activity: Activity = {
      id: "a1",
      name: "A1",
      offset: 0,
      scale: 1,
      color: "#000",
      records: [{ t: 0, d: 0 }, { t: 10, d: 50, hr: 120 }],
    };

    const stats = computeActivityStats(activity);
    expect(stats.metrics.hr.count).toBe(1);
    expect(stats.metrics.alt.count).toBe(0);
    expect(stats.elevationGainMeters).toBe(null);
  });
});

