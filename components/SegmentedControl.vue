<template>
  <div class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-0.5">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-1.5 sm:text-sm"
      :class="
        option.value === modelValue
          ? 'bg-primary text-white'
          : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
      "
      :title="option.title"
      :aria-label="option.ariaLabel"
      :aria-pressed="option.value === modelValue"
      :disabled="option.disabled"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

interface Props {
  modelValue: T;
  options: readonly SegmentedOption<T>[];
}

defineProps<Props>();

defineEmits<{
  "update:modelValue": [value: T];
}>();
</script>
