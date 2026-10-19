import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import type { Activity } from "~/types/activity";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useActivityList } from "~/composables/useActivityList";
import { computeGpsAlignment } from "~/utils/gps-align";

function hasGpsPoint(activity: Activity): boolean {
  return activity.records.some((r) => typeof r.lat === "number" && typeof r.lon === "number");
}

export function useActivityAlignment() {
  const rawStore = useRawActivityStore();
  const settingsStore = useActivitySettingsStore();
  const { activities, activeActivities } = useActivityList();
  const { activityOffsets } = storeToRefs(settingsStore);

  const noGpsNames = ref<string[]>([]);
  const unmatchedNames = ref<string[]>([]);

  // GPS alignment uses raw records so smoothing settings do not move the match.
  const alignmentInputs = computed<Activity[]>(() =>
    activeActivities.value.map((activity) => ({
      ...activity,
      records: rawStore.getRawActivity(activity.id)?.records ?? [],
      offset: activityOffsets.value.get(activity.id) ?? 0,
    })),
  );

  const gpsInputs = computed(() => alignmentInputs.value.filter(hasGpsPoint));

  const canAlignByGps = computed(() => gpsInputs.value.length >= 2);

  const statusText = computed(() =>
    [
      noGpsNames.value.length > 0 ? `No GPS: ${noGpsNames.value.join(", ")}` : "",
      unmatchedNames.value.length > 0 ? `No GPS match: ${unmatchedNames.value.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(". "),
  );

  function alignByGps(): void {
    const [reference, ...targets] = gpsInputs.value;
    if (!reference) return;
    const unmatched: string[] = [];
    for (const target of targets) {
      const result = computeGpsAlignment(reference, target);
      if (result) {
        settingsStore.setActivityOffset(target.id, result.offsetSeconds);
      } else {
        unmatched.push(target.name);
      }
    }
    noGpsNames.value = alignmentInputs.value.filter((a) => !hasGpsPoint(a)).map((a) => a.name);
    unmatchedNames.value = unmatched;
  }

  function resetOffsets(): void {
    for (const activity of activities.value) {
      settingsStore.setActivityOffset(activity.id, 0);
    }
    noGpsNames.value = [];
    unmatchedNames.value = [];
  }

  return {
    canAlignByGps,
    statusText,
    alignByGps,
    resetOffsets,
  };
}
