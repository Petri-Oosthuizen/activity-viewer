<template>
  <div class="rounded-lg bg-white p-4 shadow-xs sm:p-6">
    <div class="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="m-0 text-base font-semibold text-gray-800 sm:text-lg">Overview</h3>
        <p class="mt-1 text-xs text-gray-500 sm:text-sm">
          {{ descriptionText }}
        </p>
        <div
          v-if="isChartWindowActive"
          class="mt-2 inline-flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-900 sm:text-xs"
        >
          <span class="font-semibold">Showing visible chart window</span>
          <span class="text-amber-800">
            X: {{ chartWindow.xStartPercent.toFixed(0) }}–{{ chartWindow.xEndPercent.toFixed(0) }}%
          </span>
        </div>
      </div>

      <div v-if="showBaseline" class="flex flex-col gap-1 sm:items-end">
        <label class="text-[10px] font-medium text-gray-600 sm:text-xs">Baseline</label>
        <select
          :value="baselineActivityId"
          class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:w-auto sm:px-2 sm:py-1.5"
          @change="setBaselineActivityId"
        >
          <option v-for="a in activeActivities" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table class="min-w-[900px] w-full border-collapse text-left text-xs sm:text-sm">
        <thead class="bg-gray-50 text-gray-700">
          <tr>
            <th class="border-b border-gray-200 px-3 py-2.5 font-semibold sm:px-4">Metric</th>
            <th
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-200 px-3 py-2.5 font-semibold sm:px-4"
            >
              <div class="flex items-center gap-2">
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :style="{ backgroundColor: a.color }"
                  aria-hidden="true"
                />
                <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {{ a.name }}
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="text-gray-800">
          <tr class="bg-white">
            <td class="border-b border-gray-100 px-3 py-2.5 font-medium sm:px-4">Duration</td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-3 py-2.5 sm:px-4"
            >
              <div>{{ formatTime(statsById[a.id].durationSeconds) }}</div>
              <div
                v-if="showBaseline"
                class="mt-0.5 text-[10px] text-gray-500 sm:text-xs"
              >
                {{ formatDelta("durationSeconds", a.id) }}
              </div>
            </td>
          </tr>

          <tr class="bg-white">
            <td class="border-b border-gray-100 px-3 py-2.5 font-medium sm:px-4">Distance</td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-3 py-2.5 sm:px-4"
            >
              <div>{{ formatDistance(statsById[a.id].distanceMeters) }}</div>
              <div
                v-if="showBaseline"
                class="mt-0.5 text-[10px] text-gray-500 sm:text-xs"
              >
                {{ formatDelta("distanceMeters", a.id) }}
              </div>
            </td>
          </tr>

          <tr v-if="hasAnyElevationGain" class="bg-white">
            <td class="border-b border-gray-100 px-3 py-2.5 font-medium sm:px-4">
              Elevation gain
            </td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-3 py-2.5 sm:px-4"
            >
              <div>
                {{ statsById[a.id].elevationGainMeters === null ? "—" : `${Math.round(statsById[a.id].elevationGainMeters)} m` }}
              </div>
              <div
                v-if="showBaseline"
                class="mt-0.5 text-[10px] text-gray-500 sm:text-xs"
              >
                {{ formatNullableDelta("elevationGainMeters", a.id) }}
              </div>
            </td>
          </tr>

          <tr v-for="metric in metrics" :key="metric" class="bg-white">
            <td class="border-b border-gray-100 px-3 py-2.5 font-medium sm:px-4">
              {{ metricLabels[metric] }} (min / avg / max)
            </td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-3 py-2.5 sm:px-4"
            >
              <div>
                <span v-if="statsById[a.id].metrics[metric].avg !== null && statsById[a.id].metrics[metric].min !== null && statsById[a.id].metrics[metric].max !== null">
                  {{ formatMetricValue(statsById[a.id].metrics[metric].min!, metric) }}
                  /
                  {{ formatMetricValue(statsById[a.id].metrics[metric].avg!, metric) }}
                  /
                  {{ formatMetricValue(statsById[a.id].metrics[metric].max!, metric) }}
                </span>
                <span v-else>—</span>
              </div>
              <div
                v-if="showBaseline"
                class="mt-0.5 text-[10px] text-gray-500 sm:text-xs"
              >
                {{ formatMetricAvgDelta(metric, a.id) }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useActivityStore } from "~/stores/activity";
import { computeActivityStatsFromRecords } from "~/utils/activity-stats";
import { formatDistance, formatMetricValue, formatTime } from "~/utils/format";
import type { MetricType } from "~/utils/chart-config";
import { computeGlobalXExtent, filterRecordsByXRange, isPercentWindowActive, percentWindowToXRange } from "~/utils/windowing";

