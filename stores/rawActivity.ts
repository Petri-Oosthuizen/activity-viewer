/**
 * Raw Activity Store
 * Stores raw file data and parsed activities (pre-processing)
 */

import { defineStore } from "pinia";
import { shallowRef } from "vue";
import type { RawActivity } from "~/types/activity";

export const useRawActivityStore = defineStore("rawActivity", () => {
  const rawActivities = shallowRef<RawActivity[]>([]);

  function addRawActivity(activity: RawActivity) {
    rawActivities.value = [...rawActivities.value, activity];
  }

  function removeRawActivity(id: string) {
    rawActivities.value = rawActivities.value.filter((a) => a.id !== id);
  }

  function clearAll() {
    rawActivities.value = [];
  }

  function getRawActivity(id: string): RawActivity | undefined {
    return rawActivities.value.find((a) => a.id === id);
  }

  return {
    rawActivities,
    addRawActivity,
    removeRawActivity,
    clearAll,
    getRawActivity,
  };
});
