import { describe, it, expect } from "vitest";
import {
  computeGlobalXExtent,
  percentWindowToXRange,
  filterRecordsByXRange,
  isPercentWindowActive,
  type XExtent,
  type XRange,
  type PercentWindow,
} from "~/utils/windowing";
import type { Activity, ActivityRecord } from "~/types/activity";

describe("windowing", () => {
  const createActivity = (records: ActivityRecord[]): Activity => ({
    id: "test-1",
    name: "Test Activity",
    sourceType: "gpx",
    offset: 0,
    scale: 1,
    color: "#000000",
    records,
  });

  describe("isPercentWindowActive", () => {
    it("should return false for full window", () => {
      const window: PercentWindow = { startPercent: 0, endPercent: 100 };
      expect(isPercentWindowActive(window)).toBe(false);
    });

    it("should return true when startPercent > 0", () => {
      const window: PercentWindow = { startPercent: 10, endPercent: 100 };
      expect(isPercentWindowActive(window)).toBe(true);
    });

    it("should return true when endPercent < 100", () => {
      const window: PercentWindow = { startPercent: 0, endPercent: 90 };
      expect(isPercentWindowActive(window)).toBe(true);
    });

    it("should return true when both are modified", () => {
      const window: PercentWindow = { startPercent: 10, endPercent: 90 };
      expect(isPercentWindowActive(window)).toBe(true);
    });
  });

  describe("computeGlobalXExtent", () => {
    it("should compute extent for distance axis", () => {
      const activity = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 500 },
        { t: 30, d: 300 },
      ]);

      const extent = computeGlobalXExtent([activity], "distance");

      expect(extent).toBeDefined();
      expect(extent?.min).toBe(0);
      expect(extent?.max).toBe(500);
    });

    it("should compute extent for time axis", () => {
      const activity = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 50, d: 200 },
        { t: 30, d: 300 },
      ]);

      const extent = computeGlobalXExtent([activity], "time");

      expect(extent).toBeDefined();
      expect(extent?.min).toBe(0);
      expect(extent?.max).toBe(50);
    });

    it("should compute extent across multiple activities", () => {
      const activity1 = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 100 },
      ]);
      const activity2 = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 200 },
      ]);

      const extent = computeGlobalXExtent([activity1, activity2], "distance");

      expect(extent).toBeDefined();
      expect(extent?.min).toBe(0);
      expect(extent?.max).toBe(200);
    });

    it("should return null for empty activities array", () => {
      const extent = computeGlobalXExtent([], "distance");
      expect(extent).toBeNull();
    });

    it("should return null for activities with no records", () => {
      const activity = createActivity([]);
      const extent = computeGlobalXExtent([activity], "distance");
      expect(extent).toBeNull();
    });

    it("should handle single record", () => {
      const activity = createActivity([{ t: 0, d: 100 }]);
      const extent = computeGlobalXExtent([activity], "distance");

      // Single record results in min === max, which returns null
      expect(extent).toBeNull();
    });
  });

  describe("percentWindowToXRange", () => {
    it("should convert full window to full range", () => {
      const extent: XExtent = { min: 0, max: 100 };
      const window: PercentWindow = { startPercent: 0, endPercent: 100 };

      const range = percentWindowToXRange(extent, window);

      expect(range.lo).toBe(0);
      expect(range.hi).toBe(100);
    });

    it("should convert partial window to partial range", () => {
      const extent: XExtent = { min: 0, max: 100 };
      const window: PercentWindow = { startPercent: 20, endPercent: 80 };

      const range = percentWindowToXRange(extent, window);

      expect(range.lo).toBe(20);
      expect(range.hi).toBe(80);
    });

    it("should handle non-zero minimum extent", () => {
      const extent: XExtent = { min: 100, max: 200 };
      const window: PercentWindow = { startPercent: 0, endPercent: 100 };

      const range = percentWindowToXRange(extent, window);

      expect(range.lo).toBe(100);
      expect(range.hi).toBe(200);
    });

    it("should calculate correct percentages with non-zero minimum", () => {
      const extent: XExtent = { min: 100, max: 200 };
      const window: PercentWindow = { startPercent: 25, endPercent: 75 };

      const range = percentWindowToXRange(extent, window);

      // 25% of 100-200 range = 100 + 0.25 * 100 = 125
      // 75% of 100-200 range = 100 + 0.75 * 100 = 175
      expect(range.lo).toBe(125);
      expect(range.hi).toBe(175);
    });

    it("should handle edge case of 0% and 100%", () => {
      const extent: XExtent = { min: 0, max: 100 };
      const window: PercentWindow = { startPercent: 0, endPercent: 100 };

      const range = percentWindowToXRange(extent, window);

      expect(range.lo).toBe(0);
      expect(range.hi).toBe(100);
    });
  });

  describe("filterRecordsByXRange", () => {
    it("should filter records by distance range", () => {
      const activity = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 50 },
        { t: 20, d: 100 },
        { t: 30, d: 150 },
        { t: 40, d: 200 },
      ]);

      const range: XRange = { lo: 50, hi: 150 };
      const filtered = filterRecordsByXRange(activity, "distance", range);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThanOrEqual(activity.records.length);
      // Should include records where distance is within or at boundaries
      const distances = filtered.map((r) => r.d);
      distances.forEach((d) => {
        expect(d).toBeGreaterThanOrEqual(50);
        expect(d).toBeLessThanOrEqual(150);
      });
    });

    it("should filter records by time range", () => {
      const activity = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 200 },
        { t: 30, d: 300 },
        { t: 40, d: 400 },
      ]);

      const range: XRange = { lo: 10, hi: 30 };
      const filtered = filterRecordsByXRange(activity, "time", range);

      expect(filtered.length).toBeGreaterThan(0);
      const times = filtered.map((r) => r.t);
      times.forEach((t) => {
        expect(t).toBeGreaterThanOrEqual(10);
        expect(t).toBeLessThanOrEqual(30);
      });
    });

    it("should include boundary records", () => {
      const activity = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 50 },
        { t: 20, d: 100 },
      ]);

      const range: XRange = { lo: 50, hi: 100 };
      const filtered = filterRecordsByXRange(activity, "distance", range);

      // Should include records at boundaries (50 and 100)
      const distances = filtered.map((r) => r.d);
      expect(distances).toContain(50);
      expect(distances).toContain(100);
    });

    it("should return empty array when range excludes all records", () => {
      const activity = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 100 },
      ]);

      const range: XRange = { lo: 200, hi: 300 };
      const filtered = filterRecordsByXRange(activity, "distance", range);

      expect(filtered).toHaveLength(0);
    });

    it("should return all records when range includes everything", () => {
      const activity = createActivity([
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 200 },
      ]);

      const range: XRange = { lo: 0, hi: 200 };
      const filtered = filterRecordsByXRange(activity, "distance", range);

      expect(filtered).toHaveLength(activity.records.length);
    });

    it("should handle single record", () => {
      const activity = createActivity([{ t: 0, d: 100 }]);

      const range: XRange = { lo: 50, hi: 150 };
      const filtered = filterRecordsByXRange(activity, "distance", range);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.d).toBe(100);
    });

    it("should handle empty activity", () => {
      const activity = createActivity([]);

      const range: XRange = { lo: 0, hi: 100 };
      const filtered = filterRecordsByXRange(activity, "distance", range);

      expect(filtered).toHaveLength(0);
    });
  });
});
