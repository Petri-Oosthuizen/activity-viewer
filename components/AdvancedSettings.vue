<template>
  <CollapsibleSection v-if="hasActivities">
    <template #title>Settings</template>
    <template #description>Processing, smoothing, and scaling options</template>
    <div class="space-y-4 sm:space-y-6">
      <!-- Processing Pipeline Settings (in order) -->

      <!-- 1. GPS Distance Filtering (happens during parsing) -->
      <div v-if="hasGpxFiles" class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">GPX Distance</h4>
        <p class="text-xs text-gray-500 sm:text-sm">
          Control how distance is calculated from GPS points to reduce measurement errors and
          spikes.
        </p>

        <label class="flex cursor-pointer touch-manipulation items-center gap-2">
          <input
            type="checkbox"
            :checked="gpsDistanceOptions.includeElevation"
            class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation rounded-sm border-gray-300 sm:h-4 sm:w-4"
            @change="setIncludeElevation"
          />
          <span class="text-xs text-gray-700 sm:text-sm">Include elevation in distance (3D)</span>
        </label>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700">Min move (m)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:px-2 sm:py-1.5"
              :value="gpsDistanceOptions.minMoveMeters"
              @input="setMinMove"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700">Max speed jump (m/s)</label>
            <input
              type="number"
              min="0"
              step="1"
              class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:px-2 sm:py-1.5"
              :value="gpsDistanceOptions.maxSpeedMps"
              @input="setMaxSpeed"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700">Max jump at 1s (m)</label>
            <input
              type="number"
              min="0"
              step="10"
              class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:px-2 sm:py-1.5"
              :value="gpsDistanceOptions.maxJumpMetersAt1s"
              @input="setMaxJump"
            />
          </div>
        </div>
      </div>

      <!-- 2. Outlier Handling -->
      <div class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Outlier Handling</h4>
        <p class="text-xs text-gray-500 sm:text-sm">
          Flags sudden spikes based on percent change vs previous valid point.
        </p>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label class="text-xs font-medium text-gray-700 sm:text-sm">Mode</label>
          <select
            :value="outlierSettings.mode"
            class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:w-36 sm:px-2 sm:py-1.5"
            @change="setOutlierMode"
          >
            <option value="off">Off</option>
            <option value="drop">Drop</option>
            <option value="clamp">Clamp</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Max percent change</label>
          <input
            type="number"
            min="0"
            step="10"
            class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:py-1.5"
            :value="outlierSettings.maxPercentChange"
            :disabled="outlierSettings.mode === 'off'"
            @input="setOutlierMaxPercentChange"
          />
          <div class="mt-1 text-[10px] text-gray-500 sm:text-xs">
            Example: 200 = allow up to ±200% jumps.
          </div>
        </div>
      </div>

      <!-- 3. GPS Smoothing -->
      <div class="space-y-3 sm:space-y-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">GPS Smoothing</h4>
          <label class="flex cursor-pointer touch-manipulation items-center gap-2">
            <input
              type="checkbox"
              :checked="gpsSmoothing.enabled"
              class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation rounded-sm border-gray-300 sm:h-4 sm:w-4"
              @change="toggleGpsSmoothing"
            />
            <span class="text-xs text-gray-700 sm:text-sm">Enable</span>
          </label>
        </div>
        <p class="text-xs text-gray-500 sm:text-sm">Smooths GPS coordinates to reduce jitter.</p>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Window (points)</label>
          <input
            type="number"
            min="1"
            step="1"
            class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:py-1.5"
            :value="gpsSmoothing.windowPoints"
            :disabled="!gpsSmoothing.enabled"
            @input="setGpsSmoothingWindowPoints"
          />
        </div>
      </div>

      <!-- 3.5. GPS Pace Smoothing -->
      <div v-if="hasGpxFiles" class="space-y-3 sm:space-y-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">GPS Pace Smoothing</h4>
          <label class="flex cursor-pointer touch-manipulation items-center gap-2">
            <input
              type="checkbox"
              :checked="gpsPaceSmoothing.enabled"
              class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation rounded-sm border-gray-300 sm:h-4 sm:w-4"
              @change="toggleGpsPaceSmoothing"
            />
            <span class="text-xs text-gray-700 sm:text-sm">Enable</span>
          </label>
        </div>
        <p class="text-xs text-gray-500 sm:text-sm">
          Smooths pace values calculated from GPS coordinates to reduce noise. Only applies when pace is calculated from GPS (GPX files), not when the activity contains embedded speed (TCX/FIT files).
        </p>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Window (points)</label>
          <input
            type="number"
            min="1"
            step="1"
            class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:py-1.5"
            :value="gpsPaceSmoothing.windowPoints"
            :disabled="!gpsPaceSmoothing.enabled"
            @input="setGpsPaceSmoothingWindowPoints"
          />
        </div>
      </div>

      <!-- 4. Data Smoothing -->
      <div class="space-y-3 sm:space-y-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Data Smoothing</h4>
          <select
            :value="smoothing.mode"
            class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:w-36 sm:px-2 sm:py-1.5"
            @change="setSmoothingMode"
          >
            <option value="off">Off</option>
            <option value="movingAverage">Moving average</option>
            <option value="ema">EMA</option>
          </select>
        </div>
        <p class="text-xs text-gray-500 sm:text-sm">
          Smooths sensor values (HR, power, cadence, etc.) to reduce noise.
        </p>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Window (points)</label>
          <input
            type="number"
            min="1"
            step="1"
            class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:py-1.5"
            :value="smoothing.windowPoints"
            :disabled="smoothing.mode === 'off'"
            @input="setSmoothingWindowPoints"
          />
        </div>
      </div>

      <!-- 5. Alignment (Scaling & Time Offset) -->
      <div v-if="activities.length > 0" class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Alignment</h4>
        <p class="text-xs text-gray-500 sm:text-sm">
          Time offset shifts activities horizontally to align events. Scale multiplies all chart
          values for that activity (useful for sensor calibration).
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
                class="min-w-0 flex-1 overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap text-gray-800 sm:text-sm"
                :title="activity.name"
              >
                {{ activity.name }}
              </span>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <TimeOffsetControl
                :offset="activity.offset"
                @update:offset="(offset) => updateActivityOffset(activity.id, offset)"
              />

              <label class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <span class="text-xs text-gray-600 sm:shrink-0 sm:text-sm sm:whitespace-nowrap"
                  >Scale:</span
                >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  class="focus:border-primary focus:ring-primary/10 w-20 rounded-sm border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900 focus:ring-2 focus:outline-hidden sm:h-7 sm:w-20"
                  :value="activity.scale"
                  @input="(e) => updateActivityScale(activity.id, e)"
                />
              </label>
            </div>
            <div class="mt-1 text-[10px] text-gray-500 sm:text-xs">
              Offset shifts time horizontally and scale multiplies all plotted values for that
              activity.
            </div>
          </div>
        </div>
      </div>

      <!-- 6. Delta Mode (comparison between activities) -->
      <div
        v-if="activities.length >= 2 && viewMode === 'timeseries'"
        class="space-y-3 sm:space-y-4"
      >
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Delta Mode</h4>
        <p class="text-xs text-gray-500 sm:text-sm">Compare differences between activities.</p>
        <label class="flex cursor-pointer touch-manipulation items-center gap-2">
          <input
            type="checkbox"
            :checked="deltaSettings.enabled"
            class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation rounded-sm border-gray-300 sm:h-4 sm:w-4"
            @change="toggleDelta"
          />
          <span class="text-xs text-gray-700 sm:text-sm">Show delta between activities</span>
        </label>
        <div v-if="deltaSettings.enabled" class="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2"
              >Display Mode</label
            >
            <div class="flex gap-3 sm:gap-4">
              <label class="flex cursor-pointer touch-manipulation items-center gap-2">
                <input
                  type="radio"
                  value="overlay"
                  :checked="deltaSettings.mode === 'overlay'"
                  class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation border-gray-300 sm:h-4 sm:w-4"
                  @change="setDeltaMode('overlay')"
                />
                <span class="text-xs text-gray-700 sm:text-sm">Overlay</span>
              </label>
              <label class="flex cursor-pointer touch-manipulation items-center gap-2">
                <input
                  type="radio"
                  value="delta-only"
                  :checked="deltaSettings.mode === 'delta-only'"
                  class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation border-gray-300 sm:h-4 sm:w-4"
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
                class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:px-2 sm:py-1.5"
                @change="setDeltaBaseActivity"
              >
                <option
                  v-for="activity in activeActivities"
                  :key="activity.id"
                  :value="activity.id"
                >
                  {{ activity.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Compare Activity</label>
              <select
                :value="effectiveDeltaCompareActivityId"
                class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:px-2 sm:py-1.5"
                @change="setDeltaCompareActivity"
              >
                <option
                  v-for="activity in activeActivities"
                  :key="activity.id"
                  :value="activity.id"
                >
                  {{ activity.name }}
                </option>
              </select>
            </div>
          </div>
          <p class="text-xs text-gray-500">
            Delta = Compare - Base{{ deltaSettings.mode === "overlay" ? " (×0.1 scale)" : "" }}
          </p>
        </div>
      </div>

      <!-- Chart Display Settings -->

      <!-- Metric Selection Mode -->
      <div>
        <h4 class="m-0 mb-2 text-sm font-semibold text-gray-800 sm:text-base">Metric Selection</h4>
        <div
          class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-0.5"
        >
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
        </div>
        <p class="mt-2 text-xs text-gray-500 sm:text-sm">
          Single: One metric displayed in the chart at a time. Multi: Select multiple metrics to overlay on the chart.
        </p>
      </div>

      <!-- X-Axis Type Selector -->
      <AxisTypeSelector
        v-if="viewMode === 'timeseries'"
        :value="xAxisType"
        @update:value="setXAxisType"
      />

      <!-- Chart Transformations -->
      <div class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Chart Transformations</h4>

        <!-- Cumulative -->
        <div class="space-y-3 sm:space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label class="text-xs font-medium text-gray-700 sm:text-sm">Cumulative</label>
            <select
              :value="transformationSettings.cumulative.mode"
              class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:w-52 sm:px-2 sm:py-1.5"
              @change="setCumulativeMode"
            >
              <option value="off">Off</option>
              <option value="sum">Sum</option>
              <option value="positiveDeltaSum">Positive delta sum</option>
            </select>
          </div>
          <p class="text-[10px] text-gray-500 sm:text-xs">
            Useful for things like elevation gain (positive delta sum of altitude).
          </p>
        </div>
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useProcessedActivityStore } from "~/stores/processedActivity";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useChartSeriesStore } from "~/stores/chartSeries";
import AxisTypeSelector from "./AxisTypeSelector.vue";
import TimeOffsetControl from "./TimeOffsetControl.vue";
import CollapsibleSection from "./CollapsibleSection.vue";
import type {
  ChartViewMode,
  CumulativeMode,
  OutlierHandling,
  SmoothingMode,
} from "~/utils/chart-settings";