const activityStore = useActivityStore();

const activeActivities = computed(() =>
  activityStore.activities.filter((a) => !activityStore.disabledActivities.has(a.id)),
);

const showBaseline = computed(() => activeActivities.value.length >= 2);
const descriptionText = computed(() =>
  showBaseline.value
    ? "Summary stats per activity (min/avg/max) with change vs baseline."
    : "Summary stats for the loaded activity.",
);

const baselineActivityId = ref<string | null>(null);

watch(
  activeActivities,
  (next) => {
    if (next.length === 0) {
      baselineActivityId.value = null;
      return;
    }
    if (!baselineActivityId.value || !next.some((a) => a.id === baselineActivityId.value)) {
      baselineActivityId.value = next[0].id;
    }
  },
  { immediate: true },
);

const setBaselineActivityId = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  baselineActivityId.value = target.value;
};

const metrics = ["hr", "pwr", "cad", "alt"] as const satisfies readonly MetricType[];
const metricLabels = computed(() => activityStore.metricLabels);

const xAxisType = computed(() => activityStore.xAxisType);
const chartTransforms = computed(() => activityStore.chartTransforms);

const statsById = computed(() => {
  const map: Record<string, ReturnType<typeof computeActivityStatsFromRecords>> = {};
  const acts = activeActivities.value;
  const viewMode = chartTransforms.value.viewMode;

  // For pivot view we don't have an X window; keep full-activity stats.
  if (viewMode !== "timeseries") {
    for (const a of acts) {
      map[a.id] = computeActivityStatsFromRecords(a.records);
    }
    return map;
  }

  // If window is full extent, keep full stats.
  const w = chartWindow.value;
  const isWindowActive = isPercentWindowActive({
    startPercent: w.xStartPercent,
    endPercent: w.xEndPercent,
  });
  if (!isWindowActive) {
    for (const a of acts) {
      map[a.id] = computeActivityStatsFromRecords(a.records);
    }
    return map;
  }

  // Convert % window → actual X range using the full data extent.
  const extent = computeGlobalXExtent(acts, xAxisType.value);
  if (!extent) {
    for (const a of acts) {
      map[a.id] = computeActivityStatsFromRecords(a.records);
    }
    return map;
  }

  const range = percentWindowToXRange(extent, {
    startPercent: w.xStartPercent,
    endPercent: w.xEndPercent,
  });

  for (const a of acts) {
    const subset = filterRecordsByXRange(a, xAxisType.value, range);
    map[a.id] = computeActivityStatsFromRecords(subset.length > 0 ? subset : a.records.slice(0, 1));
  }
  return map;
});

const chartWindow = computed(() => activityStore.chartWindow);
const isChartWindowActive = computed(() => {
  const w = chartWindow.value;
  return w.xStartPercent > 0 || w.xEndPercent < 100;
});

const baselineStats = computed(() => {
  if (!showBaseline.value) return null;
  const id = baselineActivityId.value;
  if (!id) return null;
  return statsById.value[id] ?? null;
});

const hasAnyElevationGain = computed(() =>
  activeActivities.value.some((a) => statsById.value[a.id]?.elevationGainMeters !== null),
);

function formatDelta(field: "durationSeconds" | "distanceMeters", activityId: string): string {
  if (!showBaseline.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current[field];
  const b = base[field];
  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;

  const diffLabel = field === "durationSeconds" ? `${diff >= 0 ? "+" : ""}${Math.round(diff)}s` : `${diff >= 0 ? "+" : ""}${Math.round(diff)}m`;
  const pctLabel = pct === null ? "" : ` (${diff >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
  return activityId === baselineActivityId.value ? "baseline" : `${diffLabel}${pctLabel}`;
}

function formatNullableDelta(
  field: "elevationGainMeters",
  activityId: string,
): string {
  if (!showBaseline.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current[field];
  const b = base[field];
  if (a === null || b === null) return "—";
  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const diffLabel = `${diff >= 0 ? "+" : ""}${Math.round(diff)}m`;
  const pctLabel = pct === null ? "" : ` (${diff >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
  return activityId === baselineActivityId.value ? "baseline" : `${diffLabel}${pctLabel}`;
}

function formatMetricAvgDelta(metric: MetricType, activityId: string): string {
  if (!showBaseline.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current.metrics[metric].avg;
  const b = base.metrics[metric].avg;
  if (a === null || b === null) return "—";

  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const diffLabel = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}`;
  const pctLabel = pct === null ? "" : ` (${diff >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
  return activityId === baselineActivityId.value ? "baseline" : `${diffLabel}${pctLabel}`;
}
</script>

