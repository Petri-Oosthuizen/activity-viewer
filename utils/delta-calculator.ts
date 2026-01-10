/**
 * Delta calculation utilities
 * Pure functions for calculating differences between activities
 */

import type { Activity } from "~/types/activity";
import type { ChartDataPoint, MetricType, DeltaMode } from "./chart-config";
import { DELTA_COLOR, METRIC_LABELS } from "./chart-config";
import { findNearestValue } from "./chart-config";

export interface DeltaSeriesConfig {
  baseActivity: Activity;
  compareActivity: Activity;
  baseSeriesData: ChartDataPoint[];
  compareSeriesData: ChartDataPoint[];
  metric: MetricType;
  metricCount: number;
  deltaMode: DeltaMode;
}

/**
 * Calculate delta series data between two activities
 */
export function calculateDeltaData(
  baseData: ChartDataPoint[],
  compareData: ChartDataPoint[],
  deltaMode: DeltaMode
): ChartDataPoint[] {
  // Build data maps for interpolation
  const baseMap = new Map<number, number>();
  baseData.forEach((p) => {
    if (p[0] !== null && p[1] !== null) baseMap.set(p[0], p[1]);
  });

  const compareMap = new Map<number, number>();
  compareData.forEach((p) => {
    if (p[0] !== null && p[1] !== null) compareMap.set(p[0], p[1]);
  });

  // Calculate delta at each x-value
  const allX = new Set<number>();
  baseMap.forEach((_, x) => allX.add(x));
  compareMap.forEach((_, x) => allX.add(x));

  // Only scale by 0.1x in overlay mode; use actual delta in delta-only mode
  const scaleFactor = deltaMode === "overlay" ? 10 : 1;

  const deltaData = Array.from(allX)
    .sort((a, b) => a - b)
    .map((x): ChartDataPoint | null => {
      const baseVal = findNearestValue(baseMap, x);
      const compareVal = findNearestValue(compareMap, x);
      if (baseVal !== null && compareVal !== null) {
        return [x, (compareVal - baseVal) / scaleFactor];
      }
      return null;
    })
    .filter((p): p is ChartDataPoint => p !== null);

  return deltaData;
}

/**
 * Build ECharts delta series configuration
 */
export function buildDeltaSeries(config: DeltaSeriesConfig): any {
  const { baseActivity, compareActivity, baseSeriesData, compareSeriesData, metric, metricCount, deltaMode } = config;

  const deltaData = calculateDeltaData(baseSeriesData, compareSeriesData, deltaMode);

  return {
    name: `Δ ${METRIC_LABELS[metric]}: ${compareActivity.name} - ${baseActivity.name}`,
    type: "line",
    data: deltaData,
    smooth: false,
    large: true,
    largeThreshold: 2000,
    itemStyle: { color: DELTA_COLOR },
    lineStyle: { color: DELTA_COLOR, width: 1 },
    symbol: "circle",
    symbolSize: 0,
    showSymbol: false,
    yAxisIndex: deltaMode === "delta-only" ? 0 : metricCount,
    emphasis: {
      focus: "none",
      lineStyle: { width: 1.5 },
      itemStyle: { color: DELTA_COLOR },
      symbol: "circle",
      symbolSize: 0,
    },
    animation: false,
  };
}