const processedStore = useProcessedActivityStore();
const chartOptionsStore = useChartOptionsStore();
const settingsStore = useActivitySettingsStore();
const chartSeriesStore = useChartSeriesStore();

const { processedActivities } = storeToRefs(processedStore);
const { viewMode, xAxisType, metricSelectionMode } = storeToRefs(chartOptionsStore);
const {
  outlierSettings,
  gpsDistanceOptions,
  gpsSmoothing,
  gpsPaceSmoothing,
  smoothing,
  activityOffsets,
  activityScales,
  deltaSettings,
  disabledActivities,
} = storeToRefs(settingsStore);
const { transformationSettings } = storeToRefs(chartSeriesStore);

const activities = computed(() => processedActivities.value);
const hasActivities = computed(() => activities.value.length > 0);

const activeActivities = computed(() =>
  activities.value.filter((a) => !disabledActivities.value.has(a.id)),
);

const hasGpxFiles = computed(() => {
  return activities.value.some((activity) => activity.sourceType === "gpx");
});

const effectiveDeltaBaseActivityId = computed(
  () => deltaSettings.value.baseActivityId || activeActivities.value[0]?.id || "",
);

const effectiveDeltaCompareActivityId = computed(
  () =>
    deltaSettings.value.compareActivityId ||
    activeActivities.value[1]?.id ||
    activeActivities.value[0]?.id ||
    "",
);

