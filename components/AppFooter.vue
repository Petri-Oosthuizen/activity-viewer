<template>
  <footer
    class="mt-auto border-t border-gray-200 bg-white p-4 text-center text-xs text-gray-500 sm:p-6 sm:text-sm"
  >
    <p class="m-0">
      Petri
      <span v-if="buildNumber && buildNumber !== 'dev'" class="mx-2">•</span>
      <span v-if="buildNumber && buildNumber !== 'dev'" class="font-mono"
        >Build #{{ buildNumber }}</span
      >
    </p>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";

const config = useRuntimeConfig();
const buildNumber = computed(() => config.public.buildNumber);
</script>
