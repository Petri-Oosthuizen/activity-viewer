<template>
  <div class="flex h-full w-full flex-col rounded-lg bg-white p-4 shadow-xs sm:p-6">
    <div class="shrink-0">
      <h3 class="m-0 mb-3 text-base font-semibold text-gray-800 sm:mb-4 sm:text-lg">
        Activity Chart
      </h3>
    </div>

    <!-- Chart Container -->
    <div v-if="hasChartData" class="mt-4 w-full flex-1 overflow-visible sm:mt-6">
      <div
        ref="chartContainer"
        class="h-full min-h-[400px] w-full touch-manipulation sm:min-h-[500px]"
        style="touch-action: pan-x pan-y pinch-zoom; position: relative"
      ></div>

      <!-- Toolbar (below chart) -->
      <div
        class="mt-3 inline-flex flex-wrap items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-1 sm:mt-4"
      >
        <button
          type="button"
          class="border-primary text-primary active:bg-primary sm:hover:bg-primary flex h-11 w-11 touch-manipulation items-center justify-center rounded-md border bg-white shadow-xs transition-all active:text-white sm:h-9 sm:w-9 sm:hover:text-white"
          @click="zoomIn"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <span class="text-2xl leading-none font-light sm:text-xl">+</span>
        </button>
        <button
          type="button"
          class="border-primary text-primary active:bg-primary sm:hover:bg-primary flex h-11 w-11 touch-manipulation items-center justify-center rounded-md border bg-white shadow-xs transition-all active:text-white sm:h-9 sm:w-9 sm:hover:text-white"
          @click="zoomOut"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <span class="text-2xl leading-none font-light sm:text-xl">−</span>
        </button>
        <button
          type="button"
          class="border-primary text-primary active:bg-primary sm:hover:bg-primary flex h-11 w-11 touch-manipulation items-center justify-center rounded-md border bg-white shadow-xs transition-all active:text-white sm:h-9 sm:w-9 sm:hover:text-white"
          @click="resetZoom"
          title="Reset Zoom"
          aria-label="Reset Zoom"
        >
          <span class="text-base sm:text-sm">🔍</span>
        </button>
        <button
          type="button"
          class="ml-2 flex h-11 w-11 touch-manipulation items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-xs transition-all active:bg-gray-100 sm:h-9 sm:w-9 sm:hover:bg-gray-50"
          @click="panLeft"
          title="Pan Left"
          aria-label="Pan Left"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          type="button"
          class="flex h-11 w-11 touch-manipulation items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-xs transition-all active:bg-gray-100 sm:h-9 sm:w-9 sm:hover:bg-gray-50"
          @click="panRight"
          title="Pan Right"
          aria-label="Pan Right"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        <label
          class="ml-2 inline-flex h-11 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-[10px] text-gray-700 select-none sm:h-9 sm:text-xs"
          title="When enabled, Y rescales to the visible X window"
        >
          <input
            type="checkbox"
            class="text-primary focus:ring-primary h-4 w-4 rounded-sm border-gray-300"
            :checked="autoFitYEnabled"
            @change="toggleAutoFitY"
          />
          Auto-fit Y
        </label>
      </div>
    </div>
    <div
      v-else
      class="mt-4 flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 sm:mt-6"
    >
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
import { useDebounceFn } from "@vueuse/core";
import { useActivityStore } from "~/stores/activity";
import type { MetricType } from "~/utils/chart-config";
import type { EChartsOption } from "echarts";
import {
  findNearestIndex,
  findNearestIndexLinear,
  getActivityXValues,
} from "~/utils/activity-xvalues";

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
let chartZoomCleanup: (() => void) | null = null;
const autoFitYEnabled = ref(true);

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

const panXAxisWindow = (direction: -1 | 1) => {
  if (!chartInstance.value) return;

  const option = chartInstance.value.getOption() as any;
  const dataZooms: any[] = option?.dataZoom ?? [];
  const slider = dataZooms.find((dz) => dz?.xAxisIndex === 0 && dz?.type === "slider");
  const currentStart = slider?.start ?? 0;
  const currentEnd = slider?.end ?? 100;
  const range = Math.max(1, currentEnd - currentStart);

  const step = Math.min(20, Math.max(1, range * 0.15));
  const newStart = Math.max(0, Math.min(100 - range, currentStart + direction * step));
  const newEnd = Math.min(100, newStart + range);

  chartInstance.value.dispatchAction({
    type: "dataZoom",
    start: newStart,
    end: newEnd,
    xAxisIndex: 0,
  });
};

