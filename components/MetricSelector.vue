<template>
  <div class="flex-1">
    <h3 class="m-0 mb-2 text-sm font-semibold text-gray-800 sm:mb-3 sm:text-base">Metrics</h3>
    <template v-if="availableMetrics.length > 0">
      <div class="flex flex-col gap-2 sm:gap-2 md:grid md:grid-cols-2 lg:grid-cols-3">
        <label
          v-for="metric in availableMetrics"
          :key="metric.value"
          class="metric-label flex items-center gap-2 rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 transition-all"
          :class="[
            selectedMetrics.includes(metric.value) ? 'border-primary bg-blue-50' : '',
            isMultiSelect && selectedMetrics.includes(metric.value) && selectedMetrics.length === 1
              ? ''
              : 'cursor-pointer touch-manipulation hover:border-primary hover:bg-blue-50 hover:text-primary',
          ]"
        >
          <input
            v-if="isMultiSelect"
            type="checkbox"
            :checked="selectedMetrics.includes(metric.value)"
            :disabled="selectedMetrics.includes(metric.value) && selectedMetrics.length === 1"
            class="h-4 w-4 rounded-sm border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            :class="
              selectedMetrics.includes(metric.value) && selectedMetrics.length === 1
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer touch-manipulation'
            "
            @change="$emit('toggle', metric.value)"
          />
          <input
            v-else
            type="radio"
            :checked="selectedMetrics.includes(metric.value)"
            name="metric-select"
            class="radio-input h-4 w-4 cursor-pointer touch-manipulation text-primary"
            @change="$emit('toggle', metric.value)"
          />
          <span
            class="inline-flex shrink-0 items-center text-base leading-none sm:text-lg"
            :style="metric.iconYOffset !== 0 ? `transform: translateY(${metric.iconYOffset}px);` : ''"
          >
            {{ metric.icon }}
          </span>
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
    </template>
    <template v-else-if="hasActivities">
      <p class="text-center text-sm text-gray-400">No metrics available in loaded activities.</p>
    </template>
    <template v-else>
      <p class="text-center text-sm text-gray-400">Upload activity files to see available metrics.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MetricType } from "~/utils/chart-config";
import { METRIC_ORDER } from "~/utils/chart-config";
import type { Activity } from "~/types/activity";
import { METRIC_CONFIG } from "~/constants/ui";

interface Metric {
  value: MetricType;
  label: string;
  icon: string;
  iconYOffset: number;
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

// Build allMetrics array in canonical order
const allMetrics: Metric[] = METRIC_ORDER.map((metricValue) => {
  const config = METRIC_CONFIG[metricValue as keyof typeof METRIC_CONFIG];
  if (!config) {
    // For metrics not in METRIC_CONFIG (temp), use fallback
    return {
      value: metricValue,
      label: metricValue.charAt(0).toUpperCase() + metricValue.slice(1),
      icon: "📊",
      iconYOffset: 0,
    };
  }
  return {
    value: metricValue,
    label: config.label,
    icon: config.icon,
    iconYOffset: config.iconYOffset,
  };
});

const availableMetrics = computed(() => {
  // Filter to only available metrics that have data in at least one activity, maintaining canonical order
  return allMetrics.filter((metric) => {
    if (!props.availableMetrics.includes(metric.value)) return false;
    // Double-check: ensure at least one activity has data for this metric
    return getActivityIdsForMetric(metric.value).length > 0;
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

<style scoped>
.radio-input {
  appearance: none;
  -webkit-appearance: none;
  border-radius: 9999px;
  outline: none;
  border: 1px solid rgb(209 213 219);
}

.radio-input:checked {
  background-color: currentColor;
  background-image: radial-gradient(circle, white 30%, transparent 30%);
}

.metric-label {
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: outline 0.2s ease-in-out;
}

.metric-label:has(.radio-input:focus),
.metric-label:has(.radio-input:focus-visible) {
  outline: 2px solid rgb(59 130 246);
  outline-offset: 2px;
}
</style>
