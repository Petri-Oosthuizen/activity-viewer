<template>
  <CollapsibleSection>
    <template #title>Advanced Settings</template>
    <div class="space-y-4 sm:space-y-6">
      <!-- View Mode -->
      <div>
        <h4 class="m-0 mb-2 text-sm font-semibold text-gray-800 sm:text-base">View Mode</h4>
        <div class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-0.5">
          <button
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
            :class="
              chartTransforms.viewMode === 'timeseries'
                ? 'bg-primary text-white'
                : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
            "
            @click="setViewMode('timeseries')"
            aria-label="Time series view"
            :aria-pressed="chartTransforms.viewMode === 'timeseries'"
          >
            Time series
          </button>
          <button
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
            :class="
              chartTransforms.viewMode === 'pivotZones'
                ? 'bg-primary text-white'
                : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
            "
            @click="setViewMode('pivotZones')"
            aria-label="Distribution view"
            :aria-pressed="chartTransforms.viewMode === 'pivotZones'"
          >
            Distribution
          </button>
        </div>
        <p class="mt-2 text-xs text-gray-500 sm:text-sm">
          {{
            chartTransforms.viewMode === 'timeseries'
              ? 'Plot metric values along the activity (time, distance, or local time).'
              : 'Show a distribution curve of time spent across value bins (for the selected metric).'
          }}
        </p>
      </div>

      <!-- Metric Selection Mode -->
      <div>
        <h4 class="m-0 mb-2 text-sm font-semibold text-gray-800 sm:text-base">Metric Selection</h4>
        <div class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-0.5">
          <button
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
            :class="
              metricSelectionMode === 'multi'
                ? 'bg-primary text-white'
                : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
            "
            @click="setMetricSelectionMode('multi')"
            aria-label="Multi-select metrics"
            :aria-pressed="metricSelectionMode === 'multi'"
          >
            Multi
          </button>
          <button
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
            :class="
              metricSelectionMode === 'single'
                ? 'bg-primary text-white'
                : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
            "
            @click="setMetricSelectionMode('single')"
            aria-label="Single-select metric"
            :aria-pressed="metricSelectionMode === 'single'"
          >
            Single
          </button>
        </div>
        <p class="mt-2 text-xs text-gray-500 sm:text-sm">
          {{ metricSelectionMode === 'multi' ? 'Select multiple metrics to overlay on the chart' : 'Select one metric at a time' }}
        </p>
      </div>

      <!-- Data Cleanup -->
      <div class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Data Cleanup</h4>

        <!-- Outliers -->
        <div
          class="rounded-md border border-gray-200 bg-white p-3 sm:p-4"
          :class="chartTransforms.outliers.mode === 'off' ? 'opacity-50' : ''"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="text-xs font-medium text-gray-800 sm:text-sm">Outlier handling</div>
              <div class="mt-1 text-[10px] text-gray-500 sm:text-xs">
                Flags sudden spikes based on percent change vs previous valid point.
              </div>
            </div>
            <select
              :value="chartTransforms.outliers.mode"
              class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:w-auto sm:px-2 sm:py-1.5"
              @change="setOutlierMode"
            >
              <option value="off">Off</option>
              <option value="drop">Drop</option>
              <option value="clamp">Clamp</option>
            </select>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Max percent change</label>
              <input
                type="number"
                min="0"
                step="10"
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                :value="chartTransforms.outliers.maxPercentChange"
                :disabled="chartTransforms.outliers.mode === 'off'"
                @input="setOutlierMaxPercentChange"
              />
              <div class="mt-1 text-[10px] text-gray-500 sm:text-xs">
                Example: 200 = allow up to ±200% jumps.
              </div>
            </div>
          </div>
        </div>

        <!-- Smoothing -->
        <div
          class="rounded-md border border-gray-200 bg-white p-3 sm:p-4"
          :class="chartTransforms.smoothing.mode === 'off' ? 'opacity-50' : ''"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="text-xs font-medium text-gray-800 sm:text-sm">Smoothing</div>
              <div class="mt-1 text-[10px] text-gray-500 sm:text-xs">
                Smooths raw sensor values before plotting.
              </div>
            </div>
            <select
              :value="chartTransforms.smoothing.mode"
              class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:w-auto sm:px-2 sm:py-1.5"
              @change="setSmoothingMode"
            >
              <option value="off">Off</option>
              <option value="movingAverage">Moving average</option>
              <option value="ema">EMA</option>
            </select>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Window (points)</label>
              <input
                type="number"
                min="1"
                step="1"
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                :value="chartTransforms.smoothing.windowPoints"
                :disabled="chartTransforms.smoothing.mode === 'off'"
                @input="setSmoothingWindowPoints"
              />
            </div>
          </div>
        </div>

        <!-- Cumulative -->
        <div
          class="rounded-md border border-gray-200 bg-white p-3 sm:p-4"
          :class="chartTransforms.cumulative.mode === 'off' ? 'opacity-50' : ''"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="text-xs font-medium text-gray-800 sm:text-sm">Cumulative</div>
              <div class="mt-1 text-[10px] text-gray-500 sm:text-xs">
                Useful for things like elevation gain (positive delta sum of altitude).
              </div>
            </div>
            <select
              :value="chartTransforms.cumulative.mode"
              class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:w-auto sm:px-2 sm:py-1.5"
              @change="setCumulativeMode"
            >
              <option value="off">Off</option>
              <option value="sum">Sum</option>
              <option value="positiveDeltaSum">Positive delta sum</option>
            </select>
          </div>
        </div>
      </div>

      <!-- X-Axis Type Selector -->
      <AxisTypeSelector
        v-if="chartTransforms.viewMode === 'timeseries'"
        :value="xAxisType"
        @update:value="setXAxisType"
      />

      <!-- Time Offsets (only show if activities exist) -->
      <div v-if="activities.length > 0" class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Alignment</h4>
        <p class="text-xs text-gray-500 sm:text-sm">
          Adjust offsets and scaling to align activities. Scaling multiplies all plotted values for that activity.
        </p>
        <div class="space-y-3 sm:space-y-4">
          <div
            v-for="activity in activities"
            :key="activity.id"
            class="rounded-md border border-gray-200 bg-white p-3 sm:p-4"
          >
            <div class="mb-2 flex items-center gap-2">
              <div
                class="h-3 w-3 shrink-0 rounded-full"
                :style="{ backgroundColor: activity.color }"
              ></div>
              <span
                class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-gray-800 sm:text-sm"
                :title="activity.name"
              >
                {{ activity.name }}
              </span>
            </div>
            <TimeOffsetControl
              :offset="activity.offset"
              @update:offset="(offset) => updateActivityOffset(activity.id, offset)"
            />

            <div class="mt-3">
              <label class="mb-1 block text-xs font-medium text-gray-700">Scale</label>
              <input
                type="number"
                step="0.01"
                min="0"
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                :value="activity.scale"
                @input="(e) => updateActivityScale(activity.id, e)"
              />
              <div class="mt-1 text-[10px] text-gray-500 sm:text-xs">
                Example: 1.05 = +5% (useful to align sensors).
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribution settings -->
      <div v-if="chartTransforms.viewMode === 'pivotZones'" class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Distribution</h4>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700">Bin count</label>
            <input
              type="number"
              min="5"
              step="1"
              class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
              :value="chartTransforms.pivotZones.zoneCount"
              @input="setPivotZoneCount"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700">Binning</label>
            <select
              :value="chartTransforms.pivotZones.strategy"
              class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
              @change="setPivotZoneStrategy"
            >
              <option value="quantiles">Quantiles</option>
              <option value="equalRange">Equal range</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Delta Mode (only show if 2+ activities) -->
      <div v-if="activities.length >= 2 && chartTransforms.viewMode === 'timeseries'" class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Delta Mode</h4>
        <label class="flex cursor-pointer touch-manipulation items-center gap-2">
          <input
            type="checkbox"
            :checked="showDelta"
            class="h-5 w-5 cursor-pointer touch-manipulation rounded-sm border-gray-300 text-primary focus:ring-primary sm:h-4 sm:w-4"
            @change="toggleDelta"
          />
          <span class="text-xs text-gray-700 sm:text-sm">Show delta between activities</span>
        </label>
        <div v-if="showDelta" class="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2"
              >Display Mode</label
            >
            <div class="flex gap-3 sm:gap-4">
              <label class="flex cursor-pointer touch-manipulation items-center gap-2">
                <input
                  type="radio"
                  value="overlay"
                  :checked="deltaMode === 'overlay'"
                  class="h-5 w-5 cursor-pointer touch-manipulation border-gray-300 text-primary focus:ring-primary sm:h-4 sm:w-4"
                  @change="setDeltaMode('overlay')"
                />
                <span class="text-xs text-gray-700 sm:text-sm">Overlay</span>
              </label>
              <label class="flex cursor-pointer touch-manipulation items-center gap-2">
                <input
                  type="radio"
                  value="delta-only"
                  :checked="deltaMode === 'delta-only'"
                  class="h-5 w-5 cursor-pointer touch-manipulation border-gray-300 text-primary focus:ring-primary sm:h-4 sm:w-4"
                  @change="setDeltaMode('delta-only')"
                />
                <span class="text-xs text-gray-700 sm:text-sm">Delta Only</span>
              </label>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Base Activity</label>
              <select
                :value="effectiveDeltaBaseActivityId"
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                @change="setDeltaBaseActivity"
              >
                <option v-for="activity in activeActivities" :key="activity.id" :value="activity.id">
                  {{ activity.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700"
                >Compare Activity</label
              >
              <select
                :value="effectiveDeltaCompareActivityId"
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                @change="setDeltaCompareActivity"
              >
                <option v-for="activity in activeActivities" :key="activity.id" :value="activity.id">
                  {{ activity.name }}
                </option>
              </select>
            </div>
          </div>
          <p class="text-xs text-gray-500">
            Delta = Compare - Base{{ deltaMode === "overlay" ? " (×0.1 scale)" : "" }}
          </p>
        </div>
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useActivityStore } from "~/stores/activity";
import AxisTypeSelector from "./AxisTypeSelector.vue";
import TimeOffsetControl from "./TimeOffsetControl.vue";
import CollapsibleSection from "./CollapsibleSection.vue";
import type {
  ChartViewMode,
  CumulativeMode,
  OutlierHandling,
  PivotZoneStrategy,
  SmoothingMode,
} from "~/utils/chart-settings";

const activityStore = useActivityStore();

const activities = computed(() => activityStore.activities);
const activeActivities = computed(() =>
  activities.value.filter((a) => !activityStore.isActivityDisabled(a.id))
);
const xAxisType = computed(() => activityStore.xAxisType);
const showDelta = computed(() => activityStore.showDelta);
const deltaMode = computed(() => activityStore.deltaMode);
const deltaBaseActivityId = computed(() => activityStore.deltaBaseActivityId);
const deltaCompareActivityId = computed(() => activityStore.deltaCompareActivityId);
const metricSelectionMode = computed(() => activityStore.metricSelectionMode);
const chartTransforms = computed(() => activityStore.chartTransforms);

const effectiveDeltaBaseActivityId = computed(() => 
  deltaBaseActivityId.value || activeActivities.value[0]?.id || ''
);

const effectiveDeltaCompareActivityId = computed(() => 
  deltaCompareActivityId.value || activeActivities.value[1]?.id || activeActivities.value[0]?.id || ''
);

const setXAxisType = (type: "time" | "distance" | "localTime") => {
  activityStore.setXAxisType(type);
};

const toggleDelta = (event: Event) => {
  const target = event.target as HTMLInputElement;
  activityStore.setShowDelta(target.checked);
};

const setDeltaMode = (mode: "overlay" | "delta-only") => {
  activityStore.setDeltaMode(mode);
};

const setDeltaBaseActivity = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  activityStore.setDeltaBaseActivity(target.value);
};