function applyAutoYFit() {
  if (!chartInstance.value) return;
  if (!autoFitYEnabled.value) return;

  const option = chartInstance.value.getOption() as any;
  const seriesOptions: any[] = option?.series ?? [];
  const yAxisOptions = Array.isArray(option?.yAxis)
    ? option.yAxis
    : [option?.yAxis].filter(Boolean);

  if (yAxisOptions.length === 0 || seriesOptions.length === 0) return;

  const dataZooms: any[] = option?.dataZoom ?? [];
  const xZoom =
    dataZooms.find((z) => z?.xAxisIndex === 0 && z?.type === "slider") ??
    dataZooms.find((z) => z?.xAxisIndex === 0 && z?.type === "inside");
  const xStartPct = typeof xZoom?.start === "number" ? xZoom.start : 0;
  const xEndPct = typeof xZoom?.end === "number" ? xZoom.end : 100;

  let globalMinX = Infinity;
  let globalMaxX = -Infinity;
  for (const s of seriesOptions) {
    const data: any[] = s?.data ?? [];
    for (const p of data) {
      if (!Array.isArray(p) || typeof p[0] !== "number") continue;
      const x = p[0];
      if (x < globalMinX) globalMinX = x;
      if (x > globalMaxX) globalMaxX = x;
    }
  }

  if (!Number.isFinite(globalMinX) || !Number.isFinite(globalMaxX) || globalMinX === globalMaxX)
    return;

  const xStart = globalMinX + ((globalMaxX - globalMinX) * xStartPct) / 100;
  const xEnd = globalMinX + ((globalMaxX - globalMinX) * xEndPct) / 100;
  const lo = Math.min(xStart, xEnd);
  const hi = Math.max(xStart, xEnd);

  const minByAxis = new Map<number, number>();
  const maxByAxis = new Map<number, number>();

  for (const s of seriesOptions) {
    const axisIndex = typeof s?.yAxisIndex === "number" ? s.yAxisIndex : 0;
    const data: any[] = s?.data ?? [];
    for (const p of data) {
      if (!Array.isArray(p) || typeof p[0] !== "number") continue;
      const x = p[0] as number;
      if (x < lo || x > hi) continue;
      const y = p[1];
      if (typeof y !== "number" || !Number.isFinite(y)) continue;
      const prevMin = minByAxis.get(axisIndex);
      const prevMax = maxByAxis.get(axisIndex);
      minByAxis.set(axisIndex, prevMin === undefined ? y : Math.min(prevMin, y));
      maxByAxis.set(axisIndex, prevMax === undefined ? y : Math.max(prevMax, y));
    }
  }

  const nextYAxis = yAxisOptions.map((axis: any, i: number) => {
    const min = minByAxis.get(i);
    const max = maxByAxis.get(i);
    if (min === undefined || max === undefined) {
      return { ...axis, min: undefined, max: undefined };
    }

    let span = max - min;
    if (!Number.isFinite(span) || span === 0) span = Math.max(1, Math.abs(max) * 0.05);
    const pad = span * 0.05;
    return {
      ...axis,
      min: min - pad,
      max: max + pad,
    };
  });

  chartInstance.value.setOption({ yAxis: nextYAxis }, { notMerge: false, replaceMerge: ["yAxis"] });
}

const debouncedApplyAutoYFit = useDebounceFn(applyAutoYFit, 50);

function clearYOverrides() {
  if (!chartInstance.value) return;

  const option = chartInstance.value.getOption() as any;
  const yAxisOptions = Array.isArray(option?.yAxis)
    ? option.yAxis
    : [option?.yAxis].filter(Boolean);
  if (yAxisOptions.length === 0) return;

  // Explicitly clear any previously set min/max so ECharts returns to auto-scaling.
  const nextYAxis = yAxisOptions.map((axis: any) => ({
    ...axis,
    min: null,
    max: null,
  }));

  chartInstance.value.setOption({ yAxis: nextYAxis }, { notMerge: false, replaceMerge: ["yAxis"] });
}

