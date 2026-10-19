<template>
  <div class="space-y-4 sm:space-y-6">
    <div>
      <h4 class="m-0 mb-2 text-sm font-semibold text-gray-800 sm:text-base">Metric Selection</h4>
      <div class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-0.5">
        <button
          v-for="option in METRIC_SELECTION_OPTIONS"
          :key="option.mode"
          type="button"
          class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
          :class="
            metricSelectionMode === option.mode
              ? 'bg-primary text-white'
              : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
          "
          :aria-label="option.ariaLabel"
          :aria-pressed="metricSelectionMode === option.mode"
          :title="option.title"
          @click="chartOptionsStore.setMetricSelectionMode(option.mode)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <label
        class="text-xs font-medium text-gray-700 sm:text-sm"
        title="Positive delta sum of altitude gives elevation gain"
      >
        Cumulative
      </label>
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

    <div v-if="activities.length >= 2 && viewMode === 'timeseries'" class="space-y-3 sm:space-y-4">
      <h4 class="m-0 text-sm font-semibold text-gray-800 sm:text-base">Delta Mode</h4>
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
          <label class="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2">Display Mode</label>
          <div class="flex gap-3 sm:gap-4">
            <label
              class="flex cursor-pointer touch-manipulation items-center gap-2"
              title="Delta = Compare − Base, drawn at ×0.1 scale"
            >
              <input
                type="radio"
                value="overlay"
                :checked="deltaSettings.mode === 'overlay'"
                class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation border-gray-300 sm:h-4 sm:w-4"
                @change="settingsStore.setDeltaSettings({ mode: 'overlay' })"
              />
              <span class="text-xs text-gray-700 sm:text-sm">Overlay</span>
            </label>
            <label
              class="flex cursor-pointer touch-manipulation items-center gap-2"
              title="Delta = Compare − Base"
            >
              <input
                type="radio"
                value="delta-only"
                :checked="deltaSettings.mode === 'delta-only'"
                class="text-primary focus:ring-primary h-5 w-5 cursor-pointer touch-manipulation border-gray-300 sm:h-4 sm:w-4"
                @change="settingsStore.setDeltaSettings({ mode: 'delta-only' })"
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
              <option v-for="activity in activeActivities" :key="activity.id" :value="activity.id">
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
              <option v-for="activity in activeActivities" :key="activity.id" :value="activity.id">
                {{ activity.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { useActivityList } from "~/composables/useActivityList";
import type { CumulativeMode } from "~/utils/chart-settings";

interface MetricSelectionOption {
  mode: "single" | "multi";
  label: string;
  ariaLabel: string;
  title: string;
}

const METRIC_SELECTION_OPTIONS: readonly MetricSelectionOption[] = [
  {
    mode: "single",
    label: "Single",
    ariaLabel: "Single-select metric",
    title: "One metric in the chart at a time",
  },
  {
    mode: "multi",
    label: "Multi",
    ariaLabel: "Multi-select metrics",
    title: "Overlay several metrics in the chart",
  },
];

const settingsStore = useActivitySettingsStore();
const chartOptionsStore = useChartOptionsStore();
const chartSeriesStore = useChartSeriesStore();
const { deltaSettings } = storeToRefs(settingsStore);
const { viewMode, metricSelectionMode } = storeToRefs(chartOptionsStore);
const { transformationSettings } = storeToRefs(chartSeriesStore);
const { activities, activeActivities } = useActivityList();

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

function toggleDelta(event: Event) {
  settingsStore.setDeltaSettings({ enabled: (event.target as HTMLInputElement).checked });
}

function setDeltaBaseActivity(event: Event) {
  settingsStore.setDeltaSettings({ baseActivityId: (event.target as HTMLSelectElement).value });
}

function setDeltaCompareActivity(event: Event) {
  settingsStore.setDeltaSettings({ compareActivityId: (event.target as HTMLSelectElement).value });
}

function setCumulativeMode(event: Event) {
  chartSeriesStore.setTransformationSettings({
    ...transformationSettings.value,
    cumulative: {
      ...transformationSettings.value.cumulative,
      mode: (event.target as HTMLSelectElement).value as CumulativeMode,
    },
  });
}
</script>
