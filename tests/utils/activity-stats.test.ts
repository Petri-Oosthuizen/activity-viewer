import { describe, it, expect } from "vitest";
import { computeActivityStats, computeActivityStatsFromRecords } from "~/utils/activity-stats";
import type { Activity, ActivityRecord } from "~/types/activity";

describe("activity-stats", () => {
  describe("computeActivityStats", () => {
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
      expect(stats.metrics.hr.min).toBe(100);
      expect(stats.metrics.hr.max).toBe(130);
      expect(stats.metrics.hr.count).toBe(4);
      expect(stats.elevationGainMeters).toBeCloseTo((12 - 10) + (15 - 11), 6);
    });

    it("computes elevation loss correctly", () => {
      const activity: Activity = {
        id: "a1",
        name: "A1",
        offset: 0,
        scale: 1,
        color: "#000",
        records: [
          { t: 0, d: 0, alt: 100 },
          { t: 10, d: 100, alt: 95 },
          { t: 20, d: 200, alt: 90 },
          { t: 30, d: 300, alt: 98 },
        ],
      };

      const stats = computeActivityStats(activity);
      expect(stats.elevationLossMeters).toBeCloseTo((100 - 95) + (95 - 90), 6);
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
      expect(stats.metrics.pwr.count).toBe(0);
      expect(stats.metrics.cad.count).toBe(0);
      expect(stats.elevationGainMeters).toBe(null);
      expect(stats.elevationLossMeters).toBe(null);
    });

    it("handles empty records", () => {
      const activity: Activity = {
        id: "a1",
        name: "A1",
        offset: 0,
        scale: 1,
        color: "#000",
        records: [],
      };

      const stats = computeActivityStats(activity);
      expect(stats.durationSeconds).toBe(0);
      expect(stats.distanceMeters).toBe(0);
      expect(stats.elevationGainMeters).toBe(null);
      expect(stats.elevationLossMeters).toBe(null);
      expect(stats.metrics.hr.count).toBe(0);
      expect(stats.metrics.hr.avg).toBe(null);
      expect(stats.metrics.hr.min).toBe(null);
      expect(stats.metrics.hr.max).toBe(null);
      expect(stats.metrics.pace.count).toBe(0);
      expect(stats.metrics.pace.avg).toBe(null);
    });

    it("handles single record", () => {
      const activity: Activity = {
        id: "a1",
        name: "A1",
        offset: 0,
        scale: 1,
        color: "#000",
        records: [{ t: 0, d: 0, hr: 120 }],
      };

      const stats = computeActivityStats(activity);
      expect(stats.durationSeconds).toBe(0);
      expect(stats.distanceMeters).toBe(0);
      expect(stats.metrics.hr.count).toBe(1);
      expect(stats.metrics.hr.avg).toBe(120);
      expect(stats.metrics.pace.count).toBe(0);
      expect(stats.metrics.pace.avg).toBe(null);
    });

    it("computes all metric types correctly", () => {
      const activity: Activity = {
        id: "a1",
        name: "A1",
        offset: 0,
        scale: 1,
        color: "#000",
        records: [
          { t: 0, d: 0, hr: 100, pwr: 200, cad: 80, alt: 10 },
          { t: 10, d: 100, hr: 110, pwr: 220, cad: 85, alt: 12 },
          { t: 20, d: 200, hr: 120, pwr: 240, cad: 90, alt: 15 },
        ],
      };

      const stats = computeActivityStats(activity);
      expect(stats.metrics.hr.avg).toBeCloseTo((100 + 110 + 120) / 3, 6);
      expect(stats.metrics.hr.min).toBe(100);
      expect(stats.metrics.hr.max).toBe(120);
      expect(stats.metrics.pwr.avg).toBeCloseTo((200 + 220 + 240) / 3, 6);
      expect(stats.metrics.pwr.min).toBe(200);
      expect(stats.metrics.pwr.max).toBe(240);
      expect(stats.metrics.cad.avg).toBeCloseTo((80 + 85 + 90) / 3, 6);
      expect(stats.metrics.cad.min).toBe(80);
      expect(stats.metrics.cad.max).toBe(90);
      expect(stats.metrics.alt.avg).toBeCloseTo((10 + 12 + 15) / 3, 6);
      expect(stats.metrics.alt.min).toBe(10);
      expect(stats.metrics.alt.max).toBe(15);
    });
  });

  describe("pace calculation", () => {
    it("computes pace correctly for consistent speed", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 60, d: 1000 },
        { t: 120, d: 2000 },
        { t: 180, d: 3000 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(3);
      expect(stats.metrics.pace.avg).toBeCloseTo(1.0, 6);
      expect(stats.metrics.pace.min).toBeCloseTo(1.0, 6);
      expect(stats.metrics.pace.max).toBeCloseTo(1.0, 6);
    });

    it("computes pace correctly for varying speeds", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 60, d: 500 },
        { t: 120, d: 1500 },
        { t: 180, d: 2500 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(3);
      expect(stats.metrics.pace.min).toBeCloseTo(1.0, 6);
      expect(stats.metrics.pace.max).toBeCloseTo(2.0, 6);
      const expectedAvg = (2.0 + 1.0 + 1.0) / 3;
      expect(stats.metrics.pace.avg).toBeCloseTo(expectedAvg, 6);
    });

    it("handles single record (no pace possible)", () => {
      const records: ActivityRecord[] = [{ t: 0, d: 0 }];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(0);
      expect(stats.metrics.pace.avg).toBe(null);
      expect(stats.metrics.pace.min).toBe(null);
      expect(stats.metrics.pace.max).toBe(null);
    });

    it("handles zero distance delta (no pace)", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 10, d: 0 },
        { t: 20, d: 100 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(1);
      expect(stats.metrics.pace.avg).toBeCloseTo((10 / 60) / (100 / 1000), 6);
    });

    it("handles zero or negative time delta (no pace)", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 0, d: 100 },
        { t: 10, d: 200 },
        { t: 10, d: 300 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(1);
      expect(stats.metrics.pace.avg).toBeCloseTo((10 / 60) / (100 / 1000), 6);
    });

    it("handles negative distance delta (no pace)", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 100 },
        { t: 10, d: 50 },
        { t: 20, d: 150 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(1);
      expect(stats.metrics.pace.avg).toBeCloseTo((10 / 60) / (100 / 1000), 6);
    });

    it("computes pace for real-world running example", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 300, d: 1000 },
        { t: 600, d: 2000 },
        { t: 900, d: 3000 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(3);
      expect(stats.metrics.pace.avg).toBeCloseTo(5.0, 6);
      expect(stats.metrics.pace.min).toBeCloseTo(5.0, 6);
      expect(stats.metrics.pace.max).toBeCloseTo(5.0, 6);
    });

    it("handles empty records for pace", () => {
      const records: ActivityRecord[] = [];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(0);
      expect(stats.metrics.pace.avg).toBe(null);
      expect(stats.metrics.pace.min).toBe(null);
      expect(stats.metrics.pace.max).toBe(null);
    });

    it("filters out invalid pace values (non-finite, zero, or negative)", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 60, d: 1000 },
        { t: 120, d: 1000 },
        { t: 180, d: 2000 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.metrics.pace.count).toBe(2);
    });
  });

  describe("duration calculation", () => {
    it("computes duration correctly", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 30, d: 200 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.durationSeconds).toBe(30);
    });

    it("handles single record (zero duration)", () => {
      const records: ActivityRecord[] = [{ t: 100, d: 0 }];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.durationSeconds).toBe(0);
    });

    it("handles empty records (zero duration)", () => {
      const records: ActivityRecord[] = [];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.durationSeconds).toBe(0);
    });

    it("handles negative time (clamps to zero)", () => {
      const records: ActivityRecord[] = [
        { t: -10, d: 0 },
        { t: 10, d: 100 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.durationSeconds).toBe(20);
    });
  });

  describe("distance calculation", () => {
    it("computes distance correctly", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 250 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.distanceMeters).toBe(250);
    });

    it("handles single record (zero distance)", () => {
      const records: ActivityRecord[] = [{ t: 0, d: 500 }];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.distanceMeters).toBe(0);
    });

    it("handles empty records (zero distance)", () => {
      const records: ActivityRecord[] = [];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.distanceMeters).toBe(0);
    });

    it("handles negative distance (clamps to zero)", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: -10 },
        { t: 10, d: 100 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.distanceMeters).toBe(110);
    });
  });

  describe("elevation calculations", () => {
    it("computes elevation gain correctly", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0, alt: 100 },
        { t: 10, d: 100, alt: 105 },
        { t: 20, d: 200, alt: 103 },
        { t: 30, d: 300, alt: 110 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.elevationGainMeters).toBeCloseTo(5 + 7, 6);
    });

    it("computes elevation loss correctly", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0, alt: 100 },
        { t: 10, d: 100, alt: 95 },
        { t: 20, d: 200, alt: 97 },
        { t: 30, d: 300, alt: 90 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.elevationLossMeters).toBeCloseTo(5 + 7, 6);
    });

    it("returns null when no altitude data", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0 },
        { t: 10, d: 100 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.elevationGainMeters).toBe(null);
      expect(stats.elevationLossMeters).toBe(null);
    });

    it("handles no elevation change", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0, alt: 100 },
        { t: 10, d: 100, alt: 100 },
        { t: 20, d: 200, alt: 100 },
      ];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.elevationGainMeters).toBe(0);
      expect(stats.elevationLossMeters).toBe(0);
    });

    it("handles single record with altitude", () => {
      const records: ActivityRecord[] = [{ t: 0, d: 0, alt: 100 }];

      const stats = computeActivityStatsFromRecords(records);
      expect(stats.elevationGainMeters).toBe(0);
      expect(stats.elevationLossMeters).toBe(0);
    });
  });
});

