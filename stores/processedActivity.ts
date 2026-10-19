/**
 * Processed Activity Store
 * Processes raw activities based on settings, calculates derived metrics
 */

import { defineStore } from "pinia";
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { refDebounced } from "@vueuse/core";
import type { Activity, RawActivity } from "~/types/activity";
import { useRawActivityStore } from "./rawActivity";
import { useActivitySettingsStore } from "./activitySettings";
import { processActivityRecords } from "~/utils/activity-processor";
import { getActivityColorByIndex } from "~/utils/chart-config";

function earliestStartTime(activities: readonly RawActivity[]): Date | undefined {
  let earliest: Date | undefined;
  for (const activity of activities) {
    const start = activity.metadata.startTime;
    if (start && (!earliest || start.getTime() < earliest.getTime())) earliest = start;
  }
  return earliest;
}

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
    alignmentMode,
  } = storeToRefs(settingsStore);

  // Optimized: Keep Maps as Maps to avoid Array.from() overhead
  const settingsKey = computed(() => ({
    outliers: outlierSettings.value,
    gpsSmoothing: gpsSmoothing.value,
    gpsPaceSmoothing: gpsPaceSmoothing.value,
    smoothing: smoothing.value,
    offsets: activityOffsets.value,
    scales: activityScales.value,
    alignStarts: alignmentMode.value === "startTime",
  }));

  const debouncedSettingsKey = refDebounced(settingsKey, 150);

  const processedActivities = computed<Activity[]>(() => {
    const currentSettings = debouncedSettingsKey.value;
    const timelineStart = currentSettings.alignStarts ? earliestStartTime(rawActivities.value) : undefined;
    return rawActivities.value.map((rawActivity, index) => {
      const offset = currentSettings.offsets.get(rawActivity.id) ?? 0;
      const scale = currentSettings.scales.get(rawActivity.id) ?? 1;
      const color = getActivityColorByIndex(index);

      const processedRecords = processActivityRecords(rawActivity.records, {
        outliers: currentSettings.outliers,
        gpsSmoothing: currentSettings.gpsSmoothing,
        gpsPaceSmoothing: currentSettings.gpsPaceSmoothing,
        smoothing: currentSettings.smoothing,
        scaling: scale,
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
        timelineStart,
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
