import { describe, it, expect } from "vitest";
import {
  calculateDeltaData,
  buildDeltaSeries,
  type DeltaSeriesConfig,
} from "~/utils/delta-calculator";
import type { Activity } from "~/types/activity";
import type { ChartDataPoint } from "~/utils/chart-config";

describe("delta-calculator", () => {
  const baseData: ChartDataPoint[] = [
    [0, 100],
    [10, 110],
    [20, 120],
  ];

  const compareData: ChartDataPoint[] = [
    [0, 120],
    [10, 130],
    [20, 140],
  ];

  describe("calculateDeltaData", () => {
    it("should calculate delta in overlay mode (scaled)", () => {
      const result = calculateDeltaData(baseData, compareData, "overlay");
      
      expect(result).toHaveLength(3);
      expect(result[0][1]).toBe(2); // (120 - 100) / 10
      expect(result[1][1]).toBe(2); // (130 - 110) / 10
      expect(result[2][1]).toBe(2); // (140 - 120) / 10
    });

    it("should calculate delta in delta-only mode (unscaled)", () => {
      const result = calculateDeltaData(baseData, compareData, "delta-only");
      
      expect(result).toHaveLength(3);
      expect(result[0][1]).toBe(20); // 120 - 100
      expect(result[1][1]).toBe(20); // 130 - 110
      expect(result[2][1]).toBe(20); // 140 - 120
    });

    it("should handle mismatched x values", () => {
      const base: ChartDataPoint[] = [[0, 100], [10, 110]];
      const compare: ChartDataPoint[] = [[5, 120], [15, 130]];

      const result = calculateDeltaData(base, compare, "delta-only");
      
      expect(result.length).toBeGreaterThan(0);
      // Should interpolate to find nearest values
    });

    it("should filter out null values", () => {
      const base: ChartDataPoint[] = [[0, 100], [10, null]];
      const compare: ChartDataPoint[] = [[0, 120], [10, 130]];

      const result = calculateDeltaData(base, compare, "delta-only");
      
      // Should only include points where both have values
      expect(result.every((p) => p[1] !== null)).toBe(true);
    });
  });

  describe("buildDeltaSeries", () => {
    const baseActivity: Activity = {
      id: "base-1",
      name: "Base Activity",
      records: [],
      color: "#5470c6",
      offset: 0,
    };

    const compareActivity: Activity = {
      id: "compare-1",
      name: "Compare Activity",
      records: [],
      color: "#91cc75",
      offset: 0,
    };

    it("should build delta series in overlay mode", () => {
      const config: DeltaSeriesConfig = {
        baseActivity,
        compareActivity,
        baseSeriesData: baseData,
        compareSeriesData: compareData,
        metric: "hr",
        metricCount: 1,
        deltaMode: "overlay",
      };

      const result = buildDeltaSeries(config);

      expect(result.name).toBe("Δ Compare Activity - Base Activity");
      expect(result.type).toBe("line");
      expect(result.data).toHaveLength(3);
      expect(result.yAxisIndex).toBe(1); // metricCount
      expect(result.itemStyle.color).toBe("#ff6b6b");
    });

    it("should build delta series in delta-only mode", () => {
      const config: DeltaSeriesConfig = {
        baseActivity,
        compareActivity,
        baseSeriesData: baseData,
        compareSeriesData: compareData,
        metric: "hr",
        metricCount: 2,
        deltaMode: "delta-only",
      };

      const result = buildDeltaSeries(config);

      expect(result.yAxisIndex).toBe(0); // Always 0 in delta-only mode
      expect(result.data[0][1]).toBe(20); // Unscaled delta
    });

    it("should have correct series properties", () => {
      const config: DeltaSeriesConfig = {
        baseActivity,
        compareActivity,
        baseSeriesData: baseData,
        compareSeriesData: compareData,
        metric: "hr",
        metricCount: 1,
        deltaMode: "overlay",
      };

      const result = buildDeltaSeries(config);

      expect(result.smooth).toBe(false);
      expect(result.large).toBe(true);
      expect(result.largeThreshold).toBe(2000);
      expect(result.symbolSize).toBe(0);
      expect(result.showSymbol).toBe(false);
      expect(result.animation).toBe(false);
    });
  });
});

