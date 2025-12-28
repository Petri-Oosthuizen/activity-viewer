/**
 * Activity Store
 * Central state management for activity data and chart configuration
 */
import { defineStore } from "pinia";
import { shallowRef, computed } from "vue";
import type { Activity, ActivityRecord } from "~/types/activity";
import {
  type MetricType,
  type XAxisType,
  type DeltaMode,
  METRIC_LABELS,
  getAvailableMetrics,
  getMetricAvailability,
  formatXAxisValue,
  generateActivityId,
  getActivityColorByIndex,
} from "~/utils/chart-config";
import {
  buildTooltipConfig as buildTooltipConfigUtil,
  buildDataZoomConfig as buildDataZoomConfigUtil,
  buildXAxisConfig as buildXAxisConfigUtil,
  buildYAxisConfig as buildYAxisConfigUtil,
  buildGridConfig,
  formatTooltipParams,
} from "~/utils/chart-options";
import { generateChartSeries, type SeriesConfig } from "~/utils/chart-series";

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

export const useActivityStore = defineStore("activity", () => {
  // ============================================
  // STATE
  // Using shallowRef for performance with large arrays
  // ============================================

  const activities = shallowRef<Activity[]>([]);
  const xAxisType = shallowRef<XAxisType>("time");
  const selectedMetrics = shallowRef<MetricType[]>(["hr"]);
  const disabledActivities = shallowRef<Set<string>>(new Set());
  const metricSelectionMode = shallowRef<"multi" | "single">("multi");

  // Zoom triggers (incremented to signal zoom actions)
  const resetZoomTrigger = shallowRef(0);
  const zoomInTrigger = shallowRef(0);
  const zoomOutTrigger = shallowRef(0);

  // Hover state for chart-map synchronization
  const mapHoveredPoint = shallowRef<MapHoverPoint | null>(null);
  const chartHoveredPoint = shallowRef<ChartHoverPoint | null>(null);

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
  const availableMetrics = computed(() => {
    const available = getAvailableMetrics(activities.value);
    // Auto-select first available if current selection is invalid
    if (available.length > 0 && !available.includes(selectedMetric.value)) {
      selectedMetrics.value = [available[0]];
    }
    return available;
  });

  /** Map of which activities have which metrics */
  const metricAvailability = computed(() => getMetricAvailability(activities.value));

  /** Active (non-disabled) activities */
  const activeActivities = computed(() =>
    activities.value.filter((a) => !disabledActivities.value.has(a.id)),
  );

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
    };

    return generateChartSeries(config);
  });

  // ============================================
  // CHART OPTIONS
  // ============================================

  const chartOption = computed(() => {
    const metrics =
      selectedMetrics.value.length > 0 ? selectedMetrics.value : ["hr" as MetricType];
    const hasMultipleYAxes =
      metrics.length > 1 || (showDelta.value && activities.value.length >= 2);
    const yAxisCount =
      showDelta.value && activities.value.length >= 2 ? metrics.length + 1 : metrics.length;

    return {
      tooltip: buildTooltipConfigUtil(xAxisType.value, (params) =>
        formatTooltipParams(params, xAxisType.value)
      ),
      legend: {
        data: chartSeries.value.map((s: any) => s.name),
        bottom: 0,
        type: "scroll",
        pageIconColor: "#5470c6",
        pageIconInactiveColor: "#aaa",
      },
      grid: buildGridConfig(hasMultipleYAxes),
      dataZoom: buildDataZoomConfigUtil(metrics.length, yAxisCount),
      xAxis: buildXAxisConfigUtil(xAxisType.value),
      yAxis: buildYAxisConfigUtil(
        metrics,
        showDelta.value,
        deltaMode.value,
        selectedMetric.value,
        activities.value.length >= 2
      ),
      series: chartSeries.value,
    };
  });


  // ============================================
  // ACTIONS
  // ============================================

  function addActivity(records: ActivityRecord[], name: string, startTime?: Date) {
    const id = generateActivityId();
    // Assign color based on index (position in list)
    // Index 0 = blue, index 1 = green, etc. Colors repeat after 10+
    const color = getActivityColorByIndex(activities.value.length);

    activities.value = [...activities.value, { id, name, records, offset: 0, color, startTime }];
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
      // Create new array to trigger reactivity with shallowRef
      activities.value = [
        ...activities.value.slice(0, index),
        { ...activities.value[index], offset },
        ...activities.value.slice(index + 1),
      ];
    }
  }

  function clearAll() {
    activities.value = [];
    disabledActivities.value = new Set();
    selectedMetrics.value = ["hr"];
    showDelta.value = false;
    deltaBaseActivityId.value = null;
    deltaCompareActivityId.value = null;
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

  function setShowDelta(value: boolean) {
    showDelta.value = value;
    if (value && activities.value.length >= 2) {
      if (!deltaBaseActivityId.value) {
        deltaBaseActivityId.value = activities.value[0].id;
      }
      if (!deltaCompareActivityId.value) {
        deltaCompareActivityId.value = activities.value[1].id;
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
      selectedMetrics.value = [selectedMetrics.value[0]];
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
    showDelta,
    deltaMode,
    deltaBaseActivityId,
    deltaCompareActivityId,
    chartMapSideBySide,
    metricSelectionMode,

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
    setShowDelta,
    setDeltaMode,
    setDeltaBaseActivity,
    setDeltaCompareActivity,
    toggleActivity,
    isActivityDisabled,
    setMetricSelectionMode,
  };
});
