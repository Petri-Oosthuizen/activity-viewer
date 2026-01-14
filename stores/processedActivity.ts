/**
 * Processed Activity Store
 * Processes raw activities based on settings, calculates derived metrics
 */

import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { refDebounced } from "@vueuse/core";
import type { Activity } from "~/types/activity";
import { useRawActivityStore } from "./rawActivity";
import { useActivitySettingsStore } from "./activitySettings";
import { processActivityRecords } from "~/utils/activity-processor";
import { getActivityColorByIndex } from "~/utils/chart-config";

export const useProcessedActivityStore = defineStore("processedActivity", () => {
  const rawActivityStore = useRawActivityStore();
  const settingsStore = useActivitySettingsStore();

  const { rawActivities } = storeToRefs(rawActivityStore);
  const {
    outlierSettings,
    gpsSmoothing,
    gpsPaceSmoothing,
    smoothing,
    activityOffsets,
    activityScales,
  } = storeToRefs(settingsStore);

  const settingsKey = ref({
    outliers: outlierSettings.value,
    gpsSmoothing: gpsSmoothing.value,
    gpsPaceSmoothing: gpsPaceSmoothing.value,
    smoothing: smoothing.value,
    offsets: Array.from(activityOffsets.value.entries()),
    scales: Array.from(activityScales.value.entries()),
  });

  watch(
    [
      () => outlierSettings.value,
      () => gpsSmoothing.value,
      () => gpsPaceSmoothing.value,
      () => smoothing.value,
      () => activityOffsets.value,
      () => activityScales.value,
    ],
    () => {
      settingsKey.value = {
        outliers: outlierSettings.value,
        gpsSmoothing: gpsSmoothing.value,
        gpsPaceSmoothing: gpsPaceSmoothing.value,
        smoothing: smoothing.value,
        offsets: Array.from(activityOffsets.value.entries()),
        scales: Array.from(activityScales.value.entries()),
      };
    },
    { deep: true }
  );

  const debouncedSettingsKey = refDebounced(settingsKey, 300);

  const processedActivities = computed<Activity[]>(() => {
    const currentSettings = debouncedSettingsKey.value;
    return rawActivities.value.map((rawActivity, index) => {
      const offset = currentSettings.offsets.find(([id]) => id === rawActivity.id)?.[1] ?? 0;
      const scale = currentSettings.scales.find(([id]) => id === rawActivity.id)?.[1] ?? 1;
      const color = getActivityColorByIndex(index);

      const processedRecords = processActivityRecords(rawActivity.records, {
        outliers: currentSettings.outliers,
        gpsSmoothing: currentSettings.gpsSmoothing,
        gpsPaceSmoothing: currentSettings.gpsPaceSmoothing,
        smoothing: currentSettings.smoothing,
        scaling: scale,
        offset: offset,
      });

      return {
        id: rawActivity.id,
        name: rawActivity.name,
        records: processedRecords,
        sourceType: rawActivity.sourceType,
        offset: offset,
        scale: scale,
        color: color,
        startTime: rawActivity.metadata.startTime,
        calories: rawActivity.metadata.calories,
        sport: rawActivity.metadata.sport,
        laps: rawActivity.metadata.laps,
      };
    });
  });

  function getProcessedActivity(id: string): Activity | undefined {
    return processedActivities.value.find((a) => a.id === id);
  }

  return {
    processedActivities,
    getProcessedActivity,
  };
});
