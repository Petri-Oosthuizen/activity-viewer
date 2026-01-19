<template>
  <div
    v-if="shouldShow"
    class="mt-4 mb-3 hidden items-center justify-end sm:mt-6 sm:mb-4 lg:flex"
  >
    <button
      type="button"
      class="flex touch-manipulation items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 sm:px-4 sm:py-2 sm:text-sm"
      @click="toggleSideBySide"
      :title="chartMapSideBySide ? 'View stacked' : 'View side by side'"
    >
      <svg
        v-if="chartMapSideBySide"
        class="h-4 w-4 sm:h-5 sm:w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
      <svg
        v-else
        class="h-4 w-4 sm:h-5 sm:w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
      <span class="hidden sm:inline">
        {{ chartMapSideBySide ? "View stacked" : "View side by side" }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useUIStore } from "~/stores/ui";
import { useActivityList } from "~/composables/useActivityList";

const uiStore = useUIStore();
const { chartMapSideBySide } = storeToRefs(uiStore);
const { hasActivities } = useActivityList();

const shouldShow = computed(() => hasActivities.value);

const toggleSideBySide = () => {
  uiStore.setChartMapSideBySide(!chartMapSideBySide.value);
};
</script>
