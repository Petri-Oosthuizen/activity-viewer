/**
 * Activity Store
 * Central state management for activity data and chart configuration
 */
import { defineStore } from "pinia";
import { shallowRef, computed, watch } from "vue";
import type { Activity, ActivityRecord } from "~/types/activity";
import {
  type MetricType,
  type XAxisType,
  type DeltaMode,
  METRIC_LABELS,
  getAvailableMetrics,
  getMetricAvailability,
  generateActivityId,
  getActivityColorByIndex,
} from "~/utils/chart-config";
import {
  DEFAULT_CHART_TRANSFORM_SETTINGS,
  type ChartTransformSettings,
} from "~/utils/chart-settings";
import {
  buildTooltipConfig as buildTooltipConfigUtil,
  buildDataZoomConfig as buildDataZoomConfigUtil,
  buildXAxisConfig as buildXAxisConfigUtil,
  buildYAxisConfig as buildYAxisConfigUtil,
  buildGridConfig,
  formatTooltipParams,
  formatAxisNumber,
} from "~/utils/chart-options";
import { generateChartSeries, type SeriesConfig, type EChartsSeries } from "~/utils/chart-series";
import { buildPivotZonesForActivities } from "~/utils/series-transforms";
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import { DEFAULT_GPS_DISTANCE_OPTIONS, filterGpsDistanceDeltaMeters } from "~/utils/gps-distance";

/** Point being hovered on the map */
export interface MapHoverPoint {
  activityId: string;
  recordIndex: number;
  lat: number;
  lon: number;
}

/** Point being hovered on the chart */
export interface ChartHoverPoint {
  activityId: string;
  recordIndex: number;
}

export interface ChartWindow {
  xStartPercent: number;
  xEndPercent: number;
  yStartPercent: number;
  yEndPercent: number;
}

