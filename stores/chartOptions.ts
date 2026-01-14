/**
 * Chart Options Store
 * Manages chart display configuration (metric selection and view mode)
 */

import { defineStore } from "pinia";
import { computed, shallowRef, watch } from "vue";
import type { MetricType, XAxisType } from "~/utils/chart-config";
import type { ChartViewMode } from "~/utils/chart-settings";
import { getAvailableMetrics } from "~/utils/chart-config";
import { useProcessedActivityStore } from "./processedActivity";
import { storeToRefs } from "pinia";

export const useChartOptionsStore = defineStore("chartOptions", () => {
  const processedStore = useProcessedActivityStore();
  const { processedActivities } = storeToRefs(processedStore);

  const selectedMetrics = shallowRef<MetricType[]>(["alt"]);
  const xAxisType = shallowRef<XAxisType>("distance");
  const viewMode = shallowRef<ChartViewMode>("timeseries");
  const metricSelectionMode = shallowRef<"single" | "multi">("single");

  const availableMetrics = computed(() => getAvailableMetrics(processedActivities.value));

  // Keep selection valid
  watch(
    [processedActivities, selectedMetrics],
    () => {
      const available = availableMetrics.value;
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

  function setSelectedMetrics(metrics: MetricType[]) {
    selectedMetrics.value = metrics;
  }

  function toggleMetric(metric: MetricType) {
    if (metricSelectionMode.value === "single") {
      selectedMetrics.value = [metric];
    } else {
      if (selectedMetrics.value.includes(metric)) {
        if (selectedMetrics.value.length > 1) {
          selectedMetrics.value = selectedMetrics.value.filter((m) => m !== metric);
        }
      } else {
        selectedMetrics.value = [...selectedMetrics.value, metric];
      }
    }
  }

  function setMetricSelectionMode(mode: "single" | "multi") {
    metricSelectionMode.value = mode;
    if (mode === "single" && selectedMetrics.value.length > 1) {
      const firstMetric = selectedMetrics.value[0];
      if (firstMetric) {
        selectedMetrics.value = [firstMetric];
      }
    }
  }

  function setViewMode(mode: ChartViewMode) {
    viewMode.value = mode;
  }

  function setXAxisType(type: XAxisType) {
    xAxisType.value = type;
  }

  return {
    selectedMetrics,
    xAxisType,
    viewMode,
    metricSelectionMode,
    availableMetrics,
    setSelectedMetrics,
    toggleMetric,
    setMetricSelectionMode,
    setViewMode,
    setXAxisType,
  };
});
