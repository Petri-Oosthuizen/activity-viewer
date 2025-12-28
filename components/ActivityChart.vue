<template>
  <div class="flex h-full w-full flex-col rounded-lg bg-white p-4 shadow-xs sm:p-6">
    <div class="shrink-0">
      <h3 class="m-0 mb-3 text-base font-semibold text-gray-800 sm:mb-4 sm:text-lg">
        Activity Chart
      </h3>
    </div>

    <!-- Chart Container -->
    <div v-if="hasChartData" class="relative mt-4 w-full flex-1 overflow-visible sm:mt-6">
      <div
        ref="chartContainer"
        class="h-full min-h-[400px] w-full touch-manipulation sm:min-h-[500px]"
        style="touch-action: pan-x pan-y pinch-zoom;"
      ></div>
      <div class="absolute right-2 top-2 z-10 flex flex-col gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
        <button
          type="button"
          class="flex h-12 w-12 touch-manipulation items-center justify-center rounded-md border-2 border-primary bg-white text-primary shadow-md transition-all active:bg-primary active:text-white active:shadow-lg sm:h-10 sm:w-10 sm:hover:bg-primary sm:hover:text-white sm:hover:shadow-lg"
          @click="zoomIn"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <span class="text-2xl font-light leading-none sm:text-xl">+</span>
        </button>
        <button
          type="button"
          class="flex h-12 w-12 touch-manipulation items-center justify-center rounded-md border-2 border-primary bg-white text-primary shadow-md transition-all active:bg-primary active:text-white active:shadow-lg sm:h-10 sm:w-10 sm:hover:bg-primary sm:hover:text-white sm:hover:shadow-lg"
          @click="zoomOut"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <span class="text-2xl font-light leading-none sm:text-xl">−</span>
        </button>
        <button
          type="button"
          class="flex h-12 w-12 touch-manipulation items-center justify-center rounded-md border-2 border-primary bg-white text-primary shadow-md transition-all active:bg-primary active:text-white active:shadow-lg sm:h-10 sm:w-10 sm:hover:bg-primary sm:hover:text-white sm:hover:shadow-lg"
          @click="resetZoom"
          title="Reset Zoom"
          aria-label="Reset Zoom"
        >
          <span class="text-base sm:text-sm">🔍</span>
        </button>
      </div>
    </div>
    <div v-else class="mt-4 flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 sm:mt-6">
      <p class="text-center text-sm text-gray-500 sm:text-base">
        No activities selected. Select at least one activity to view the chart.
      </p>
    </div>

    <!-- Metric Selector (below chart) -->
    <div class="mt-4 sm:mt-6">
      <MetricSelector
        :available-metrics="availableMetrics"
        :selected-metric="selectedMetric"
        :selected-metrics="selectedMetrics"
        :metric-availability="metricAvailability"
        :activities="activities"
        :has-activities="activities.length > 0"
        :is-multi-select="metricSelectionMode === 'multi'"
        @select="setMetric"
        @toggle="toggleMetric"
      />
    </div>

    <!-- Advanced Settings (directly below metric selector) -->
    <div class="mt-4 sm:mt-6">
      <ChartAdvancedSettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import { useActivityStore } from "~/stores/activity";
import type { MetricType } from "~/utils/chart-config";
import { calculateXValue } from "~/utils/chart-config";
import type { EChartsOption } from "echarts";

import { useECharts } from "~/composables/useECharts";
import MetricSelector from "./MetricSelector.vue";
import ChartAdvancedSettings from "./ChartAdvancedSettings.vue";

const chartContainer = ref<HTMLDivElement | null>(null);
const activityStore = useActivityStore();

const chartOption = computed(() => activityStore.chartOption as EChartsOption);

const { chartInstance, initChart, updateChart, handleResize } = useECharts(
  chartContainer,
  chartOption,
);

