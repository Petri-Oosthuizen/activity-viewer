/**
 * Chart Series Store
 * Converts internal data model to charting library format
 */

import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import { storeToRefs } from "pinia";
import type { Activity } from "~/types/activity";
import { useWindowActivityStore } from "./windowActivity";
import { useChartOptionsStore } from "./chartOptions";
import { useActivitySettingsStore } from "./activitySettings";
import { generateChartSeries, type EChartsSeries, type SeriesConfig } from "~/utils/chart-series";
import {
  buildTooltipConfig,
  buildDataZoomConfig,
  buildXAxisConfig,
  buildYAxisConfig,
  buildGridConfig,
  formatTooltipParams,
} from "~/utils/chart-options";
import { buildPivotZonesForActivities } from "~/utils/series-transforms";
import type {
  ChartTransformSettings,
  CumulativeSettings,
  PivotZonesSettings,
} from "~/utils/chart-settings";
import { DEFAULT_CHART_TRANSFORM_SETTINGS } from "~/utils/chart-settings";
import type { MetricType } from "~/utils/chart-config";
import { METRIC_LABELS } from "~/utils/chart-config";
import type { DeltaMode } from "~/utils/chart-config";

export const useChartSeriesStore = defineStore("chartSeries", () => {
  const windowStore = useWindowActivityStore();
  const chartOptionsStore = useChartOptionsStore();
  const settingsStore = useActivitySettingsStore();

  const { windowedActivities } = storeToRefs(windowStore);
  const { selectedMetrics, viewMode, xAxisType } = storeToRefs(chartOptionsStore);
  const { disabledActivities, deltaSettings } = storeToRefs(settingsStore);

  // Transformation settings (cumulative, pivot zones)
  // Note: Smoothing is now handled in the processing pipeline (activitySettingsStore)
  // Note: viewMode comes from chartOptionsStore
  const transformationSettings = shallowRef<{
    cumulative: CumulativeSettings;
    pivotZones: PivotZonesSettings;
  }>({
    cumulative: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.cumulative },
    pivotZones: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.pivotZones },
  });

  // Chart series (ECharts format)
  const chartSeries = computed<EChartsSeries[]>(() => {
    const metrics = selectedMetrics.value.length > 0 ? selectedMetrics.value : ["hr" as MetricType];

    // Build full ChartTransformSettings for generateChartSeries
    // (includes viewMode from chartOptionsStore and transformation settings)
    // Note: Smoothing and outliers are now handled in the processing pipeline
    const transforms: ChartTransformSettings = {
      viewMode: viewMode.value,
      outliers: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.outliers }, // Outliers handled in processing pipeline
      smoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.smoothing }, // Smoothing handled in processing pipeline
      gpsSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.gpsSmoothing }, // GPS smoothing handled in processing pipeline
      paceSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.paceSmoothing }, // Pace smoothing handled in processing pipeline
      cumulative: transformationSettings.value.cumulative,
      pivotZones: transformationSettings.value.pivotZones,
    };

    const config: SeriesConfig = {
      activities: windowedActivities.value,
      disabledActivityIds: disabledActivities.value,
      metrics,
      xAxisType: xAxisType.value,
      showDelta: deltaSettings.value.enabled,
      deltaMode: deltaSettings.value.mode as DeltaMode,
      deltaBaseActivityId: deltaSettings.value.baseActivityId,
      deltaCompareActivityId: deltaSettings.value.compareActivityId,
      transforms,
    };

    return generateChartSeries(config);
  });

  // Chart options (full ECharts configuration)
  const chartOption = computed(() => {
    const metrics = selectedMetrics.value.length > 0 ? selectedMetrics.value : ["hr" as MetricType];

    // Build full ChartTransformSettings for chart option building
    // Note: Smoothing and outliers are now handled in the processing pipeline
    const transforms: ChartTransformSettings = {
      viewMode: viewMode.value,
      outliers: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.outliers },
      smoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.smoothing }, // Smoothing handled in processing pipeline
      gpsSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.gpsSmoothing },
      paceSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.paceSmoothing },
      cumulative: transformationSettings.value.cumulative,
      pivotZones: transformationSettings.value.pivotZones,
    };

    if (transforms.viewMode === "pivotZones") {
      const metric =
        (chartSeries.value[0]?.metric as MetricType | undefined) ??
        selectedMetrics.value[0] ??
        "hr";
      const activeActivities = windowedActivities.value.filter(
        (a) => !disabledActivities.value.has(a.id),
      );
      const pivot = buildPivotZonesForActivities(activeActivities, metric, transforms);
      const bucketLabels = pivot?.bucketLabels ?? [];

      return {
        tooltip: buildTooltipConfig(xAxisType.value, (params) =>
          formatTooltipParams(params, xAxisType.value),
        ),
        legend: { show: false },
        grid: {
          ...buildGridConfig(false),
          bottom: "5%",
        },
        dataZoom: [],
        xAxis: {
          type: "category",
          data: bucketLabels,
          axisLabel: {
            show: true,
            rotate: bucketLabels.length > 10 ? 45 : 0,
            interval: 0,
          },
        },
        yAxis: {
          type: "value",
          show: true,
          scale: false,
          min: 0,
          axisLabel: { show: true, formatter: (v: number | string) => `${Number(v).toFixed(0)}%` },
        },
        series: chartSeries.value,
      };
    }

    const hasMultipleYAxes =
      metrics.length > 1 || (deltaSettings.value.enabled && windowedActivities.value.length >= 2);

    const baseXAxisConfig = buildXAxisConfig(xAxisType.value);

    // Calculate X extent from series
    let xExtent: { min: number; max: number } | undefined;
    let minX = Infinity;
    let maxX = -Infinity;
    let hasData = false;

    for (const s of chartSeries.value) {
      const data = s.data;
      if (!Array.isArray(data)) continue;

      for (const point of data) {
        if (!Array.isArray(point) || point.length < 1) continue;
        const x = point[0];
        if (typeof x === "number" && Number.isFinite(x)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          hasData = true;
        }
      }
    }

    if (hasData && Number.isFinite(minX) && Number.isFinite(maxX) && minX !== maxX) {
      xExtent = { min: minX, max: maxX };
    }

    const xAxisConfig =
      xExtent !== undefined
        ? { ...baseXAxisConfig, min: xExtent.min, max: xExtent.max }
        : baseXAxisConfig;

    return {
      tooltip: buildTooltipConfig(xAxisType.value, (params) =>
        formatTooltipParams(params, xAxisType.value),
      ),
      legend: { show: false },
      grid: buildGridConfig(hasMultipleYAxes),
      dataZoom: buildDataZoomConfig(metrics.length, hasMultipleYAxes ? 2 : 1),
      xAxis: xAxisConfig,
      yAxis: buildYAxisConfig(
        metrics,
        deltaSettings.value.enabled,
        deltaSettings.value.mode as DeltaMode,
        selectedMetrics.value[0] ?? "hr",
        windowedActivities.value.length >= 2,
      ),
      series: chartSeries.value,
    };
  });

  function setTransformationSettings(settings: {
    cumulative: CumulativeSettings;
    pivotZones: PivotZonesSettings;
  }) {
    transformationSettings.value = {
      cumulative: { ...settings.cumulative },
      pivotZones: { ...settings.pivotZones },
    };
  }

  return {
    chartSeries,
    chartOption,
    transformationSettings,
    setTransformationSettings,
  };
});
