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
          :value="baselineActivityId || ''"
          class="baseline-select focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:w-auto sm:min-w-[200px] sm:max-w-[400px] md:max-w-[500px] sm:px-3 sm:py-1.5"
          @change="setBaselineActivityId"
        >
          <option v-for="a in activeActivities" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table class="w-full table-auto border-collapse text-left text-xs sm:text-sm">
        <thead class="bg-gray-50 text-gray-700">
          <tr>
            <th
              class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2.5 font-semibold sm:w-24 sm:px-3"
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
          <tr class="bg-white">
            <td
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
            >
              Duration
            </td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
            >
              <div>{{ formatTime(statsById[a.id]?.durationSeconds ?? 0) }}</div>
              <div
                v-if="showBaseline"
                class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                :title="formatDelta('durationSeconds', a.id) === '—' ? 'Same as baseline' : ''"
              >
                {{ formatDelta("durationSeconds", a.id) }}
              </div>
            </td>
          </tr>

          <tr class="bg-white">
            <td
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
            >
              Distance
            </td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
            >
              <div>{{ formatDistance(statsById[a.id]?.distanceMeters ?? 0) }}</div>
              <div
                v-if="showBaseline"
                class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                :title="formatDelta('distanceMeters', a.id) === '—' ? 'Same as baseline' : ''"
              >
                {{ formatDelta("distanceMeters", a.id) }}
              </div>
            </td>
          </tr>

          <template v-if="hasAnyElevation">
            <tr class="bg-gray-50">
              <td
                colspan="2"
                class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
              >
                Elevation
              </td>
              <td
                v-for="a in activeActivities.slice(1)"
                :key="a.id"
                class="border-b border-gray-200 bg-gray-50"
              ></td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">gained</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div>
                  {{
                    statsById[a.id]?.elevationGainMeters === null ||
                    statsById[a.id]?.elevationGainMeters === undefined
                      ? "—"
                      : `${Math.round(statsById[a.id]!.elevationGainMeters!)} m`
                  }}
                </div>
                <div
                  v-if="showBaseline"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatNullableDelta('elevationGainMeters', a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatNullableDelta("elevationGainMeters", a.id) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">lost</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div>
                  {{
                    statsById[a.id]?.elevationLossMeters === null ||
                    statsById[a.id]?.elevationLossMeters === undefined
                      ? "—"
                      : `${Math.round(statsById[a.id]!.elevationLossMeters!)} m`
                  }}
                </div>
                <div
                  v-if="showBaseline"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatNullableDelta('elevationLossMeters', a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatNullableDelta("elevationLossMeters", a.id) }}
                </div>
              </td>
            </tr>
          </template>

          <template v-for="metric in metrics" :key="metric">
            <tr class="bg-gray-50">
              <td
                colspan="2"
                class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
              >
                {{ getMetricName(metric) }}
              </td>
              <td
                v-for="a in activeActivities.slice(1)"
                :key="a.id"
                class="border-b border-gray-200 bg-gray-50"
              ></td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">min</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div>
                  {{
                    statsById[a.id]?.metrics[metric]?.min !== null &&
                    statsById[a.id]?.metrics[metric]?.min !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics[metric].min!, metric)
                      : "—"
                  }}
                </div>
                <div
                  v-if="showBaseline"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricMinDelta(metric, a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricMinDelta(metric, a.id) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">average</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div>
                  {{
                    statsById[a.id]?.metrics[metric]?.avg !== null &&
                    statsById[a.id]?.metrics[metric]?.avg !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics[metric].avg!, metric)
                      : "—"
                  }}
                </div>
                <div
                  v-if="showBaseline"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricAvgDelta(metric, a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricAvgDelta(metric, a.id) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">max</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div>
                  {{
                    statsById[a.id]?.metrics[metric]?.max !== null &&
                    statsById[a.id]?.metrics[metric]?.max !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics[metric].max!, metric)
                      : "—"
                  }}
                </div>
                <div
                  v-if="showBaseline"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricMaxDelta(metric, a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricMaxDelta(metric, a.id) }}
                </div>
              </td>
            </tr>
          </template>
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
import {
  computeGlobalXExtent,
  filterRecordsByXRange,
  isPercentWindowActive,
  percentWindowToXRange,
} from "~/utils/windowing";