// Computed properties for settings
const activities = computed(() =>
  activityStore.activities.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    recordCount: a.records.length,
    activity: a, // Pass full activity for metric-specific counting
  })),
);
const selectedMetric = computed(() => activityStore.selectedMetric);
const selectedMetrics = computed(() => activityStore.selectedMetrics);
const metricAvailability = computed(() => activityStore.metricAvailability);
const availableMetrics = computed(() => activityStore.availableMetrics);
const hasChartData = computed(() => activityStore.chartSeries.length > 0);
const metricSelectionMode = computed(() => activityStore.metricSelectionMode);

// Settings handlers
const setMetric = (metric: MetricType) => {
  activityStore.setMetric(metric);
};

const toggleMetric = (metric: MetricType) => {
  activityStore.toggleMetric(metric);
};

let chartHoverCleanup: (() => void) | null = null;

// Watch activities to reload chart when activities are added/removed
watch(
  () => activityStore.activities,
  async () => {
    await nextTick();
    if (chartInstance.value) {
      const option = activityStore.chartOption as EChartsOption;
      chartInstance.value.setOption(option, {
        notMerge: false,
        replaceMerge: ["series", "yAxis", "legend"],
      });
    }
  },
  { deep: true },
);

watch(
  () => activityStore.xAxisType,
  () => {
    updateChart();
  },
);

watch(
  () => activityStore.disabledActivities,
  () => {
    // Replace series completely when activities are enabled/disabled
    // Use notMerge: false with replaceMerge to preserve tooltip and other config
    if (chartInstance.value) {
      const option = activityStore.chartOption as EChartsOption;
      // Set the full option to ensure tooltip is preserved
      chartInstance.value.setOption(option, {
        notMerge: false,
        replaceMerge: ["series"],
      });
    }
  },
);

watch(
  () => activityStore.selectedMetrics,
  () => {
    // Fully update chart when metrics change to show multiple Y-axes
    // Need to replace both series and yAxis to properly display multiple metrics
    if (chartInstance.value) {
      const option = activityStore.chartOption as EChartsOption;
      // Use replaceMerge to replace series and yAxis while preserving tooltip and other config
      chartInstance.value.setOption(option, {
        notMerge: false,
        replaceMerge: ["series", "yAxis", "legend"],
      });
    }
  },
  { deep: true },
);

watch(
  () => activityStore.showDelta,
  () => {
    // Replace series completely when delta is toggled to avoid stale series
    // Use notMerge: false with replaceMerge to preserve tooltip and other config
    if (chartInstance.value) {
      const option = activityStore.chartOption as EChartsOption;
      chartInstance.value.setOption(option, {
        notMerge: false,
        replaceMerge: ["series"],
      });
    }
  },
);

watch(
  () => activityStore.deltaMode,
  () => {
    // Replace series completely when delta mode changes
    // Use notMerge: false with replaceMerge to preserve tooltip and other config
    if (chartInstance.value) {
      const option = activityStore.chartOption as EChartsOption;
      chartInstance.value.setOption(option, {
        notMerge: false,
        replaceMerge: ["series"],
      });
    }
  },
);

watch(
  () => activityStore.deltaBaseActivityId,
  () => {
    // Replace series completely when delta base activity changes
    // Use notMerge: false with replaceMerge to preserve tooltip and other config
    if (chartInstance.value) {
      const option = activityStore.chartOption as EChartsOption;
      chartInstance.value.setOption(option, {
        notMerge: false,
        replaceMerge: ["series"],
      });
    }
  },
);

watch(
  () => activityStore.deltaCompareActivityId,
  () => {
    // Replace series completely when delta compare activity changes
    // Use notMerge: false with replaceMerge to preserve tooltip and other config
    if (chartInstance.value) {
      const option = activityStore.chartOption as EChartsOption;
      chartInstance.value.setOption(option, {
        notMerge: false,
        replaceMerge: ["series"],
      });
    }
  },
);

