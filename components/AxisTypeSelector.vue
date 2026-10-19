<template>
  <div class="shrink-0">
    <h3 class="m-0 mb-2 text-sm font-semibold text-gray-800 sm:mb-3 sm:text-base">X-Axis</h3>
    <div class="flex flex-wrap gap-1.5 rounded-md bg-gray-100 p-1 sm:flex-nowrap sm:gap-2">
      <button
        v-for="option in AXIS_OPTIONS"
        :key="option.value"
        type="button"
        :class="[
          'min-w-[44px] flex-1 cursor-pointer touch-manipulation rounded-sm border-0 bg-transparent px-3 py-2.5 text-xs font-medium text-gray-600 transition-all active:bg-gray-200 sm:px-4 sm:py-2 sm:text-sm sm:hover:bg-gray-200',
          value === option.value ? 'text-primary bg-white shadow-xs' : '',
        ]"
        :title="option.title"
        :aria-pressed="value === option.value"
        @click="$emit('update:value', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { XAxisType } from "~/utils/chart-config";

interface Props {
  value: XAxisType;
}

interface AxisOption {
  value: XAxisType;
  label: string;
  title: string;
}

const AXIS_OPTIONS: readonly AxisOption[] = [
  { value: "distance", label: "Distance", title: "Compare activities by distance covered" },
  { value: "time", label: "Elapsed Time", title: "Compare activities from start time" },
  { value: "localTime", label: "Local Time", title: "Compare activities by clock time" },
];

defineProps<Props>();

defineEmits<{
  "update:value": [value: XAxisType];
}>();
</script>
