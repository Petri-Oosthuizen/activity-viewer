/**
 * Composable for activity list operations
 * Centralizes common activity management logic
 */

import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useProcessedActivityStore } from "~/stores/processedActivity";

export function useActivityList() {
  const rawActivityStore = useRawActivityStore();
  const settingsStore = useActivitySettingsStore();
  const processedStore = useProcessedActivityStore();

  const { processedActivities } = storeToRefs(processedStore);
  const { disabledActivities } = storeToRefs(settingsStore);

  const activities = computed(() => processedActivities.value);
  const hasActivities = computed(() => activities.value.length > 0);
  const activeActivities = computed(() =>
    activities.value.filter((a) => !disabledActivities.value.has(a.id))
  );

  const removeActivity = (id: string) => {
    rawActivityStore.removeRawActivity(id);
  };

  const toggleActivity = (id: string) => {
    settingsStore.toggleActivity(id);
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all activities?")) {
      rawActivityStore.clearAll();
      settingsStore.clearFileSpecificSettings();
      
      // Clear activities from localStorage (even if not currently loaded)
      if (typeof window !== "undefined") {
        try {
          // Save empty array to ensure localStorage is properly cleared
          localStorage.setItem("activity-viewer:activities", JSON.stringify([]));
        } catch (error) {
          console.error("Failed to clear activities from localStorage:", error);
        }
      }
    }
  };

  const isActivityDisabled = (id: string) => {
    return disabledActivities.value.has(id);
  };

  const getActivityColor = (activityId: string): string => {
    const activity = activities.value.find((a) => a.id === activityId);
    return activity?.color || "#999";
  };

  const getActivityName = (activityId: string): string => {
    const activity = activities.value.find((a) => a.id === activityId);
    return activity?.name || "Unknown";
  };

  return {
    activities,
    hasActivities,
    activeActivities,
    removeActivity,
    toggleActivity,
    clearAll,
    isActivityDisabled,
    getActivityColor,
    getActivityName,
  };
}

