/**
 * Chart series generation utilities
 * Pure functions for generating ECharts series configurations
 */

import type { Activity } from "~/types/activity";
import type { MetricType, XAxisType, DeltaMode, ChartDataPoint } from "./chart-config";
import { METRIC_LABELS, activityHasMetric } from "./chart-config";
import { buildDeltaSeries, type DeltaSeriesConfig } from "./delta-calculator";
import type { ChartTransformSettings } from "~/utils/chart-settings";
import { buildPivotZonesForActivities, buildTransformedChartData } from "~/utils/series-transforms";

export interface SeriesConfig {
  activities: Activity[];
  disabledActivityIds: Set<string>;
  metrics: MetricType[];
  xAxisType: XAxisType;
  showDelta: boolean;
  deltaMode: DeltaMode;
  deltaBaseActivityId: string | null;
  deltaCompareActivityId: string | null;
  transforms: ChartTransformSettings;
}

export interface EChartsSeries {
  // ECharts allows multiple data shapes (e.g. category labels for bar charts).
  data: Array<ChartDataPoint | [string, number | null] | number | null>;
  id?: string;
  activityId?: string;
  metric?: MetricType;
  name: string;
  type: string;
  smooth: boolean;
  large: boolean;
  largeThreshold: number;
  itemStyle: { color: string };
  lineStyle: { color: string; width: number; type?: "solid" | "dashed" | "dotted" | "dashDot" };
  symbol: string;
  symbolSize: number;
  showSymbol: boolean;
  yAxisIndex: number;
  emphasis: {
    focus: string;
    lineStyle: { width: number; type?: "solid" | "dashed" | "dotted" | "dashDot" };
    itemStyle: { color: string };
    symbol: string;
    symbolSize: number;
  };
  animation: boolean;
}

/**
 * Generate base series for all activities and metrics
 */
const METRIC_LINE_STYLES: Readonly<Record<MetricType, "solid" | "dashed" | "dotted" | "dashDot">> = {
  alt: "solid",
  hr: "dashed",
  pwr: "dotted",
  cad: "dashDot",
  pace: "solid",
  speed: "solid",
  temp: "dashed",
  grade: "dotted",
  verticalSpeed: "dashDot",
} as const;

export function generateBaseSeries(
  activities: Activity[],
  disabledActivityIds: Set<string>,
  metrics: MetricType[],
  xAxisType: XAxisType,
  transforms: ChartTransformSettings,
): EChartsSeries[] {
  const series: EChartsSeries[] = [];
  const activeActivities = activities.filter((a) => !disabledActivityIds.has(a.id));
  const useMetricLineStyles = metrics.length > 1;

  metrics.forEach((metric, metricIndex) => {
    activeActivities.forEach((activity) => {
      if (!activityHasMetric(activity, metric)) return;

      const data = buildTransformedChartData(activity, metric, xAxisType, transforms);
      const lineStyleType = useMetricLineStyles ? METRIC_LINE_STYLES[metric] : "solid";

      series.push({
        id: `${activity.id}:${metric}:${xAxisType}`,
        activityId: activity.id,
        metric,
        name: `${activity.name} - ${METRIC_LABELS[metric]}`,
        type: "line",
        data,
        smooth: transforms.smoothing.mode !== "off",
        large: true,
        largeThreshold: 2000,
        itemStyle: { color: activity.color },
        lineStyle: { color: activity.color, width: 1, type: lineStyleType },
        symbol: "circle",
        symbolSize: 0,
        showSymbol: false,
        yAxisIndex: metricIndex,
        emphasis: {
          focus: "none",
          lineStyle: { width: 1.5, type: lineStyleType },
          itemStyle: { color: activity.color },
          symbol: "circle",
          symbolSize: 6,
        },
        animation: true,
      });
    });
  });

  return series;
}

/**
 * Generate complete chart series including delta if enabled
 */
export function generateChartSeries(config: SeriesConfig): EChartsSeries[] {
  const {
    activities,
    disabledActivityIds,
    metrics,
    xAxisType,
    showDelta,
    deltaMode,
    deltaBaseActivityId,
    deltaCompareActivityId,
    transforms,
  } = config;

  // Return empty array if no active activities
  const activeActivities = activities.filter((a) => !disabledActivityIds.has(a.id));
  if (activeActivities.length === 0) {
    return [];
  }

  // Pivot mode: zone distribution (time spent in each zone)
  if (transforms.viewMode === "pivotZones") {
    const metric = metrics[0] ?? "hr";
    const pivot = buildPivotZonesForActivities(activeActivities, metric, transforms);
    if (!pivot) return [];

    return activeActivities.map((activity) => {
      const totals = pivot.totalsSecondsByActivityId[activity.id] ?? [];
      const totalSeconds = totals.reduce((acc, v) => acc + v, 0);
      const data: Array<[number, number]> = totals.map((seconds, idx) => {
        const pct = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
        return [idx, pct];
      });

      return {
        id: `${activity.id}:${metric}:pivotZones`,
        activityId: activity.id,
        metric,
        name: `${activity.name} - ${METRIC_LABELS[metric]}`,
        type: "bar",
        data,
        smooth: false,
        large: true,
        largeThreshold: 2000,
        itemStyle: { color: activity.color },
        lineStyle: { color: activity.color, width: 1 },
        symbol: "circle",
        symbolSize: 0,
        showSymbol: false,
        yAxisIndex: 0,
        emphasis: {
          focus: "none",
          lineStyle: { width: 1.5 },
          itemStyle: { color: activity.color },
          symbol: "circle",
          symbolSize: 6,
        },
        animation: true,
      };
    });
  }

  // Generate base series
  const series = generateBaseSeries(
    activities,
    disabledActivityIds,
    metrics,
    xAxisType,
    transforms,
  );

  // Add delta series if enabled
  if (showDelta && series.length >= 2) {
    const effectiveBaseId = deltaBaseActivityId || activeActivities[0]?.id;
    const effectiveCompareId = deltaCompareActivityId || activeActivities[1]?.id;

    const baseActivity = activeActivities.find((a) => a.id === effectiveBaseId);
    const compareActivity = activeActivities.find((a) => a.id === effectiveCompareId);

    if (baseActivity && compareActivity) {
      // Find series for each activity
      const baseSeriesIdx = series.findIndex((s) => s.name?.startsWith(baseActivity.name));
      const compareSeriesIdx = series.findIndex((s) => s.name?.startsWith(compareActivity.name));

      if (baseSeriesIdx !== -1 && compareSeriesIdx !== -1) {
        // Get the metric from the series name (assumes first metric for delta)
        const metric = metrics[0] || "hr";

        const baseSeries = series[baseSeriesIdx];
        const compareSeries = series[compareSeriesIdx];

        if (!baseSeries || !compareSeries) return series;

        // Type assertion: delta calculation expects ChartDataPoint[]
        // but EChartsSeries.data is a union type that includes ChartDataPoint[]
        const baseSeriesData = baseSeries.data as ChartDataPoint[];
        const compareSeriesData = compareSeries.data as ChartDataPoint[];

        const deltaConfig: DeltaSeriesConfig = {
          baseActivity,
          compareActivity,
          baseSeriesData,
          compareSeriesData,
          metric,
          metricCount: metrics.length,
          deltaMode,
        };

        const deltaSeries = buildDeltaSeries(deltaConfig);

        if (deltaMode === "delta-only") {
          return [deltaSeries];
        }
        series.push(deltaSeries);
      }
    }
  }

  return series;
}