export const useActivityStore = defineStore("activity", () => {
  // ============================================
  // STATE
  // Using shallowRef for performance with large arrays
  // ============================================

  const activities = shallowRef<Activity[]>([]);
  // Improved default: distance-based comparison is usually the most intuitive.
  const xAxisType = shallowRef<XAxisType>("distance");
  // Default metric: altitude (when available)
  const selectedMetrics = shallowRef<MetricType[]>(["alt"]);
  const disabledActivities = shallowRef<Set<string>>(new Set());
  const metricSelectionMode = shallowRef<"multi" | "single">("single");

  // GPX/TCX GPS-derived distance processing options (applies to GPX, and TCX when no device distance).
  const gpsDistanceOptions = shallowRef<GpsDistanceOptions>({ ...DEFAULT_GPS_DISTANCE_OPTIONS });

  // Data transforms / rendering mode
  const chartTransforms = shallowRef<ChartTransformSettings>({
    ...DEFAULT_CHART_TRANSFORM_SETTINGS,
    outliers: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.outliers },
    smoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.smoothing },
    gpsSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.gpsSmoothing },
    paceSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.paceSmoothing },
    cumulative: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.cumulative },
    pivotZones: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.pivotZones },
  });

  // Zoom triggers (incremented to signal zoom actions)
  const resetZoomTrigger = shallowRef(0);
  const zoomInTrigger = shallowRef(0);
  const zoomOutTrigger = shallowRef(0);

  // Hover state for chart-map synchronization
  const mapHoveredPoint = shallowRef<MapHoverPoint | null>(null);
  const chartHoveredPoint = shallowRef<ChartHoverPoint | null>(null);

  // Current zoom/pan window (percentages of full extent)
  const chartWindow = shallowRef<ChartWindow>({
    xStartPercent: 0,
    xEndPercent: 100,
    yStartPercent: 0,
    yEndPercent: 100,
  });

  // Delta comparison settings
  const showDelta = shallowRef(false);
  const deltaMode = shallowRef<DeltaMode>("overlay");
  const deltaBaseActivityId = shallowRef<string | null>(null);
  const deltaCompareActivityId = shallowRef<string | null>(null);

  // Layout preference: side-by-side or stacked
  const chartMapSideBySide = shallowRef(false);

  // ============================================
  // COMPUTED
  // ============================================

  /** Currently selected metric (first in list) */
  const selectedMetric = computed(() => selectedMetrics.value[0] ?? "hr");

  /** Metrics available across all loaded activities */
  const availableMetrics = computed(() => getAvailableMetrics(activities.value));

  // Keep selection valid without side-effects in computed().
  watch(
    [activities, selectedMetrics],
    () => {
      const available = getAvailableMetrics(activities.value);
      const current = selectedMetrics.value[0];
      if (available.length > 0 && (!current || !available.includes(current))) {
        const firstAvailable = available[0];
        if (firstAvailable) {
          selectedMetrics.value = [firstAvailable];
        }
      }
    },
    { deep: false, immediate: true, flush: "sync" },
  );

  /** Map of which activities have which metrics */
  const metricAvailability = computed(() => getMetricAvailability(activities.value));

  // ============================================
  // CHART SERIES GENERATION
  // ============================================

  const chartSeries = computed(() => {
    const metrics = selectedMetrics.value.length > 0 ? selectedMetrics.value : ["hr" as MetricType];

    const config: SeriesConfig = {
      activities: activities.value,
      disabledActivityIds: disabledActivities.value,
      metrics,
      xAxisType: xAxisType.value,
      showDelta: showDelta.value,
      deltaMode: deltaMode.value,
      deltaBaseActivityId: deltaBaseActivityId.value,
      deltaCompareActivityId: deltaCompareActivityId.value,
      transforms: chartTransforms.value,
    };

    return generateChartSeries(config);
  });

  function calculateXExtentFromSeries(
    series: EChartsSeries[],
  ): { min: number; max: number } | undefined {
    let minX = Infinity;
    let maxX = -Infinity;
    let hasData = false;

    for (const s of series) {
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

    if (!hasData || !Number.isFinite(minX) || !Number.isFinite(maxX) || minX === maxX)
      return undefined;
    return { min: minX, max: maxX };
  }

  // ============================================
  // CHART OPTIONS
  // ============================================

  const chartOption = computed(() => {
    const metrics = selectedMetrics.value.length > 0 ? selectedMetrics.value : ["hr" as MetricType];
    const transforms = chartTransforms.value;

    if (transforms.viewMode === "pivotZones") {
      const metric =
        (chartSeries.value[0]?.metric as MetricType | undefined) ?? selectedMetric.value;
      const activeActivities = activities.value.filter((a) => !disabledActivities.value.has(a.id));
      const pivot = buildPivotZonesForActivities(activeActivities, metric, transforms);
      const bucketLabels = pivot?.bucketLabels ?? [];

      return {
        tooltip: buildTooltipConfigUtil(xAxisType.value, (params) =>
          formatTooltipParams(params, xAxisType.value),
        ),
        legend: {
          show: false,
        },
        grid: {
          ...buildGridConfig(false),
          bottom: "15%",
        },
        dataZoom: [],
        xAxis: {
          type: "category",
          data: bucketLabels,
          name: METRIC_LABELS[metric],
          nameLocation: "middle",
          nameGap: bucketLabels.length > 10 ? 50 : 35,
          axisLabel: {
            show: true,
            rotate: bucketLabels.length > 10 ? 45 : 0,
            interval: 0,
          },
        },
        yAxis: {
          type: "value",
          show: true,
          name: "Time (%)",
          nameLocation: "middle",
          nameGap: 40,
          nameRotate: 90,
          scale: false,
          min: 0,
          axisLabel: { show: true, formatter: (v: number | string) => `${Number(v).toFixed(0)}%` },
        },
        series: chartSeries.value,
      };
    }

    const hasMultipleYAxes =
      metrics.length > 1 || (showDelta.value && activities.value.length >= 2);

    const baseXAxisConfig = buildXAxisConfigUtil(xAxisType.value);
    const xExtent = calculateXExtentFromSeries(chartSeries.value);

    const xAxisConfig =
      xExtent !== undefined
        ? { ...baseXAxisConfig, min: xExtent.min, max: xExtent.max }
        : baseXAxisConfig;

    return {
      tooltip: buildTooltipConfigUtil(xAxisType.value, (params) =>
        formatTooltipParams(params, xAxisType.value),
      ),
      legend: {
        show: false,
      },
      grid: buildGridConfig(hasMultipleYAxes),
      dataZoom: buildDataZoomConfigUtil(metrics.length, hasMultipleYAxes ? 2 : 1),
      xAxis: xAxisConfig,
      yAxis: buildYAxisConfigUtil(
        metrics,
        showDelta.value,
        deltaMode.value,
        selectedMetric.value,
        activities.value.length >= 2,
      ),
      series: chartSeries.value,
    };
  });

  // ============================================
  // ACTIONS
  // ============================================

  function addActivity(
    records: ActivityRecord[],
    name: string,
    startTime?: Date,
    sourceType?: Activity["sourceType"],
    calories?: number,
  ) {
    const id = generateActivityId();
    // Assign color based on index (position in list)
    // Index 0 = blue, index 1 = green, etc. Colors repeat after 10+
    const color = getActivityColorByIndex(activities.value.length);

    activities.value = [
      ...activities.value,
      { id, name, records, sourceType, offset: 0, scale: 1, color, startTime, calories },
    ];
  }

  function setGpsDistanceOptions(next: Partial<GpsDistanceOptions>) {
    gpsDistanceOptions.value = { ...gpsDistanceOptions.value, ...next };
    recomputeGpsDerivedDistances();
  }

  function recomputeGpsDerivedDistances() {
    const opts = gpsDistanceOptions.value;
    const nextActivities: Activity[] = [];

    for (const activity of activities.value) {
      if (activity.sourceType !== "gpx") {
        nextActivities.push(activity);
        continue;
      }

      let cumulative = 0;
      const nextRecords: ActivityRecord[] = [];
      for (let i = 0; i < activity.records.length; i++) {
        const r = activity.records[i]!;
        if (i > 0) {
          const prev = activity.records[i - 1]!;
          if (
            prev.lat !== undefined &&
            prev.lon !== undefined &&
            r.lat !== undefined &&
            r.lon !== undefined
          ) {
            cumulative += filterGpsDistanceDeltaMeters(
              { lat: prev.lat, lon: prev.lon, t: prev.t, alt: prev.alt },
              { lat: r.lat, lon: r.lon, t: r.t, alt: r.alt },
              opts,
            );
          }
        }
        nextRecords.push({ ...r, d: Math.max(0, cumulative) });
      }

      nextActivities.push({ ...activity, records: nextRecords });
    }

    activities.value = nextActivities;
  }

  function removeActivity(id: string) {
    activities.value = activities.value.filter((a) => a.id !== id);
    // Reassign colors based on new indices to maintain index-based color scheme
    activities.value = activities.value.map((activity, index) => ({
      ...activity,
      color: getActivityColorByIndex(index),
    }));
    // Clean up disabled set
    if (disabledActivities.value.has(id)) {
      const newSet = new Set(disabledActivities.value);
      newSet.delete(id);
      disabledActivities.value = newSet;
    }
  }

  function updateOffset(id: string, offset: number) {
    const index = activities.value.findIndex((a) => a.id === id);
    if (index !== -1) {
      const activity = activities.value[index];
      if (activity) {
        // Create new array to trigger reactivity with shallowRef
        activities.value = [
          ...activities.value.slice(0, index),
          { ...activity, offset },
          ...activities.value.slice(index + 1),
        ];
      }
    }
  }

  function updateScale(id: string, scale: number) {
    const index = activities.value.findIndex((a) => a.id === id);
    if (index !== -1) {
      const activity = activities.value[index];
      if (activity) {
        activities.value = [
          ...activities.value.slice(0, index),
          { ...activity, scale },
          ...activities.value.slice(index + 1),
        ];
      }
    }
  }

  function setChartTransforms(next: ChartTransformSettings) {
    chartTransforms.value = {
      ...next,
      outliers: { ...next.outliers },
      smoothing: { ...next.smoothing },
      gpsSmoothing: { ...next.gpsSmoothing },
      paceSmoothing: { ...next.paceSmoothing },
      cumulative: { ...next.cumulative },
      pivotZones: { ...next.pivotZones },
    };
  }

  function clearAll() {
    activities.value = [];
    disabledActivities.value = new Set();
    selectedMetrics.value = ["alt"];
    xAxisType.value = "distance";
    gpsDistanceOptions.value = { ...DEFAULT_GPS_DISTANCE_OPTIONS };
    chartTransforms.value = {
      ...DEFAULT_CHART_TRANSFORM_SETTINGS,
      outliers: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.outliers },
      smoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.smoothing },
      gpsSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.gpsSmoothing },
      paceSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.paceSmoothing },
      cumulative: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.cumulative },
      pivotZones: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.pivotZones },
    };
    showDelta.value = false;
    deltaBaseActivityId.value = null;
    deltaCompareActivityId.value = null;
    chartWindow.value = { xStartPercent: 0, xEndPercent: 100, yStartPercent: 0, yEndPercent: 100 };
  }

  function setXAxisType(type: XAxisType) {
    xAxisType.value = type;
  }

  function toggleMetric(metric: MetricType) {
    if (metricSelectionMode.value === "single") {
      // Single selection mode: replace current selection
      selectedMetrics.value = [metric];
    } else {
      // Multi-selection mode: toggle
      if (selectedMetrics.value.includes(metric)) {
        // Prevent deselecting if it's the only selected metric
        if (selectedMetrics.value.length > 1) {
          selectedMetrics.value = selectedMetrics.value.filter((m) => m !== metric);
        }
      } else {
        selectedMetrics.value = [...selectedMetrics.value, metric];
      }
    }
  }

  function setMetric(metric: MetricType) {
    selectedMetrics.value = [metric];
  }

  function resetZoom() {
    resetZoomTrigger.value++;
  }

  function zoomIn() {
    zoomInTrigger.value++;
  }

  function zoomOut() {
    zoomOutTrigger.value++;
  }

  function setMapHoverPoint(point: MapHoverPoint | null) {
    mapHoveredPoint.value = point;
  }

  function clearMapHoverPoint() {
    mapHoveredPoint.value = null;
  }

  function setChartHoverPoint(point: ChartHoverPoint | null) {
    chartHoveredPoint.value = point;
  }

  function clearChartHoverPoint() {
    chartHoveredPoint.value = null;
  }

  function setChartWindow(next: ChartWindow) {
    chartWindow.value = next;
  }

  function setShowDelta(value: boolean) {
    showDelta.value = value;
    if (value && activities.value.length >= 2) {
      const first = activities.value[0];
      const second = activities.value[1];
      if (!deltaBaseActivityId.value && first) {
        deltaBaseActivityId.value = first.id;
      }
      if (!deltaCompareActivityId.value && second) {
        deltaCompareActivityId.value = second.id;
      }
    }
  }

  function setDeltaMode(mode: DeltaMode) {
    deltaMode.value = mode;
  }

  function setDeltaBaseActivity(id: string | null) {
    deltaBaseActivityId.value = id;
  }

  function setDeltaCompareActivity(id: string | null) {
    deltaCompareActivityId.value = id;
  }

  function toggleActivity(id: string) {
    const newSet = new Set(disabledActivities.value);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    disabledActivities.value = newSet;
  }

  function setMetricSelectionMode(mode: "multi" | "single") {
    metricSelectionMode.value = mode;
    if (mode === "single" && selectedMetrics.value.length > 1) {
      // When switching to single mode, keep only the first selected metric
      const firstMetric = selectedMetrics.value[0];
      if (firstMetric) {
        selectedMetrics.value = [firstMetric];
      }
    }
  }

  function isActivityDisabled(id: string): boolean {
    return disabledActivities.value.has(id);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // State
    activities,
    xAxisType,
    selectedMetric,
    selectedMetrics,
    metricAvailability,
    availableMetrics,
    disabledActivities,
    resetZoomTrigger,
    zoomInTrigger,
    zoomOutTrigger,
    mapHoveredPoint,
    chartHoveredPoint,
    chartWindow,
    showDelta,
    deltaMode,
    deltaBaseActivityId,
    deltaCompareActivityId,
    chartMapSideBySide,
    metricSelectionMode,
    chartTransforms,
    gpsDistanceOptions,

    // Actions
    setChartMapSideBySide: (value: boolean) => {
      chartMapSideBySide.value = value;
    },

    // Computed
    chartSeries,
    chartOption,

    // Constants
    metricLabels: METRIC_LABELS,

    // Actions
    addActivity,
    removeActivity,
    updateOffset,
    updateScale,
    setChartTransforms,
    clearAll,
    setXAxisType,
    setMetric,
    toggleMetric,
    resetZoom,
    zoomIn,
    zoomOut,
    setMapHoverPoint,
    clearMapHoverPoint,
    setChartHoverPoint,
    clearChartHoverPoint,
    setChartWindow,
    setShowDelta,
    setDeltaMode,
    setDeltaBaseActivity,
    setDeltaCompareActivity,
    toggleActivity,
    isActivityDisabled,
    setMetricSelectionMode,
    setGpsDistanceOptions,
  };
});