function setMetricSelectionMode(mode: "multi" | "single") {
  chartOptionsStore.setMetricSelectionMode(mode);
}

function setXAxisType(type: "time" | "distance" | "localTime") {
  chartOptionsStore.setXAxisType(type);
}

function setIncludeElevation(event: Event) {
  const target = event.target as HTMLInputElement;
  settingsStore.setGpsDistanceOptions({ includeElevation: target.checked });
}

function setMinMove(event: Event) {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  settingsStore.setGpsDistanceOptions({
    minMoveMeters: Number.isFinite(n) ? Math.max(0, n) : gpsDistanceOptions.value.minMoveMeters,
  });
}

function setMaxSpeed(event: Event) {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  settingsStore.setGpsDistanceOptions({
    maxSpeedMps: Number.isFinite(n) ? Math.max(0, n) : gpsDistanceOptions.value.maxSpeedMps,
  });
}

function setMaxJump(event: Event) {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  settingsStore.setGpsDistanceOptions({
    maxJumpMetersAt1s: Number.isFinite(n)
      ? Math.max(0, n)
      : gpsDistanceOptions.value.maxJumpMetersAt1s,
  });
}

function updateActivityOffset(activityId: string, offset: number) {
  settingsStore.setActivityOffset(activityId, offset);
}

