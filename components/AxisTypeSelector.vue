<template>
  <div class="flex-1">
    <h3 class="text-sm font-semibold text-gray-800 m-0 mb-2 sm:mb-3 sm:text-base">X-Axis</h3>
    <div class="flex gap-1.5 bg-gray-100 p-1 rounded-md flex-wrap sm:gap-2 sm:flex-nowrap">
      <button
        type="button"
        :class="[
          'flex-1 min-w-[44px] px-3 py-2.5 border-0 bg-transparent rounded-sm cursor-pointer text-xs font-medium text-gray-600 touch-manipulation transition-all active:bg-gray-200 sm:px-4 sm:py-2 sm:text-sm sm:hover:bg-gray-200',
          value === 'time' ? 'bg-white text-primary shadow-xs' : ''
        ]"
        @click="$emit('update:value', 'time')"
      >
        Elapsed Time
      </button>
      <button
        type="button"
        :class="[
          'flex-1 min-w-[44px] px-3 py-2.5 border-0 bg-transparent rounded-sm cursor-pointer text-xs font-medium text-gray-600 touch-manipulation transition-all active:bg-gray-200 sm:px-4 sm:py-2 sm:text-sm sm:hover:bg-gray-200',
          value === 'localTime' ? 'bg-white text-primary shadow-xs' : ''
        ]"
        @click="$emit('update:value', 'localTime')"
      >
        Local Time
      </button>
      <button
        type="button"
        :class="[
          'flex-1 min-w-[44px] px-3 py-2.5 border-0 bg-transparent rounded-sm cursor-pointer text-xs font-medium text-gray-600 touch-manipulation transition-all active:bg-gray-200 sm:px-4 sm:py-2 sm:text-sm sm:hover:bg-gray-200',
          value === 'distance' ? 'bg-white text-primary shadow-xs' : ''
        ]"
        @click="$emit('update:value', 'distance')"
      >
        Distance
      </button>
    </div>
    <p class="mt-2 text-xs text-gray-500 sm:text-sm">
      {{ 
        value === 'time' ? 'Compare activities from start time' : 
        value === 'localTime' ? 'Compare activities by clock time' : 
        'Compare activities by distance covered'
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { XAxisType } from "~/utils/chart-config";

interface Props {
  value: XAxisType;
}

defineProps<Props>();

defineEmits<{
  "update:value": [value: XAxisType];
}>();
</script>


