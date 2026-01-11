<template>
  <div class="rounded-lg bg-white p-4 shadow-xs sm:p-6">
    <div v-if="activities.length > 0" class="mb-3 flex items-center justify-between sm:mb-4">
      <h3 class="m-0 text-base font-semibold text-gray-800 sm:text-lg">Activities</h3>
      <button
        type="button"
        class="rounded-sm border border-red-500 bg-white px-3 py-2 text-sm text-red-500 transition-all active:bg-red-500 active:text-white sm:py-1.5 sm:hover:bg-red-500 sm:hover:text-white"
        @click="clearAll"
        aria-label="Clear all activities"
      >
        Clear All
      </button>
    </div>
    <div v-if="activities.length > 0" class="flex flex-col gap-2 sm:gap-3">
      <ActivityItem
        v-for="activity in activities"
        :key="activity.id"
        :activity="activity"
        @remove="removeActivity"
        @toggle="toggleActivity"
      />
    </div>
    <div :class="['mt-0', activities.length > 0 ? 'mt-3 border-t border-gray-200 pt-3 sm:mt-4 sm:pt-4' : '']">
      <Uploader :compact="activities.length > 0" />
    </div>
    <div v-if="activities.length > 0" class="mt-3 border-t border-gray-200 pt-3 sm:mt-4 sm:pt-4">
      <GpxProcessingSettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useActivityList } from "~/composables/useActivityList";
import ActivityItem from "./ActivityItem.vue";
import GpxProcessingSettings from "./GpxProcessingSettings.vue";

const { activities, removeActivity, toggleActivity, clearAll } = useActivityList();
</script>
