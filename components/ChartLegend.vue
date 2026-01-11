<template>
  <div v-if="hasActivities" class="w-full">
    <div class="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:gap-2.5 sm:p-4">
      <div
        v-for="activity in activeActivities"
        :key="activity.id"
        class="flex items-center gap-2"
      >
        <div
          class="h-3 w-3 shrink-0 rounded-full"
          :style="{ backgroundColor: activity.color }"
          aria-hidden="true"
        ></div>
        <FileNameDisplay
          :filename="activity.name"
          class="min-w-0 flex-1 text-xs text-gray-700 sm:text-sm"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useActivityStore } from "~/stores/activity";
import FileNameDisplay from "./FileNameDisplay.vue";

const activityStore = useActivityStore();

const activities = computed(() =>
  activityStore.activities.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
  })),
);

const activeActivities = computed(() =>
  activities.value.filter((a) => !activityStore.isActivityDisabled(a.id)),
);

const hasActivities = computed(() => activeActivities.value.length > 0);
</script>