const performZoom = (zoomFactor: number) => {
  // Zoom by adjusting the visible range while maintaining center point
  // zoomFactor < 1 zooms in, > 1 zooms out
  if (!chartInstance.value) return;

  const option = chartInstance.value.getOption() as any;
  const dataZoom = option.dataZoom?.[0];
  if (dataZoom) {
    const currentStart = dataZoom.start ?? 0;
    const currentEnd = dataZoom.end ?? 100;
    const range = currentEnd - currentStart;
    const center = (currentStart + currentEnd) / 2;
    const newRange = Math.min(100, Math.max(1, range * zoomFactor));
    const newStart = Math.max(0, center - newRange / 2);
    const newEnd = Math.min(100, center + newRange / 2);

    chartInstance.value.dispatchAction({
      type: "dataZoom",
      start: newStart,
      end: newEnd,
      xAxisIndex: 0,
    });
  }
};

watch(
  () => activityStore.resetZoomTrigger,
  () => {
    if (!chartInstance.value) return;

    chartInstance.value.dispatchAction({
      type: "dataZoom",
      start: 0,
      end: 100,
      xAxisIndex: 0,
    });
    chartInstance.value.dispatchAction({
      type: "dataZoom",
      start: 0,
      end: 100,
      yAxisIndex: 0,
    });
  },
);

watch(
  () => activityStore.zoomInTrigger,
  () => {
    performZoom(0.8);
  },
);

watch(
  () => activityStore.zoomOutTrigger,
  () => {
    performZoom(1.25);
  },
);

const resetZoom = () => {
  activityStore.resetZoom();
};

const zoomIn = () => {
  activityStore.zoomIn();
};

const zoomOut = () => {
  activityStore.zoomOut();
};

// Add chart hover handlers for map interaction
watch(
  () => chartInstance.value,
  (instance) => {
    if (chartHoverCleanup) {
      chartHoverCleanup();
      chartHoverCleanup = null;
    }

    if (!instance) return;

    // Use updateAxisPointer event - fires reliably when axis pointer moves with trigger: "axis"
    const handleAxisPointerUpdate = (params: any) => {
      // Extract hovered data from axis pointer event
      if (!params || !params.axesInfo || params.axesInfo.length === 0) return;

      const axisInfo = params.axesInfo[0];
      const hoveredX = axisInfo?.value;
      if (hoveredX === undefined) return;

      // Find first non-disabled activity with GPS data at this X position
      const xAxisType = activityStore.xAxisType;

      for (const activity of activityStore.activities) {
        if (activityStore.isActivityDisabled(activity.id)) continue;

        // Find record closest to hovered X value
        let recordIndex = -1;
        let minDiff = Infinity;

        for (let i = 0; i < activity.records.length; i++) {
          const record = activity.records[i];
          const x = calculateXValue(record, activity, xAxisType);
          const diff = Math.abs(x - hoveredX);
          if (diff < minDiff) {
            minDiff = diff;
            recordIndex = i;
          }
        }

        // Use this activity if we found a matching record with GPS data
        if (recordIndex >= 0 && activity.records[recordIndex]) {
          const record = activity.records[recordIndex];
          if (record.lat !== undefined && record.lon !== undefined) {
            activityStore.setChartHoverPoint({
              activityId: activity.id,
              recordIndex: recordIndex,
            });
            return; // Found a match, exit
          }
        }
      }
    };

    const handleChartLeave = () => {
      activityStore.clearChartHoverPoint();
    };

    // updateAxisPointer fires when axis pointer moves (works with trigger: "axis")
    instance.on("updateAxisPointer", handleAxisPointerUpdate);
    instance.on("globalout", handleChartLeave);

    chartHoverCleanup = () => {
      instance.off("updateAxisPointer", handleAxisPointerUpdate);
      instance.off("globalout", handleChartLeave);
    };
  },
  { immediate: true },
);

// Watch for map hover to highlight point on chart
const mapHoveredPoint = computed(() => activityStore.mapHoveredPoint);
watch(mapHoveredPoint, (point) => {
  if (!chartInstance.value || !point) {
    // Clear highlight when no map hover
    if (chartInstance.value) {
      chartInstance.value.dispatchAction({
        type: "downplay",
      });
    }
    return;
  }

  const activity = activityStore.activities.find((a) => a.id === point.activityId);
  if (!activity) return;

  // Find the series index for this activity
  const activityIndex = activityStore.activities.findIndex((a) => a.id === point.activityId);
  if (activityIndex === -1) return;

  // Highlight the point on the chart
  const record = activity.records[point.recordIndex];
  if (!record) return;

  // Highlight the series and point
  chartInstance.value.dispatchAction({
    type: "highlight",
    seriesIndex: activityIndex,
  });

  // Show tooltip at the point
  chartInstance.value.dispatchAction({
    type: "showTip",
    seriesIndex: activityIndex,
    dataIndex: point.recordIndex,
  });
});

