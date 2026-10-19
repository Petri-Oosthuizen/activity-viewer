<template>
  <CollapsibleSection :default-open="true">
    <template #title>Overview</template>
    <template #description>Activity statistics and metrics summary</template>
    <div class="mb-3 flex flex-col gap-3 sm:mb-4">
    <p class="mt-0 text-xs text-gray-500 sm:text-sm">
      {{ descriptionText }}
    </p>
    <div
      v-if="isChartWindowActive"
      class="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-900 sm:text-xs"
    >
      <span class="font-semibold">Showing visible chart window</span>
      <span class="text-amber-800">
        {{ chartWindowDisplayText }}
      </span>
      <button
        type="button"
        class="ml-auto flex items-center justify-center rounded p-1 hover:bg-amber-100 focus:ring-1 focus:ring-amber-300 focus:outline-none"
        title="Clear chart window"
        aria-label="Clear chart window"
        @click="clearChartWindow"
      >
        <svg
          class="h-3 w-3 text-amber-900"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <div class="flex flex-wrap justify-between gap-3">
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-700 sm:text-sm">Display:</label>
        <div
          class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-0.5"
        >
          <button
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
            :class="
              overviewDisplayMode === 'light'
                ? 'bg-primary text-white'
                : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
            "
            @click="uiStore.setOverviewDisplayMode('light')"
            title="Show only key metrics with averages: heart rate, altitude, and power"
            aria-label="Light view"
            :aria-pressed="overviewDisplayMode === 'light'"
          >
            Light
          </button>
          <button
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
            :class="
              overviewDisplayMode === 'full'
                ? 'bg-primary text-white'
                : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
            "
            @click="uiStore.setOverviewDisplayMode('full')"
            title="Show all available metrics and details"
            aria-label="Full details view"
            :aria-pressed="overviewDisplayMode === 'full'"
          >
            Full
          </button>
        </div>
      </div>
      <div v-if="showBaseline" class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          class="flex cursor-pointer items-center gap-1.5 whitespace-nowrap"
          title="Enable comparison with a baseline activity. Delta values show the difference between each activity and the selected baseline."
        >
          <input
            type="checkbox"
            :checked="overviewBaselineEnabled"
            class="text-primary focus:ring-primary h-4 w-4 cursor-pointer rounded-sm border-gray-300"
            @change="handleBaselineEnabledChange"
          />
          <span class="text-[10px] font-medium text-gray-600 sm:text-xs"
            >Enable Baseline Comparison</span
          >
        </label>
        <select
          v-if="overviewBaselineEnabled"
          :value="baselineActivityId ?? ''"
          class="baseline-select focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:ring-2 focus:outline-hidden sm:w-auto sm:min-w-[180px] sm:px-3 sm:text-sm"
          @change="handleBaselineActivityChange"
        >
          <option v-for="a in activeActivities" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </div>
    </div>
  </div>

  <div class="overflow-x-auto rounded-md border border-gray-200 bg-white">
    <table class="w-full table-auto border-collapse text-left text-xs sm:text-sm">
      <thead class="bg-gray-50 text-gray-700">
        <tr>
          <th
            class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2.5 font-semibold sm:w-24 sm:px-3 md:w-36 lg:w-44"
          >
            Metric
          </th>
          <th
            v-for="a in activeActivities"
            :key="a.id"
            class="max-w-[120px] border-b border-gray-200 px-2 py-2.5 text-right font-semibold sm:max-w-[160px] sm:px-3 md:max-w-[200px]"
          >
            <div class="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
              <span
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: a.color }"
                aria-hidden="true"
              />
              <FileNameDisplay :filename="a.name" class="shrink" />
            </div>
          </th>
        </tr>
      </thead>


      <tbody class="text-gray-800">
        <OverviewRow
          v-for="row in rows"
          :key="row.key"
          :label="row.label"
          :description="row.description"
          :variant="row.variant"
          :activities="activeActivities"
          :cells="row.cells"
          :deltas="row.deltas"
        />
      </tbody>
    </table>
  </div>
  </CollapsibleSection>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useActivityList } from "~/composables/useActivityList";
import { useOverviewRows } from "~/composables/useOverviewRows";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useWindowActivityStore } from "~/stores/windowActivity";
import { useUIStore } from "~/stores/ui";
import { formatXAxisValue } from "~/utils/chart-config";
import { computeGlobalXExtent, percentWindowToXRange } from "~/utils/windowing";
import CollapsibleSection from "~/components/CollapsibleSection.vue";
import FileNameDisplay from "~/components/FileNameDisplay.vue";
import OverviewRow from "~/components/OverviewRow.vue";

const { activeActivities } = useActivityList();
const { rows, baselineActivityId } = useOverviewRows();
const chartOptionsStore = useChartOptionsStore();
const windowStore = useWindowActivityStore();
const uiStore = useUIStore();

const { xAxisType } = storeToRefs(chartOptionsStore);
const { chartWindow } = storeToRefs(windowStore);
const { overviewDisplayMode, overviewBaselineEnabled } = storeToRefs(uiStore);

const showBaseline = computed(() => activeActivities.value.length >= 2);
const isBaselineActive = computed(() => showBaseline.value && overviewBaselineEnabled.value);
const descriptionText = computed(() =>
  isBaselineActive.value
    ? "Min, average, and max values per activity, compared to the baseline."
    : showBaseline.value
      ? "Min, average, and max values per activity."
      : "Min, average, and max values for this activity.",
);

const isChartWindowActive = computed(() => {
  const w = chartWindow.value;
  return w.xStartPercent > 0 || w.xEndPercent < 100;
});

const chartWindowDisplayText = computed(() => {
  if (!isChartWindowActive.value) return "";
  const extent = computeGlobalXExtent(activeActivities.value, xAxisType.value);
  if (!extent) return "";
  const range = percentWindowToXRange(extent, {
    startPercent: chartWindow.value.xStartPercent,
    endPercent: chartWindow.value.xEndPercent,
  });
  return `X: ${formatXAxisValue(range.lo, xAxisType.value)}–${formatXAxisValue(range.hi, xAxisType.value)}`;
});

function clearChartWindow() {
  uiStore.resetZoom();
  windowStore.setChartWindow({
    xStartPercent: 0,
    xEndPercent: 100,
    yStartPercent: 0,
    yEndPercent: 100,
  });
}

function handleBaselineEnabledChange(event: Event) {
  uiStore.setOverviewBaselineEnabled((event.target as HTMLInputElement).checked);
}

function handleBaselineActivityChange(event: Event) {
  uiStore.setOverviewBaselineActivityId((event.target as HTMLSelectElement).value || null);
}
</script>
