/**
 * Chart series generation utilities
 * Pure functions for generating ECharts series configurations
 */

import type { Activity } from "~/types/activity";
import type { MetricType, XAxisType, DeltaMode, ChartDataPoint } from "./chart-config";
import { METRIC_LABELS, activityHasMetric, transformToChartData } from "./chart-config";
import { buildDeltaSeries, type DeltaSeriesConfig } from "./delta-calculator";

export interface SeriesConfig {
  activities: Activity[];
  disabledActivityIds: Set<string>;
  metrics: MetricType[];
  xAxisType: XAxisType;
  showDelta: boolean;
  deltaMode: DeltaMode;
  deltaBaseActivityId: string | null;
  deltaCompareActivityId: string | null;
}

export interface EChartsSeries {
  name: string;
  type: string;
  data: ChartDataPoint[];
  smooth: boolean;
  large: boolean;
  largeThreshold: number;
  itemStyle: { color: string };
  lineStyle: { color: string; width: number };
  symbol: string;
  symbolSize: number;
  showSymbol: boolean;
  yAxisIndex: number;
  emphasis: {
    focus: string;
    lineStyle: { width: number };
    itemStyle: { color: string };
    symbol: string;
    symbolSize: number;
  };
  animation: boolean;
}

/**
 * Generate base series for all activities and metrics
 */
export function generateBaseSeries(
  activities: Activity[],
  disabledActivityIds: Set<string>,
  metrics: MetricType[],
  xAxisType: XAxisType
): EChartsSeries[] {
  const series: EChartsSeries[] = [];
  const activeActivities = activities.filter((a) => !disabledActivityIds.has(a.id));

  metrics.forEach((metric, metricIndex) => {
    activeActivities.forEach((activity) => {
      if (!activityHasMetric(activity, metric)) return;

      const data = transformToChartData(activity, metric, xAxisType);

      series.push({
        name: `${activity.name} - ${METRIC_LABELS[metric]}`,
        type: "line",
        data,
        smooth: false,
        large: true,
        largeThreshold: 2000,
        itemStyle: { color: activity.color },
        lineStyle: { color: activity.color, width: 1 },
        symbol: "circle",
        symbolSize: 0,
        showSymbol: false,
        yAxisIndex: metricIndex,
        emphasis: {
          focus: "none",
          lineStyle: { width: 1.5 },
          itemStyle: { color: activity.color },
          symbol: "circle",
          symbolSize: 6,
        },
        animation: false,
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
  } = config;

  // Return empty array if no active activities
  const activeActivities = activities.filter((a) => !disabledActivityIds.has(a.id));
  if (activeActivities.length === 0) {
    return [];
  }

  // Generate base series
  const series = generateBaseSeries(activities, disabledActivityIds, metrics, xAxisType);

  // Add delta series if enabled
  if (showDelta && series.length >= 2) {
    const baseId = deltaBaseActivityId || activities[0]?.id;
    const compareId = deltaCompareActivityId || activities[1]?.id;

    const baseActivity = activities.find((a) => a.id === baseId);
    const compareActivity = activities.find((a) => a.id === compareId);

    if (
      baseActivity &&
      compareActivity &&
      !disabledActivityIds.has(baseActivity.id) &&
      !disabledActivityIds.has(compareActivity.id)
    ) {
      // Find series for each activity
      const baseSeriesIdx = series.findIndex((s) => s.name?.startsWith(baseActivity.name));
      const compareSeriesIdx = series.findIndex((s) => s.name?.startsWith(compareActivity.name));

      if (baseSeriesIdx !== -1 && compareSeriesIdx !== -1) {
        // Get the metric from the series name (assumes first metric for delta)
        const metric = metrics[0] || "hr";

        const deltaConfig: DeltaSeriesConfig = {
          baseActivity,
          compareActivity,
          baseSeriesData: series[baseSeriesIdx].data,
          compareSeriesData: series[compareSeriesIdx].data,
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

