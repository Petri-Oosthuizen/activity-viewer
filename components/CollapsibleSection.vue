<template>
  <div :class="['rounded-lg border-2 border-gray-200 bg-white', $attrs.class]">
    <button
      type="button"
      class="collapsible-section-button w-full touch-manipulation rounded-lg p-3 text-left sm:p-4"
      :aria-expanded="open"
      @click="open = !open"
    >
      <div class="flex items-center justify-between">
        <div class="flex-1 text-left">
          <span class="text-sm font-semibold text-gray-800 sm:text-base">
            <slot name="title">Advanced Settings</slot>
          </span>
          <div v-if="$slots.description" class="mt-0.5 text-xs text-gray-500 sm:text-sm">
            <slot name="description"></slot>
          </div>
        </div>
        <svg
          :class="['h-5 w-5 shrink-0 text-gray-600 transition-transform', open ? 'rotate-180' : '']"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <div v-show="open" class="collapsible-section-content border-t border-gray-200 p-3 sm:p-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: false,
});

const open = ref(props.defaultOpen);
</script>

<style scoped>
.collapsible-section-button {
  outline: none;
  transition: outline 0.2s ease-in-out;
}

.collapsible-section-button:focus,
.collapsible-section-button:focus-visible {
  outline: 2px solid rgb(59 130 246);
  outline-offset: -2px;
}
</style>
