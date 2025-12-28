<template>
  <div class="rounded-lg border-2 border-gray-200 bg-gray-50 p-3 sm:p-4">
    <button
      type="button"
      class="flex w-full touch-manipulation items-center justify-between"
      @click="showAdvanced = !showAdvanced"
    >
      <span class="text-sm font-semibold text-gray-800 sm:text-base">Advanced Settings</span>
      <svg
        :class="[
          'h-5 w-5 text-gray-600 transition-transform',
          showAdvanced ? 'rotate-180' : '',
        ]"
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

    <div v-show="showAdvanced" class="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
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

      <!-- X-Axis Type Selector -->
      <AxisTypeSelector :value="xAxisType" @update:value="setXAxisType" />

      <!-- Time Offsets (only show if activities exist) -->
      <div v-if="activities.length > 0" class="space-y-3 sm:space-y-4">
        <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Time Offsets</h4>
        <p class="text-xs text-gray-500 sm:text-sm">
          Adjust time offsets to align activities temporally. Positive values shift the activity forward in time.
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
          </div>
        </div>
      </div>

      <!-- Delta Mode (only show if 2+ activities) -->
      <div v-if="activities.length >= 2" class="space-y-3 sm:space-y-4">
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
                :value="deltaBaseActivityId || activities[0]?.id"
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                @change="setDeltaBaseActivity"
              >
                <option v-for="activity in activities" :key="activity.id" :value="activity.id">
                  {{ activity.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700"
                >Compare Activity</label
              >
              <select
                :value="deltaCompareActivityId || activities[1]?.id"
                class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5"
                @change="setDeltaCompareActivity"
              >
                <option v-for="activity in activities" :key="activity.id" :value="activity.id">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useActivityStore } from "~/stores/activity";
import AxisTypeSelector from "./AxisTypeSelector.vue";
import TimeOffsetControl from "./TimeOffsetControl.vue";

const activityStore = useActivityStore();
const showAdvanced = ref(false);

const activities = computed(() => activityStore.activities);
const xAxisType = computed(() => activityStore.xAxisType);
const showDelta = computed(() => activityStore.showDelta);
const deltaMode = computed(() => activityStore.deltaMode);
const deltaBaseActivityId = computed(() => activityStore.deltaBaseActivityId);
const deltaCompareActivityId = computed(() => activityStore.deltaCompareActivityId);
const metricSelectionMode = computed(() => activityStore.metricSelectionMode);

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

const setMetricSelectionMode = (mode: "multi" | "single") => {
  activityStore.setMetricSelectionMode(mode);
};
</script>

