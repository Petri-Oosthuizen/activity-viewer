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

  const unmatchedNames = ref<string[]>([]);

  // GPS alignment works on raw records with the current offset, since processed records already have it applied.
  const alignmentInputs = computed<Activity[]>(() =>
    activeActivities.value.map((activity) => ({
      ...activity,
      records: rawStore.getRawActivity(activity.id)?.records ?? [],
      offset: activityOffsets.value.get(activity.id) ?? 0,
    })),
  );

  const canAlignByGps = computed(() => alignmentInputs.value.filter(hasGpsPoint).length >= 2);

  const statusText = computed(() =>
    unmatchedNames.value.length > 0 ? `No GPS match: ${unmatchedNames.value.join(", ")}` : "",
  );

  function alignByGps(): void {
    const [reference, ...targets] = alignmentInputs.value;
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
    unmatchedNames.value = unmatched;
  }

  function resetOffsets(): void {
    for (const activity of activities.value) {
      settingsStore.setActivityOffset(activity.id, 0);
    }
    unmatchedNames.value = [];
  }

  return {
    canAlignByGps,
    statusText,
    alignByGps,
    resetOffsets,
  };
}
