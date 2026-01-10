import { describe, it, expect } from "vitest";
import {
  activityHasMetric,
  countRecordsWithMetric,
  getAvailableMetrics,
  getMetricAvailability,
  calculateXValue,
  formatXAxisValue,
  generateActivityId,
  getActivityColorByIndex,
  transformToChartData,
  findNearestValue,
  METRIC_LABELS,
  ACTIVITY_COLORS,
  DELTA_COLOR,
} from "~/utils/chart-config";
import type { Activity, ActivityRecord } from "~/types/activity";

describe("chart-config utilities", () => {
  const mockRecords: ActivityRecord[] = [
    { t: 0, d: 0, hr: 120, alt: 100 },
    { t: 10, d: 100, hr: 130, alt: 110 },
  ];

  const mockActivity: Activity = {
    id: "test-1",
    name: "Test Activity",
    records: mockRecords,
    color: "#5470c6",
    offset: 0,
    scale: 1,
    startTime: new Date("2024-01-01T00:00:00Z"),
  };

  describe("activityHasMetric", () => {
    it("should return true if activity has metric", () => {
      expect(activityHasMetric(mockActivity, "hr")).toBe(true);
      expect(activityHasMetric(mockActivity, "alt")).toBe(true);
    });

    it("should return false if activity lacks metric", () => {
      expect(activityHasMetric(mockActivity, "pwr")).toBe(false);
      expect(activityHasMetric(mockActivity, "cad")).toBe(false);
    });
  });

  describe("countRecordsWithMetric", () => {
    it("should count records with metric", () => {
      expect(countRecordsWithMetric(mockActivity, "hr")).toBe(2);
      expect(countRecordsWithMetric(mockActivity, "alt")).toBe(2);
      expect(countRecordsWithMetric(mockActivity, "pwr")).toBe(0);
    });
  });

  describe("getAvailableMetrics", () => {
    it("should return empty array for no activities", () => {
      expect(getAvailableMetrics([])).toEqual([]);
    });

    it("should detect available metrics", () => {
      const activities: Activity[] = [
        { ...mockActivity, records: [{ t: 0, d: 0, hr: 120 }] },
        { ...mockActivity, id: "test-2", records: [{ t: 0, d: 0, alt: 100 }] },
      ];

      const metrics = getAvailableMetrics(activities);
      expect(metrics).toContain("hr");
      expect(metrics).toContain("alt");
    });
  });

  describe("getMetricAvailability", () => {
    it("should map metrics to activity IDs", () => {
      const activities: Activity[] = [
        { ...mockActivity, id: "act-1", records: [{ t: 0, d: 0, hr: 120 }] },
        { ...mockActivity, id: "act-2", records: [{ t: 0, d: 0, hr: 130, alt: 100 }] },
      ];

      const availability = getMetricAvailability(activities);
      
      expect(availability.hr).toContain("act-1");
      expect(availability.hr).toContain("act-2");
      expect(availability.alt).toContain("act-2");
      expect(availability.alt).not.toContain("act-1");
    });
  });

  describe("calculateXValue", () => {
    it("should calculate time-based x value", () => {
      const record = { t: 100, d: 1000 };
      const value = calculateXValue(record, mockActivity, "time");
      expect(value).toBe(100); // t + offset (0)
    });

    it("should calculate distance-based x value", () => {
      const record = { t: 100, d: 1000 };
      const value = calculateXValue(record, mockActivity, "distance");
      expect(value).toBe(1000);
    });

    it("should calculate localTime-based x value", () => {
      const record = { t: 100, d: 1000 };
      const value = calculateXValue(record, mockActivity, "localTime");
      expect(value).toBe(mockActivity.startTime!.getTime() + 100000);
    });

    it("should apply offset for time", () => {
      const activityWithOffset = { ...mockActivity, offset: 50 };
      const record = { t: 100, d: 1000 };
      const value = calculateXValue(record, activityWithOffset, "time");
      expect(value).toBe(150);
    });
  });

  describe("formatXAxisValue", () => {
    it("should format time value", () => {
      expect(formatXAxisValue(100, "time")).toBe("100.0s");
      expect(formatXAxisValue(0, "time")).toBe("0.0s");
    });

    it("should format distance value", () => {
      expect(formatXAxisValue(1000, "distance")).toBe("1.00km");
      expect(formatXAxisValue(500, "distance")).toBe("500m");
    });

    it("should format localTime value", () => {
      const timestamp = new Date("2024-01-01T12:30:45Z").getTime();
      const result = formatXAxisValue(timestamp, "localTime");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("generateActivityId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateActivityId();
      const id2 = generateActivityId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^activity-/);
    });
  });

  describe("getActivityColorByIndex", () => {
    it("should return color from palette", () => {
      expect(getActivityColorByIndex(0)).toBe(ACTIVITY_COLORS[0]);
      expect(getActivityColorByIndex(1)).toBe(ACTIVITY_COLORS[1]);
    });

    it("should wrap around for indices >= palette length", () => {
      expect(getActivityColorByIndex(10)).toBe(ACTIVITY_COLORS[0]);
      expect(getActivityColorByIndex(11)).toBe(ACTIVITY_COLORS[1]);
    });
  });

  describe("transformToChartData", () => {
    it("should transform records to chart data points", () => {
      const data = transformToChartData(mockActivity, "hr", "time");
      
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual([0, 120]);
      expect(data[1]).toEqual([10, 130]);
    });

    it("should preserve missing values as null (index-safe)", () => {
      const activityWithNulls: Activity = {
        ...mockActivity,
        records: [
          { t: 0, d: 0, hr: 120 },
          { t: 10, d: 100, hr: undefined },
        ],
      };

      const data = transformToChartData(activityWithNulls, "hr", "time");
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual([0, 120]);
      expect(data[1]).toEqual([10, null]);
    });

    it("should preserve record order (no implicit sorting)", () => {
      const unsortedActivity: Activity = {
        ...mockActivity,
        records: [
          { t: 10, d: 100, hr: 130 },
          { t: 0, d: 0, hr: 120 },
        ],
      };

      const data = transformToChartData(unsortedActivity, "hr", "time");
      expect(data[0][0]).toBe(10);
      expect(data[1][0]).toBe(0);
    });
  });

  describe("findNearestValue", () => {
    it("should find exact match", () => {
      const map = new Map<number, number>();
      map.set(100, 50);
      map.set(200, 100);

      expect(findNearestValue(map, 100)).toBe(50);
    });

    it("should find nearest value", () => {
      const map = new Map<number, number>();
      map.set(100, 50);
      map.set(200, 100);

      // 150 is equidistant from 100 and 200, but algorithm picks first one found
      const result = findNearestValue(map, 150);
      expect(result).toBeDefined();
      expect([50, 100]).toContain(result);
    });

    it("should return null if no value within maxDiff", () => {
      const map = new Map<number, number>();
      map.set(100, 50);

      expect(findNearestValue(map, 2000, 100)).toBe(null);
    });

    it("should return null for empty map", () => {
      const map = new Map<number, number>();
      expect(findNearestValue(map, 100)).toBe(null);
    });
  });

  describe("constants", () => {
    it("should export METRIC_LABELS", () => {
      expect(METRIC_LABELS.hr).toBe("Heart Rate (bpm)");
      expect(METRIC_LABELS.alt).toBe("Altitude (m)");
    });

    it("should export ACTIVITY_COLORS", () => {
      expect(ACTIVITY_COLORS).toHaveLength(10);
      expect(ACTIVITY_COLORS[0]).toBe("#5470c6");
    });

    it("should export DELTA_COLOR", () => {
      expect(DELTA_COLOR).toBe("#ff6b6b");
    });
  });
});

