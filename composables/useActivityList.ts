/**
 * Composable for activity list operations
 * Centralizes common activity management logic
 */

import { computed } from "vue";
import { useActivityStore } from "~/stores/activity";
import type { Activity } from "~/types/activity";

export function useActivityList() {
  const activityStore = useActivityStore();

  const activities = computed(() => activityStore.activities);
  const hasActivities = computed(() => activities.value.length > 0);
  const activeActivities = computed(() =>
    activities.value.filter((a) => !activityStore.isActivityDisabled(a.id))
  );

  const removeActivity = (id: string) => {
    activityStore.removeActivity(id);
  };

  const toggleActivity = (id: string) => {
    activityStore.toggleActivity(id);
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all activities?")) {
      activityStore.clearAll();
    }
  };

  const isActivityDisabled = (id: string) => {
    return activityStore.isActivityDisabled(id);
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

