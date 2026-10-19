<template>
  <div class="space-y-4 sm:space-y-6">
    <div v-if="hasGpxFiles" class="space-y-3 sm:space-y-4">
      <h4
        class="m-0 text-sm font-semibold text-gray-800 sm:text-base"
        title="How distance is calculated from GPS points"
      >
        GPX Distance
      </h4>

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
            @input="setDistanceOption('minMoveMeters', $event)"
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
            @input="setDistanceOption('maxSpeedMps', $event)"
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
            @input="setDistanceOption('maxJumpMetersAt1s', $event)"
          />
        </div>
      </div>
    </div>

    <div class="space-y-3 sm:space-y-4">
      <h4
        class="m-0 text-sm font-semibold text-gray-800 sm:text-base"
        title="Spikes in sensor metrics. GPS coordinates are handled separately."
      >
        Outlier Handling
      </h4>

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
        <label
          class="mb-1 block text-xs font-medium text-gray-700"
          title="Maximum change between consecutive points"
        >
          Max percent change
        </label>
        <input
          type="number"
          min="0"
          step="1"
          class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:py-1.5"
          :value="outlierSettings.maxPercentChange"
          :disabled="outlierSettings.mode === 'off'"
          @input="setOutlierMaxPercentChange"
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
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import type { OutlierHandling } from "~/utils/chart-settings";

const settingsStore = useActivitySettingsStore();
const { outlierSettings, gpsDistanceOptions } = storeToRefs(settingsStore);
const { activities } = useActivityList();

const hasGpxFiles = computed(() => activities.value.some((a) => a.sourceType === "gpx"));

type NumericDistanceOption = "minMoveMeters" | "maxSpeedMps" | "maxJumpMetersAt1s";

function setDistanceOption(key: NumericDistanceOption, event: Event) {
  const n = Number.parseFloat((event.target as HTMLInputElement).value);
  const next: Partial<GpsDistanceOptions> = {
    [key]: Number.isFinite(n) ? Math.max(0, n) : gpsDistanceOptions.value[key],
  };
  settingsStore.setGpsDistanceOptions(next);
}

function setIncludeElevation(event: Event) {
  settingsStore.setGpsDistanceOptions({
    includeElevation: (event.target as HTMLInputElement).checked,
  });
}

function setOutlierMode(event: Event) {
  settingsStore.setOutlierSettings({
    ...outlierSettings.value,
    mode: (event.target as HTMLSelectElement).value as OutlierHandling,
  });
}

function setOutlierMaxPercentChange(event: Event) {
  const next = Number.parseFloat((event.target as HTMLInputElement).value);
  settingsStore.setOutlierSettings({
    ...outlierSettings.value,
    maxPercentChange: Number.isFinite(next) ? next : outlierSettings.value.maxPercentChange,
  });
}
</script>
