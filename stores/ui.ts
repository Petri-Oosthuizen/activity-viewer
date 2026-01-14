/**
 * UI Store
 * Manages UI-specific state (hover synchronization, zoom triggers, layout preferences)
 */

import { defineStore } from "pinia";
import { shallowRef } from "vue";

export interface MapHoverPoint {
  activityId: string;
  recordIndex: number;
  lat: number;
  lon: number;
}

export interface ChartHoverPoint {
  activityId: string;
  recordIndex: number;
}

export const useUIStore = defineStore("ui", () => {
  const mapHoveredPoint = shallowRef<MapHoverPoint | null>(null);
  const chartHoveredPoint = shallowRef<ChartHoverPoint | null>(null);

  const resetZoomTrigger = shallowRef(0);
  const zoomInTrigger = shallowRef(0);
  const zoomOutTrigger = shallowRef(0);

  const chartMapSideBySide = shallowRef(false);

  const overviewDisplayMode = shallowRef<"light" | "full">("light");
  const overviewBaselineEnabled = shallowRef<boolean>(true);
  const overviewBaselineActivityId = shallowRef<string | null>(null);

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

  function resetZoom() {
    resetZoomTrigger.value++;
  }

  function zoomIn() {
    zoomInTrigger.value++;
  }

  function zoomOut() {
    zoomOutTrigger.value++;
  }

  function setChartMapSideBySide(value: boolean) {
    chartMapSideBySide.value = value;
  }

  function setOverviewDisplayMode(mode: "light" | "full") {
    overviewDisplayMode.value = mode;
  }

  function setOverviewBaselineEnabled(enabled: boolean) {
    overviewBaselineEnabled.value = enabled;
  }

  function setOverviewBaselineActivityId(activityId: string | null) {
    overviewBaselineActivityId.value = activityId;
  }

  return {
    mapHoveredPoint,
    chartHoveredPoint,
    resetZoomTrigger,
    zoomInTrigger,
    zoomOutTrigger,
    chartMapSideBySide,
    overviewDisplayMode,
    overviewBaselineEnabled,
    overviewBaselineActivityId,
    setMapHoverPoint,
    clearMapHoverPoint,
    setChartHoverPoint,
    clearChartHoverPoint,
    resetZoom,
    zoomIn,
    zoomOut,
    setChartMapSideBySide,
    setOverviewDisplayMode,
    setOverviewBaselineEnabled,
    setOverviewBaselineActivityId,
  };
});
