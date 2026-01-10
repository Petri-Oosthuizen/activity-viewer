import { describe, it, expect } from "vitest";
import {
  buildPointTooltip,
  buildMultiActivityTooltip,
  buildChartTooltip,
} from "~/utils/tooltip-builder";
import type { Activity, ActivityRecord } from "~/types/activity";

describe("tooltip builders", () => {
  const mockRecord: ActivityRecord = {
    t: 100,
    d: 1000,
    hr: 150,
    alt: 200,
    pwr: 250,
    cad: 90,
    lat: 37.7749,
    lon: -122.4194,
  };

  const mockActivity: Activity = {
    id: "test-1",
    name: "Test Activity",
    records: [mockRecord],
    color: "#5470c6",
    offset: 0,
    scale: 1,
  };

  describe("buildPointTooltip", () => {
    it("should build tooltip for single activity point", () => {
      const result = buildPointTooltip(mockActivity, mockRecord);

      expect(result).toContain("Test Activity");
      expect(result).toContain("150 bpm");
      expect(result).toContain("200 m");
      expect(result).toContain("250 W");
      expect(result).toContain("90");
      expect(result).toContain("Heart Rate:");
      expect(result).toContain("Power:");
      expect(result).toContain("Altitude:");
      expect(result).toContain("Cadence:");
    });

    it("should handle missing metric values", () => {
      const recordWithoutHR = { ...mockRecord, hr: undefined };
      const result = buildPointTooltip(mockActivity, recordWithoutHR);

      expect(result).not.toContain("Heart Rate:");
      expect(result).toContain("200 m");
    });

    it("should format time and distance", () => {
      const result = buildPointTooltip(mockActivity, mockRecord);

      expect(result).toContain("1:40"); // 100 seconds
      expect(result).toContain("1.00 km"); // 1000 meters
    });
  });

  describe("buildMultiActivityTooltip", () => {
    const activity1: Activity = { ...mockActivity, id: "act-1", name: "Activity 1" };
    const activity2: Activity = { ...mockActivity, id: "act-2", name: "Activity 2" };

    it("should build tooltip for multiple activities", () => {
      const points = [
        { activity: activity1, record: mockRecord },
        { activity: activity2, record: { ...mockRecord, hr: 160 } },
      ];

      const result = buildMultiActivityTooltip(points);

      expect(result).toContain("Activity 1");
      expect(result).toContain("Activity 2");
      expect(result).toContain("150 bpm");
      expect(result).toContain("160 bpm");
      expect(result).toContain("Heart Rate:");
    });

    it("should handle empty points array", () => {
      const result = buildMultiActivityTooltip([]);
      expect(result).toContain("0 Activities");
    });
  });

  describe("buildChartTooltip", () => {
    it("should build chart tooltip with custom items", () => {
      const items = [
        { name: "Activity 1 - Heart Rate (bpm)", color: "#5470c6", value: "150.0" },
        { name: "Activity 2 - Heart Rate (bpm)", color: "#91cc75", value: "160.0" },
      ];

      const result = buildChartTooltip("100.0s", items);

      expect(result).toContain("Activity 1");
      expect(result).toContain("Activity 2");
      expect(result).toContain("150.0");
      expect(result).toContain("160.0");
      expect(result).toContain("100.0s");
    });

    it("should handle empty items array", () => {
      const result = buildChartTooltip("100.0s", []);
      expect(result).toContain("No data at this point");
    });
  });
});