const toggleAutoFitY = (event: Event) => {
  const target = event.target as HTMLInputElement;
  autoFitYEnabled.value = target.checked;
  if (autoFitYEnabled.value) {
    applyAutoYFit();
  } else {
    clearYOverrides();
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

const panLeft = () => panXAxisWindow(-1);
const panRight = () => panXAxisWindow(1);

// Add chart hover handlers for map interaction
watch(
  () => chartInstance.value,
  (instance) => {
    if (chartHoverCleanup) {
      chartHoverCleanup();
      chartHoverCleanup = null;
    }
    if (chartZoomCleanup) {
      chartZoomCleanup();
      chartZoomCleanup = null;
    }

    if (!instance) return;

    // Use updateAxisPointer event - fires reliably when axis pointer moves with trigger: "axis"
    const handleAxisPointerUpdate = (params: any) => {
      const axesInfo = params?.axesInfo;
      if (!Array.isArray(axesInfo) || axesInfo.length === 0) return;

      const seriesDataIndices = axesInfo[0]?.seriesDataIndices;
      const axisValue = axesInfo[0]?.value;

      const option = instance.getOption() as any;
      const seriesOptions: any[] = option?.series ?? [];

      // Fast path: use ECharts' own hit test indices when available
      if (Array.isArray(seriesDataIndices) && seriesDataIndices.length > 0) {
        for (const hit of seriesDataIndices) {
          const seriesIndex = hit?.seriesIndex;
          const dataIndex = hit?.dataIndex;
          if (typeof seriesIndex !== "number" || typeof dataIndex !== "number") continue;

          const seriesOpt = seriesOptions[seriesIndex];
          const activityId: string | undefined = seriesOpt?.activityId;
          if (!activityId) continue;
          if (activityStore.isActivityDisabled(activityId)) continue;

          const activity = activityStore.activities.find((a) => a.id === activityId);
          const record = activity?.records[dataIndex];
          if (!record) continue;
          if (record.lat === undefined || record.lon === undefined) continue;

          activityStore.setChartHoverPoint({ activityId, recordIndex: dataIndex });
          return;
        }
      }

      // Fallback: if ECharts doesn't provide usable indices, resolve by nearest X.
      if (typeof axisValue !== "number") return;
      const xAxisType = activityStore.xAxisType;

      for (const activity of activityStore.activities) {
        if (activityStore.isActivityDisabled(activity.id)) continue;

        const cached = getActivityXValues(activity as any, xAxisType as any);
        const idx = cached.isMonotonic
          ? findNearestIndex(cached.values, axisValue)
          : findNearestIndexLinear(cached.values, axisValue);
        if (idx < 0) continue;

        const record = activity.records[idx];
        if (!record) continue;
        if (record.lat === undefined || record.lon === undefined) continue;

        activityStore.setChartHoverPoint({ activityId: activity.id, recordIndex: idx });
        return;
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

    const updateChartWindowFromOption = () => {
      const option = instance.getOption() as any;
      const zooms: any[] = option?.dataZoom ?? [];

      const xZoom = zooms.find(
        (z) => z?.xAxisIndex === 0 && (z?.type === "slider" || z?.type === "inside"),
      );
      const yZoom = zooms.find((z) => typeof z?.yAxisIndex === "number" && z?.type === "inside");

      const xStart = typeof xZoom?.start === "number" ? xZoom.start : 0;
      const xEnd = typeof xZoom?.end === "number" ? xZoom.end : 100;
      const yStart = typeof yZoom?.start === "number" ? yZoom.start : 0;
      const yEnd = typeof yZoom?.end === "number" ? yZoom.end : 100;

      activityStore.setChartWindow({
        xStartPercent: xStart,
        xEndPercent: xEnd,
        yStartPercent: yStart,
        yEndPercent: yEnd,
      });

      // Keep Y scale fitted to the visible X window.
      debouncedApplyAutoYFit();
    };

    // Initialize window state + keep it updated when zooming/panning changes.
    updateChartWindowFromOption();
    instance.on("dataZoom", updateChartWindowFromOption);

    chartZoomCleanup = () => {
      instance.off("dataZoom", updateChartWindowFromOption);
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

  const option = chartInstance.value.getOption() as any;
  const seriesOptions: any[] = option?.series ?? [];

  // Highlight all series belonging to this activity (multi-metric safe)
  const matchingSeriesIndices: number[] = [];
  for (let i = 0; i < seriesOptions.length; i++) {
    if (seriesOptions[i]?.activityId === point.activityId) {
      matchingSeriesIndices.push(i);
    }
  }

  if (matchingSeriesIndices.length === 0) return;

  for (const seriesIndex of matchingSeriesIndices) {
    chartInstance.value.dispatchAction({ type: "highlight", seriesIndex });
  }

  // Prefer showing tooltip on the currently selected primary metric series (if present)
  const preferredMetric = activityStore.selectedMetric;
  const preferredSeriesIndex =
    matchingSeriesIndices.find((i) => seriesOptions[i]?.metric === preferredMetric) ??
    matchingSeriesIndices[0];

  chartInstance.value.dispatchAction({
    type: "showTip",
    seriesIndex: preferredSeriesIndex,
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
let isPinching = false;

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    isPinching = true;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    if (touch1 && touch2) {
      touchStartDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );
    }
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (isPinching && e.touches.length === 2 && chartInstance.value) {
    e.preventDefault();
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    if (!touch1 || !touch2) return;
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY,
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
  if (chartZoomCleanup) {
    chartZoomCleanup();
  }
});
</script>
