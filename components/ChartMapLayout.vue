<template>
  <div
    :class="[
      chartMapSideBySide
        ? 'mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 md:gap-8 lg:grid-cols-2 lg:items-start'
        : 'mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-6 md:gap-8',
    ]"
  >
    <ActivityChart class="w-full" />
    <ActivityMap class="w-full" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useUIStore } from "~/stores/ui";

const uiStore = useUIStore();
const { chartMapSideBySide } = storeToRefs(uiStore);
</script>
