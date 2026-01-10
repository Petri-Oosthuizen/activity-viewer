<template>
  <div class="flex-1">
    <h3 class="m-0 mb-2 text-sm font-semibold text-gray-800 sm:mb-3 sm:text-base">Metrics</h3>
    <div
      v-if="availableMetrics.length > 0"
      class="rounded-md border-2 border-gray-200 bg-gray-50 p-3 sm:p-4"
    >
      <div class="flex flex-col gap-2 sm:gap-2">
        <label
          v-for="metric in availableMetrics"
          :key="metric.value"
          class="flex cursor-pointer touch-manipulation items-center gap-2 rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 transition-all hover:border-primary hover:bg-blue-50 hover:text-primary"
          :class="selectedMetrics.includes(metric.value) ? 'border-primary bg-blue-50' : ''"
        >
          <input
            v-if="isMultiSelect"
            type="checkbox"
            :checked="selectedMetrics.includes(metric.value)"
            class="h-4 w-4 cursor-pointer touch-manipulation rounded-sm border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            @change="$emit('toggle', metric.value)"
          />
          <input
            v-else
            type="radio"
            :checked="selectedMetrics.includes(metric.value)"
            name="metric-select"
            class="h-4 w-4 cursor-pointer touch-manipulation border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            @change="$emit('toggle', metric.value)"
          />
          <span class="shrink-0 text-base leading-none sm:text-lg">{{ metric.icon }}</span>
          <span class="flex-1 text-xs sm:text-sm">{{ metric.label }}</span>
          <div
            v-if="getActivityIdsForMetric(metric.value).length > 0"
            class="flex shrink-0 items-center gap-1"
            :title="`${getActivityIdsForMetric(metric.value).length} activit${getActivityIdsForMetric(metric.value).length === 1 ? 'y' : 'ies'} with data`"
          >
            <span
              v-for="activityId in getActivityIdsForMetric(metric.value)"
              :key="activityId"
              class="h-3 w-3 shrink-0 rounded-full border border-gray-200 ring-1 ring-gray-300"
              :style="{ backgroundColor: getActivityColor(activityId) }"
              :title="getActivityTooltip(activityId, metric.value)"
            />
          </div>
        </label>
      </div>
      <p class="mt-2 text-[10px] text-gray-500 sm:mt-3 sm:text-xs">
        {{ isMultiSelect ? 'Select multiple metrics to overlay.' : 'Select one metric to display.' }} Colored dots show which activities have data.
      </p>
    </div>
    <div
      v-else-if="hasActivities"
      class="rounded-md border-2 border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400"
    >
      <p>No metrics available in loaded activities.</p>
    </div>
    <div
      v-else
      class="rounded-md border-2 border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400"
    >
      <p>Upload activity files to see available metrics.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MetricType } from "~/utils/chart-config";
import type { Activity } from "~/types/activity";
import { METRIC_CONFIG } from "~/constants/ui";

interface Metric {
  value: MetricType;
  label: string;
  icon: string;
}

interface Props {
  availableMetrics: MetricType[];
  selectedMetric: MetricType;
  selectedMetrics: MetricType[];
  metricAvailability: Record<MetricType, string[]>;
  activities: Array<{
    id: string;
    name: string;
    color: string;
    recordCount: number;
    activity: Activity;
  }>;
  hasActivities?: boolean;
  isMultiSelect?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasActivities: false,
  isMultiSelect: true,
});

const emit = defineEmits<{
  select: [metric: MetricType];
  toggle: [metric: MetricType];
}>();

const allMetrics: Metric[] = [
  { value: "hr", label: METRIC_CONFIG.hr.label, icon: METRIC_CONFIG.hr.icon },
  { value: "alt", label: METRIC_CONFIG.alt.label, icon: METRIC_CONFIG.alt.icon },
  { value: "pwr", label: METRIC_CONFIG.pwr.label, icon: METRIC_CONFIG.pwr.icon },
  { value: "cad", label: METRIC_CONFIG.cad.label, icon: METRIC_CONFIG.cad.icon },
];

const availableMetrics = computed(() => {
  const filtered = allMetrics.filter((metric) => props.availableMetrics.includes(metric.value));
  // Keep altitude first; otherwise sort by how many activities include the metric.
  return filtered.sort((a, b) => {
    if (a.value === "alt" && b.value !== "alt") return -1;
    if (b.value === "alt" && a.value !== "alt") return 1;
    const countA = getActivityIdsForMetric(a.value).length;
    const countB = getActivityIdsForMetric(b.value).length;
    return countB - countA;
  });
});

const getActivityIdsForMetric = (metric: MetricType): string[] => {
  return props.metricAvailability[metric] || [];
};

const getActivityColor = (activityId: string): string => {
  const activity = props.activities.find((a) => a.id === activityId);
  return activity?.color || "#999";
};

const getActivityTooltip = (activityId: string, _metric: MetricType): string => {
  const activityData = props.activities.find((a) => a.id === activityId);
  if (!activityData || !activityData.activity) return "";

  // Just show the activity name (sample count is shown in activity list)
  return activityData.name;
};
</script>
