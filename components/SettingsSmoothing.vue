<template>
  <div class="space-y-4 sm:space-y-6">
    <div class="space-y-3 sm:space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4
          class="m-0 text-sm font-semibold text-gray-800 sm:text-base"
          title="Smooths latitude and longitude to reduce jitter"
        >
          GPS Smoothing
        </h4>
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

    <div v-if="hasGpxFiles" class="space-y-3 sm:space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4
          class="m-0 text-sm font-semibold text-gray-800 sm:text-base"
          title="Applies only to pace calculated from GPS, not to embedded speed"
        >
          GPS Pace Smoothing
        </h4>
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

    <div class="space-y-3 sm:space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4
          class="m-0 text-sm font-semibold text-gray-800 sm:text-base"
          title="Smooths sensor values to reduce noise"
        >
          Data Smoothing
        </h4>
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
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useActivityList } from "~/composables/useActivityList";
import type { SmoothingMode } from "~/utils/chart-settings";

const settingsStore = useActivitySettingsStore();
const { gpsSmoothing, gpsPaceSmoothing, smoothing } = storeToRefs(settingsStore);
const { activities } = useActivityList();

const hasGpxFiles = computed(() => activities.value.some((a) => a.sourceType === "gpx"));

function parseWindowPoints(event: Event, fallback: number): number {
  const next = Number.parseInt((event.target as HTMLInputElement).value, 10);
  return Number.isFinite(next) ? Math.max(1, next) : fallback;
}

function setSmoothingMode(event: Event) {
  settingsStore.setSmoothing({
    ...smoothing.value,
    mode: (event.target as HTMLSelectElement).value as SmoothingMode,
  });
}

function setSmoothingWindowPoints(event: Event) {
  settingsStore.setSmoothing({
    ...smoothing.value,
    windowPoints: parseWindowPoints(event, smoothing.value.windowPoints),
  });
}

function toggleGpsSmoothing(event: Event) {
  settingsStore.setGpsSmoothing({
    ...gpsSmoothing.value,
    enabled: (event.target as HTMLInputElement).checked,
  });
}

function setGpsSmoothingWindowPoints(event: Event) {
  settingsStore.setGpsSmoothing({
    ...gpsSmoothing.value,
    windowPoints: parseWindowPoints(event, gpsSmoothing.value.windowPoints),
  });
}

function toggleGpsPaceSmoothing(event: Event) {
  settingsStore.setGpsPaceSmoothing({
    ...gpsPaceSmoothing.value,
    enabled: (event.target as HTMLInputElement).checked,
  });
}

function setGpsPaceSmoothingWindowPoints(event: Event) {
  settingsStore.setGpsPaceSmoothing({
    ...gpsPaceSmoothing.value,
    windowPoints: parseWindowPoints(event, gpsPaceSmoothing.value.windowPoints),
  });
}
</script>