// Watch for layout changes to trigger resize and reload (optimized for speed)
let layoutResizeTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => activityStore.chartMapSideBySide,
  async () => {
    // Wait for DOM to update
    await nextTick();

    if (layoutResizeTimer) {
      clearTimeout(layoutResizeTimer);
    }

    // Immediate resize and reload
    if (chartInstance.value) {
      chartInstance.value.resize();
      // Also reload the chart to ensure it updates properly
      updateChart();
    }

    // Single delayed resize and reload to catch any late layout changes
    layoutResizeTimer = setTimeout(() => {
      if (chartInstance.value) {
        chartInstance.value.resize();
        updateChart();
      }
      layoutResizeTimer = null;
    }, 50);
  },
);

// ResizeObserver to watch for container size changes
let resizeObserver: ResizeObserver | null = null;

// Enhanced touch handling for mobile devices
let touchStartDistance = 0;
let touchStartCenter: { x: number; y: number } | null = null;
let isPinching = false;

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    isPinching = true;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    touchStartDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    touchStartCenter = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (isPinching && e.touches.length === 2 && chartInstance.value) {
    e.preventDefault();
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    if (touchStartDistance > 0) {
      const scale = currentDistance / touchStartDistance;
      if (Math.abs(scale - 1) > 0.1) {
        // Zoom in/out based on pinch
        const option = chartInstance.value.getOption() as any;
        const dataZoom = option.dataZoom?.[0];
        if (dataZoom) {
          const currentStart = dataZoom.start ?? 0;
          const currentEnd = dataZoom.end ?? 100;
          const range = currentEnd - currentStart;
          const center = (currentStart + currentEnd) / 2;
          const newRange = Math.min(100, Math.max(1, range / scale));
          const newStart = Math.max(0, center - newRange / 2);
          const newEnd = Math.min(100, center + newRange / 2);

          chartInstance.value.dispatchAction({
            type: "dataZoom",
            start: newStart,
            end: newEnd,
            xAxisIndex: 0,
          });
        }
        touchStartDistance = currentDistance;
      }
    }
  }
};

const handleTouchEnd = () => {
  isPinching = false;
  touchStartDistance = 0;
  touchStartCenter = null;
};

onMounted(async () => {
  await nextTick();
  initChart();
  window.addEventListener("resize", handleResize);

  // Enhanced touch support for mobile devices
  if (chartContainer.value) {
    chartContainer.value.addEventListener("touchstart", handleTouchStart, { passive: false });
    chartContainer.value.addEventListener("touchmove", handleTouchMove, { passive: false });
    chartContainer.value.addEventListener("touchend", handleTouchEnd);
    chartContainer.value.addEventListener("touchcancel", handleTouchEnd);
  }

  // Set up ResizeObserver to watch for container size changes (optimized for speed)
  if (chartContainer.value && chartInstance.value) {
    resizeObserver = new ResizeObserver(() => {
      // Immediate resize for responsive feel
      if (chartInstance.value) {
        chartInstance.value.resize();
      }
    });

    resizeObserver.observe(chartContainer.value);
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  if (chartContainer.value) {
    chartContainer.value.removeEventListener("touchstart", handleTouchStart);
    chartContainer.value.removeEventListener("touchmove", handleTouchMove);
    chartContainer.value.removeEventListener("touchend", handleTouchEnd);
    chartContainer.value.removeEventListener("touchcancel", handleTouchEnd);
  }
  if (layoutResizeTimer) {
    clearTimeout(layoutResizeTimer);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (chartHoverCleanup) {
    chartHoverCleanup();
  }
});
</script>