function updateActivityScale(activityId: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const next = Number.parseFloat(target.value);
  settingsStore.setActivityScale(activityId, Number.isFinite(next) ? next : 1);
}

function toggleDelta(event: Event) {
  const target = event.target as HTMLInputElement;
  settingsStore.setDeltaSettings({ enabled: target.checked });
}

function setDeltaMode(mode: "overlay" | "delta-only") {
  settingsStore.setDeltaSettings({ mode });
}

function setDeltaBaseActivity(event: Event) {
  const target = event.target as HTMLSelectElement;
  settingsStore.setDeltaSettings({ baseActivityId: target.value });
}

function setDeltaCompareActivity(event: Event) {
  const target = event.target as HTMLSelectElement;
  settingsStore.setDeltaSettings({ compareActivityId: target.value });
}

function setOutlierMode(event: Event) {
  const target = event.target as HTMLSelectElement;
  settingsStore.setOutlierSettings({
    ...outlierSettings.value,
    mode: target.value as OutlierHandling,
  });
}

function setOutlierMaxPercentChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const next = Number.parseFloat(target.value);
  settingsStore.setOutlierSettings({
    ...outlierSettings.value,
    maxPercentChange: Number.isFinite(next) ? next : outlierSettings.value.maxPercentChange,
  });
}

function toggleGpsSmoothing(event: Event) {
  const target = event.target as HTMLInputElement;
  settingsStore.setGpsSmoothing({
    ...gpsSmoothing.value,
    enabled: target.checked,
  });
}

function setGpsSmoothingWindowPoints(event: Event) {
  const target = event.target as HTMLInputElement;
  const next = Number.parseInt(target.value, 10);
  settingsStore.setGpsSmoothing({
    ...gpsSmoothing.value,
    windowPoints: Number.isFinite(next) ? Math.max(1, next) : gpsSmoothing.value.windowPoints,
  });
}

function toggleGpsPaceSmoothing(event: Event) {
  const target = event.target as HTMLInputElement;
  settingsStore.setGpsPaceSmoothing({
    ...gpsPaceSmoothing.value,
    enabled: target.checked,
  });
}

function setGpsPaceSmoothingWindowPoints(event: Event) {
  const target = event.target as HTMLInputElement;
  const next = Number.parseInt(target.value, 10);
  settingsStore.setGpsPaceSmoothing({
    ...gpsPaceSmoothing.value,
    windowPoints: Number.isFinite(next) ? Math.max(1, next) : gpsPaceSmoothing.value.windowPoints,
  });
}

function setSmoothingMode(event: Event) {
  const target = event.target as HTMLSelectElement;
  settingsStore.setSmoothing({
    ...smoothing.value,
    mode: target.value as SmoothingMode,
  });
}

function setSmoothingWindowPoints(event: Event) {
  const target = event.target as HTMLInputElement;
  const next = Number.parseInt(target.value, 10);
  settingsStore.setSmoothing({
    ...smoothing.value,
    windowPoints: Number.isFinite(next) ? Math.max(1, next) : smoothing.value.windowPoints,
  });
}

function setCumulativeMode(event: Event) {
  const target = event.target as HTMLSelectElement;
  chartSeriesStore.setTransformationSettings({
    ...transformationSettings.value,
    cumulative: {
      ...transformationSettings.value.cumulative,
      mode: target.value as CumulativeMode,
    },
  });
}

function setPivotZoneCount(event: Event) {
  const target = event.target as HTMLInputElement;
  const next = Number.parseInt(target.value, 10);
  chartSeriesStore.setTransformationSettings({
    ...transformationSettings.value,
    pivotZones: {
      ...transformationSettings.value.pivotZones,
      zoneCount: Number.isFinite(next)
        ? Math.max(1, next)
        : transformationSettings.value.pivotZones.zoneCount,
    },
  });
}
</script>