const setDeltaCompareActivity = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  activityStore.setDeltaCompareActivity(target.value);
};

const updateActivityOffset = (id: string, offset: number) => {
  activityStore.updateOffset(id, offset);
};

const updateActivityScale = (id: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  const next = Number.parseFloat(target.value);
  activityStore.updateScale(id, Number.isFinite(next) ? next : 1);
};

const setMetricSelectionMode = (mode: "multi" | "single") => {
  activityStore.setMetricSelectionMode(mode);
};

const setViewMode = (mode: ChartViewMode) => {
  activityStore.setChartTransforms({ ...chartTransforms.value, viewMode: mode });
};

const setOutlierMode = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  activityStore.setChartTransforms({
    ...chartTransforms.value,
    outliers: { ...chartTransforms.value.outliers, mode: target.value as OutlierHandling },
  });
};

const setOutlierMaxPercentChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const next = Number.parseFloat(target.value);
  activityStore.setChartTransforms({
    ...chartTransforms.value,
    outliers: {
      ...chartTransforms.value.outliers,
      maxPercentChange: Number.isFinite(next) ? next : chartTransforms.value.outliers.maxPercentChange,
    },
  });
};

const setSmoothingMode = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  activityStore.setChartTransforms({
    ...chartTransforms.value,
    smoothing: { ...chartTransforms.value.smoothing, mode: target.value as SmoothingMode },
  });
};

const setSmoothingWindowPoints = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const next = Number.parseInt(target.value, 10);
  activityStore.setChartTransforms({
    ...chartTransforms.value,
    smoothing: {
      ...chartTransforms.value.smoothing,
      windowPoints: Number.isFinite(next) ? Math.max(1, next) : chartTransforms.value.smoothing.windowPoints,
    },
  });
};

const setCumulativeMode = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  activityStore.setChartTransforms({
    ...chartTransforms.value,
    cumulative: { ...chartTransforms.value.cumulative, mode: target.value as CumulativeMode },
  });
};

const setPivotZoneCount = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const next = Number.parseInt(target.value, 10);
  activityStore.setChartTransforms({
    ...chartTransforms.value,
    pivotZones: {
      ...chartTransforms.value.pivotZones,
      zoneCount: Number.isFinite(next) ? Math.max(5, next) : chartTransforms.value.pivotZones.zoneCount,
    },
  });
};

const setPivotZoneStrategy = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  activityStore.setChartTransforms({
    ...chartTransforms.value,
    pivotZones: { ...chartTransforms.value.pivotZones, strategy: target.value as PivotZoneStrategy },
  });
};
</script>

