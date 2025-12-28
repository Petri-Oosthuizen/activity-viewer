import { describe, it, expect } from "vitest";
import {
  generateBaseSeries,
  generateChartSeries,
  type SeriesConfig,
} from "~/utils/chart-series";
import type { Activity } from "~/types/activity";

describe("chart-series", () => {
  const mockActivity1: Activity = {
    id: "act-1",
    name: "Activity 1",
    records: [
      { t: 0, d: 0, hr: 120 },
      { t: 10, d: 100, hr: 130 },
    ],
    color: "#5470c6",
    offset: 0,
  };

  const mockActivity2: Activity = {
    id: "act-2",
    name: "Activity 2",
    records: [
      { t: 0, d: 0, hr: 140 },
      { t: 10, d: 100, hr: 150 },
    ],
    color: "#91cc75",
    offset: 0,
  };

  describe("generateBaseSeries", () => {
    it("should generate series for active activities", () => {
      const disabledIds = new Set<string>();
      const series = generateBaseSeries(
        [mockActivity1, mockActivity2],
        disabledIds,
        ["hr"],
        "time"
      );

      expect(series).toHaveLength(2);
      expect(series[0].name).toContain("Activity 1");
      expect(series[1].name).toContain("Activity 2");
    });

    it("should exclude disabled activities", () => {
      const disabledIds = new Set<string>(["act-1"]);
      const series = generateBaseSeries(
        [mockActivity1, mockActivity2],
        disabledIds,
        ["hr"],
        "time"
      );

      expect(series).toHaveLength(1);
      expect(series[0].name).toContain("Activity 2");
    });

    it("should generate series for multiple metrics", () => {
      const activityWithAlt: Activity = {
        ...mockActivity1,
        records: [
          { t: 0, d: 0, hr: 120, alt: 100 },
          { t: 10, d: 100, hr: 130, alt: 110 },
        ],
      };

      const series = generateBaseSeries(
        [activityWithAlt],
        new Set(),
        ["hr", "alt"],
        "time"
      );

      expect(series).toHaveLength(2);
      expect(series[0].yAxisIndex).toBe(0);
      expect(series[1].yAxisIndex).toBe(1);
    });

    it("should skip activities without metric", () => {
      const activityNoHR: Activity = {
        ...mockActivity1,
        records: [{ t: 0, d: 0, alt: 100 }],
      };

      const series = generateBaseSeries(
        [activityNoHR],
        new Set(),
        ["hr"],
        "time"
      );

      expect(series).toHaveLength(0);
    });

    it("should have correct series properties", () => {
      const series = generateBaseSeries(
        [mockActivity1],
        new Set(),
        ["hr"],
        "time"
      );

      expect(series[0].type).toBe("line");
      expect(series[0].smooth).toBe(false);
      expect(series[0].large).toBe(true);
      expect(series[0].itemStyle.color).toBe("#5470c6");
      expect(series[0].data).toHaveLength(2);
    });
  });

  describe("generateChartSeries", () => {
    it("should return empty array when no active activities", () => {
      const config: SeriesConfig = {
        activities: [mockActivity1],
        disabledActivityIds: new Set(["act-1"]),
        metrics: ["hr"],
        xAxisType: "time",
        showDelta: false,
        deltaMode: "overlay",
        deltaBaseActivityId: null,
        deltaCompareActivityId: null,
      };

      const series = generateChartSeries(config);
      expect(series).toEqual([]);
    });

    it("should generate base series without delta", () => {
      const config: SeriesConfig = {
        activities: [mockActivity1, mockActivity2],
        disabledActivityIds: new Set(),
        metrics: ["hr"],
        xAxisType: "time",
        showDelta: false,
        deltaMode: "overlay",
        deltaBaseActivityId: null,
        deltaCompareActivityId: null,
      };

      const series = generateChartSeries(config);
      expect(series).toHaveLength(2);
      expect(series.every((s) => !s.name.startsWith("Δ"))).toBe(true);
    });

    it("should add delta series in overlay mode", () => {
      const config: SeriesConfig = {
        activities: [mockActivity1, mockActivity2],
        disabledActivityIds: new Set(),
        metrics: ["hr"],
        xAxisType: "time",
        showDelta: true,
        deltaMode: "overlay",
        deltaBaseActivityId: "act-1",
        deltaCompareActivityId: "act-2",
      };

      const series = generateChartSeries(config);
      expect(series).toHaveLength(3); // 2 base + 1 delta
      expect(series[2].name).toContain("Δ");
    });

    it("should return only delta series in delta-only mode", () => {
      const config: SeriesConfig = {
        activities: [mockActivity1, mockActivity2],
        disabledActivityIds: new Set(),
        metrics: ["hr"],
        xAxisType: "time",
        showDelta: true,
        deltaMode: "delta-only",
        deltaBaseActivityId: "act-1",
        deltaCompareActivityId: "act-2",
      };

      const series = generateChartSeries(config);
      expect(series).toHaveLength(1);
      expect(series[0].name).toContain("Δ");
    });

    it("should not add delta if base/compare activities not found", () => {
      const config: SeriesConfig = {
        activities: [mockActivity1, mockActivity2],
        disabledActivityIds: new Set(),
        metrics: ["hr"],
        xAxisType: "time",
        showDelta: true,
        deltaMode: "overlay",
        deltaBaseActivityId: "non-existent",
        deltaCompareActivityId: "act-2",
      };

      const series = generateChartSeries(config);
      expect(series).toHaveLength(2); // No delta added
    });

    it("should not add delta if activities are disabled", () => {
      const config: SeriesConfig = {
        activities: [mockActivity1, mockActivity2],
        disabledActivityIds: new Set(["act-1"]),
        metrics: ["hr"],
        xAxisType: "time",
        showDelta: true,
        deltaMode: "overlay",
        deltaBaseActivityId: "act-1",
        deltaCompareActivityId: "act-2",
      };

      const series = generateChartSeries(config);
      expect(series).toHaveLength(1); // Only act-2, no delta
    });
  });
});

