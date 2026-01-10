<template>
  <div class="rounded-lg border-2 border-gray-200 bg-gray-50 p-3 sm:p-4">
    <button
      type="button"
      class="flex w-full touch-manipulation items-center justify-between"
      @click="open = !open"
      :aria-expanded="open"
    >
      <span class="text-sm font-semibold text-gray-800 sm:text-base">Advanced Settings</span>
      <svg
        :class="['h-5 w-5 text-gray-600 transition-transform', open ? 'rotate-180' : '']"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <div v-show="open" class="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
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
              class="h-5 w-5 cursor-pointer touch-manipulation rounded-sm border-gray-300 text-primary focus:ring-primary sm:h-4 sm:w-4"
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
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                :value="opts.minMoveMeters"
                @input="setMinMove"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Max speed (m/s)</label>
              <input
                type="number"
                min="0"
                step="1"
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
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
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                :value="opts.maxJumpMetersAt1s"
                @input="setMaxJump"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useActivityStore } from "~/stores/activity";

const activityStore = useActivityStore();
const open = ref(false);
const opts = computed(() => activityStore.gpsDistanceOptions);

const setIncludeElevation = (event: Event) => {
  const target = event.target as HTMLInputElement;
  activityStore.setGpsDistanceOptions({ includeElevation: target.checked });
};

const setMinMove = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  activityStore.setGpsDistanceOptions({ minMoveMeters: Number.isFinite(n) ? Math.max(0, n) : opts.value.minMoveMeters });
};

const setMaxSpeed = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  activityStore.setGpsDistanceOptions({ maxSpeedMps: Number.isFinite(n) ? Math.max(0, n) : opts.value.maxSpeedMps });
};

const setMaxJump = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const n = Number.parseFloat(target.value);
  activityStore.setGpsDistanceOptions({ maxJumpMetersAt1s: Number.isFinite(n) ? Math.max(0, n) : opts.value.maxJumpMetersAt1s });
};
</script>

