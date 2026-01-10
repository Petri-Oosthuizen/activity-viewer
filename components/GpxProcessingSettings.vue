<template>
  <CollapsibleSection v-if="hasGpxFiles">
    <template #title>Advanced Settings</template>
    <div class="space-y-4 sm:space-y-6">
      <div class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">GPX distance</h4>
        <p class="text-xs text-gray-500 sm:text-sm">
          Tune how GPX distance is derived from GPS points (helps with jitter and spikes).
        </p>

        <div class="rounded-md border border-gray-200 bg-white p-3 sm:p-4">
          <label class="flex cursor-pointer touch-manipulation items-center gap-2">
            <input
              type="checkbox"
              :checked="opts.includeElevation"
              class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation rounded-sm border-gray-300 sm:h-4 sm:w-4"
              @change="setIncludeElevation"
            />
            <span class="text-xs text-gray-700 sm:text-sm">Include elevation in distance (3D)</span>
          </label>

          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Min move (m)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:px-2 sm:py-1.5"
                :value="opts.minMoveMeters"
                @input="setMinMove"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700"
                >Max speed jump (m/s)</label
              >
              <input
                type="number"
                min="0"
                step="1"
                class="focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:px-2 sm:py-1.5"
                :value="opts.maxSpeedMps"
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
                :value="opts.maxJumpMetersAt1s"
                @input="setMaxJump"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </CollapsibleSection>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useActivityStore } from "~/stores/activity";
import CollapsibleSection from "./CollapsibleSection.vue";

const activityStore = useActivityStore();
const opts = computed(() => activityStore.gpsDistanceOptions);

const hasGpxFiles = computed(() => {
  return activityStore.activities.some((activity) => activity.sourceType === "gpx");
});

const setIncludeElevation = (event: Event) => {
  const target = event.target as HTMLInputElement;
  activityStore.setGpsDistanceOptions({ includeElevation: target.checked });
};

const setMinMove = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  activityStore.setGpsDistanceOptions({
    minMoveMeters: Number.isFinite(n) ? Math.max(0, n) : opts.value.minMoveMeters,
  });
};

const setMaxSpeed = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  activityStore.setGpsDistanceOptions({
    maxSpeedMps: Number.isFinite(n) ? Math.max(0, n) : opts.value.maxSpeedMps,
  });
};

const setMaxJump = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  activityStore.setGpsDistanceOptions({
    maxJumpMetersAt1s: Number.isFinite(n) ? Math.max(0, n) : opts.value.maxJumpMetersAt1s,
  });
};
</script>
