/**
 * Transformation Store
 * Applies chart transformations to processed activities
 */

import { defineStore } from "pinia";
import { computed } from "vue";
import { storeToRefs } from "pinia";
import type { Activity } from "~/types/activity";
import { useProcessedActivityStore } from "./processedActivity";
import type { TransformationSettings } from "~/types/processing";

export const useTransformedActivityStore = defineStore("transformedActivity", () => {
  const processedStore = useProcessedActivityStore();
  const { processedActivities } = storeToRefs(processedStore);

  // For now, transformed activities are the same as processed activities
  // Transformations (smoothing, cumulative) are applied per-metric during chart rendering
  // This store exists for the architecture but transformations happen in chart-series-builder
  const transformedActivities = computed<Activity[]>(() => {
    return processedActivities.value;
  });

  function getTransformedActivity(id: string): Activity | undefined {
    return transformedActivities.value.find((a) => a.id === id);
  }

  return {
    transformedActivities,
    getTransformedActivity,
  };
});
