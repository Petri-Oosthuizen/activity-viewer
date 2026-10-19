/**
 * Window Store
 * Applies windowing/trimming to processed data
 */

import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import { storeToRefs } from "pinia";
import type { Activity } from "~/types/activity";
import { useProcessedActivityStore } from "./processedActivity";
import { useChartOptionsStore } from "./chartOptions";
import { filterRecordsByXRange, computeGlobalXExtent, percentWindowToXRange } from "~/utils/windowing";

export interface ChartWindow {
  xStartPercent: number;
  xEndPercent: number;
  yStartPercent: number;
  yEndPercent: number;
}

export const useWindowActivityStore = defineStore("windowActivity", () => {
  const processedStore = useProcessedActivityStore();
  const chartOptionsStore = useChartOptionsStore();
  const { processedActivities } = storeToRefs(processedStore);
  const { xAxisType } = storeToRefs(chartOptionsStore);

  const chartWindow = shallowRef<ChartWindow>({
    xStartPercent: 0,
    xEndPercent: 100,
    yStartPercent: 0,
    yEndPercent: 100,
  });

  // Windowed activities (trimmed based on chart window)
  const windowedActivities = computed<Activity[]>(() => {
    const window = chartWindow.value;
    const isWindowActive = window.xStartPercent > 0 || window.xEndPercent < 100;

    if (!isWindowActive) {
      return processedActivities.value;
    }

    const extent = computeGlobalXExtent(processedActivities.value, xAxisType.value);
    if (!extent) {
      return processedActivities.value;
    }

    const range = percentWindowToXRange(extent, {
      startPercent: window.xStartPercent,
      endPercent: window.xEndPercent,
    });

    return processedActivities.value.map((activity) => {
      const filteredRecords = filterRecordsByXRange(activity, xAxisType.value, range);
      return {
        ...activity,
        records: filteredRecords,
      };
    });
  });

  function setChartWindow(window: ChartWindow) {
    chartWindow.value = window;
  }

  return {
    windowedActivities,
    chartWindow,
    setChartWindow,
  };
});