const activityStore = useActivityStore();

const activeActivities = computed(() =>
  activityStore.activities.filter((a) => !activityStore.disabledActivities.has(a.id)),
);



const showBaseline = computed(() => activeActivities.value.length >= 2);
const descriptionText = computed(() =>
  showBaseline.value
    ? "Min, average, and max values per activity, compared to the baseline."
    : "Min, average, and max values for this activity.",
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
      const first = next[0];
      if (first) {
        baselineActivityId.value = first.id;
      }
    }
  },
  { immediate: true },
);

const setBaselineActivityId = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  baselineActivityId.value = target.value;
};

const allMetrics = ["hr", "pwr", "cad", "alt"] as const satisfies readonly MetricType[];
const metricLabels = computed(() => activityStore.metricLabels);

const metrics = computed(() => {
  return allMetrics.filter((metric) => {
    return activeActivities.value.some((activity) => {
      const stats = statsById.value[activity.id];
      if (!stats) return false;
      const metricStats = stats.metrics[metric];
      return metricStats.avg !== null || metricStats.min !== null || metricStats.max !== null;
    });
  });
});

const getMetricName = (metric: MetricType): string => {
  const label = metricLabels.value[metric];
  const match = label.match(/^(.+?)\s*\(/);
  return match ? match[1]!.trim() : label;
};

const getMetricUnit = (metric: MetricType): string => {
  const label = metricLabels.value[metric];
  const match = label.match(/\(([^)]+)\)/);
  return match ? match[1]! : "";
};

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

const hasAnyElevation = computed(() =>
  activeActivities.value.some(
    (a) =>
      statsById.value[a.id]?.elevationGainMeters !== null ||
      statsById.value[a.id]?.elevationLossMeters !== null,
  ),
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
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.5 && absPct < 0.05) return "—";

  const diffLabel =
    field === "durationSeconds"
      ? `${diff >= 0 ? "+" : ""}${Math.round(diff)}s`
      : `${diff >= 0 ? "+" : ""}${Math.round(diff)}m`;
  const formattedPct = pct !== null ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel = pct !== null ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}

function formatNullableDelta(
  field: "elevationGainMeters" | "elevationLossMeters",
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
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.5 && absPct < 0.05) return "—";

  const diffLabel = `${diff >= 0 ? "+" : ""}${Math.round(diff)}m`;
  const formattedPct = pct !== null ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel = pct !== null ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
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
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.05 && absPct < 0.05) return "—";

  const unit = getMetricUnit(metric);
  const formattedDiff = diff.toFixed(1).replace(/\.0$/, "");
  const diffLabel = `${diff >= 0 ? "+" : ""}${formattedDiff} ${unit}`;
  const formattedPct = pct !== null && absPct >= 0.05 ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel =
    pct !== null && absPct >= 0.05 ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}

function formatMetricMinDelta(metric: MetricType, activityId: string): string {
  if (!showBaseline.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current.metrics[metric].min;
  const b = base.metrics[metric].min;
  if (a === null || b === null) return "—";

  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.05 && absPct < 0.05) return "—";

  const unit = getMetricUnit(metric);
  const formattedDiff = diff.toFixed(1).replace(/\.0$/, "");
  const diffLabel = `${diff >= 0 ? "+" : ""}${formattedDiff} ${unit}`;
  const formattedPct = pct !== null && absPct >= 0.05 ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel =
    pct !== null && absPct >= 0.05 ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}

function formatMetricMaxDelta(metric: MetricType, activityId: string): string {
  if (!showBaseline.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current.metrics[metric].max;
  const b = base.metrics[metric].max;
  if (a === null || b === null) return "—";

  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.05 && absPct < 0.05) return "—";

  const unit = getMetricUnit(metric);
  const formattedDiff = diff.toFixed(1).replace(/\.0$/, "");
  const diffLabel = `${diff >= 0 ? "+" : ""}${formattedDiff} ${unit}`;
  const formattedPct = pct !== null && absPct >= 0.05 ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel =
    pct !== null && absPct >= 0.05 ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}
</script>
