/**
 * Window Store
 * Applies windowing/trimming to transformed data
 */

import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import { storeToRefs } from "pinia";
import type { Activity } from "~/types/activity";
import { useTransformedActivityStore } from "./transformedActivity";
import { useChartOptionsStore } from "./chartOptions";
import { filterRecordsByXRange, computeGlobalXExtent, percentWindowToXRange } from "~/utils/windowing";

export interface ChartWindow {
  xStartPercent: number;
  xEndPercent: number;
  yStartPercent: number;
  yEndPercent: number;
}

export const useWindowActivityStore = defineStore("windowActivity", () => {
  const transformedStore = useTransformedActivityStore();
  const chartOptionsStore = useChartOptionsStore();
  const { transformedActivities } = storeToRefs(transformedStore);
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
      return transformedActivities.value;
    }

    const extent = computeGlobalXExtent(transformedActivities.value, xAxisType.value);
    if (!extent) {
      return transformedActivities.value;
    }

    const range = percentWindowToXRange(extent, {
      startPercent: window.xStartPercent,
      endPercent: window.xEndPercent,
    });

    return transformedActivities.value.map((activity) => {
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
