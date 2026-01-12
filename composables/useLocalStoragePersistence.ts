/**
 * Composable for localStorage persistence of activities
 * Handles saving and loading activities to/from browser localStorage
 */

import { ref, computed, watch, onMounted } from "vue";
import { useActivityStore } from "~/stores/activity";
import type { Activity } from "~/types/activity";

const STORAGE_KEY_ENABLED = "activity-viewer:localStorageEnabled";
const STORAGE_KEY_ACTIVITIES = "activity-viewer:activities";

interface StoredActivity {
  id: string;
  name: string;
  records: Activity["records"];
  sourceType?: Activity["sourceType"];
  offset: number;
  scale: number;
  color: string;
  startTime?: string; // Serialized as ISO string
  calories?: number;
  sport?: string;
  laps?: Array<{
    startTime: string; // Serialized as ISO string
    startRecordIndex: number;
    endRecordIndex: number;
    totalTimeSeconds?: number;
    distanceMeters?: number;
    calories?: number;
    averageHeartRateBpm?: number;
    maximumHeartRateBpm?: number;
    averageCadence?: number;
    maximumCadence?: number;
    averageSpeed?: number;
    maximumSpeed?: number;
    intensity?: "Active" | "Resting";
    triggerMethod?: string;
  }>;
}

export function useLocalStoragePersistence() {
  const activityStore = useActivityStore();
  const isEnabled = ref(false);
  const isInitialized = ref(false);
  
  // Initialize loading state synchronously if localStorage is enabled (client-side only)
  // This prevents flash of upload UI when localStorage is enabled
  const isLoading = ref(
    typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY_ENABLED) === "true"
  );

  const loadEnabledState = (): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ENABLED);
      return stored === "true";
    } catch (error) {
      console.error("Failed to load localStorage enabled state:", error);
      return false;
    }
  };

  const saveEnabledState = (enabled: boolean) => {
    if (typeof window === "undefined") return;
    try {
      if (enabled) {
        localStorage.setItem(STORAGE_KEY_ENABLED, "true");
        if (isInitialized.value) {
          saveActivities();
        }
      } else {
        localStorage.removeItem(STORAGE_KEY_ENABLED);
        localStorage.removeItem(STORAGE_KEY_ACTIVITIES);
      }
      isEnabled.value = enabled;
    } catch (error) {
      console.error("Failed to save localStorage enabled state:", error);
    }
  };

  const serializeActivity = (activity: Activity): StoredActivity => {
    const laps = activity.laps?.map((lap) => ({
      startTime: lap.startTime instanceof Date ? lap.startTime.toISOString() : lap.startTime.toISOString(),
      startRecordIndex: lap.startRecordIndex,
      endRecordIndex: lap.endRecordIndex,
      totalTimeSeconds: lap.totalTimeSeconds,
      distanceMeters: lap.distanceMeters,
      calories: lap.calories,
      averageHeartRateBpm: lap.averageHeartRateBpm,
      maximumHeartRateBpm: lap.maximumHeartRateBpm,
      averageCadence: lap.averageCadence,
      maximumCadence: lap.maximumCadence,
      averageSpeed: lap.averageSpeed,
      maximumSpeed: lap.maximumSpeed,
      intensity: lap.intensity,
      triggerMethod: lap.triggerMethod,
    }));

    return {
      id: activity.id,
      name: activity.name,
      records: activity.records,
      sourceType: activity.sourceType,
      offset: activity.offset,
      scale: activity.scale,
      color: activity.color,
      startTime: activity.startTime?.toISOString(),
      calories: activity.calories,
      sport: activity.sport,
      laps: laps,
    };
  };

  const deserializeActivity = (stored: StoredActivity): Activity => {
    const laps = stored.laps?.map((lap) => ({
      startTime: new Date(lap.startTime),
      startRecordIndex: lap.startRecordIndex,
      endRecordIndex: lap.endRecordIndex,
      totalTimeSeconds: lap.totalTimeSeconds,
      distanceMeters: lap.distanceMeters,
      calories: lap.calories,
      averageHeartRateBpm: lap.averageHeartRateBpm,
      maximumHeartRateBpm: lap.maximumHeartRateBpm,
      averageCadence: lap.averageCadence,
      maximumCadence: lap.maximumCadence,
      averageSpeed: lap.averageSpeed,
      maximumSpeed: lap.maximumSpeed,
      intensity: lap.intensity,
      triggerMethod: lap.triggerMethod,
    }));
    
    return {
      id: stored.id,
      name: stored.name,
      records: stored.records,
      sourceType: stored.sourceType,
      offset: stored.offset,
      scale: stored.scale,
      color: stored.color,
      startTime: stored.startTime ? new Date(stored.startTime) : undefined,
      calories: stored.calories,
      sport: stored.sport,
      laps: laps,
    };
  };

  const saveActivities = () => {
    if (typeof window === "undefined" || !isEnabled.value) return;
    try {
      const serialized = activityStore.activities.map(serializeActivity);
      localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(serialized));
    } catch (error) {
      console.error("Failed to save activities to localStorage:", error);
    }
  };

  const loadActivities = (): Activity[] => {
    if (typeof window === "undefined" || !isEnabled.value) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as StoredActivity[];
      return parsed.map(deserializeActivity);
    } catch (error) {
      console.error("Failed to load activities from localStorage:", error);
      return [];
    }
  };

  const initializeFromStorage = async () => {
    if (typeof window === "undefined") {
      isInitialized.value = true;
      isLoading.value = false;
      return;
    }
    const enabled = loadEnabledState();
    isEnabled.value = enabled;

    if (enabled) {
      try {
        const loadedActivities = loadActivities();
        if (loadedActivities.length > 0 && activityStore.activities.length === 0) {
          const restoredActivities: Array<{ activity: Activity; offset: number; scale: number }> = [];
          
          loadedActivities.forEach((activity) => {
            activityStore.addActivity(
              activity.records,
              activity.name,
              activity.startTime,
              activity.sourceType,
              activity.calories,
              activity.sport,
              activity.laps
            );
            const lastIndex = activityStore.activities.length - 1;
            const addedActivity = activityStore.activities[lastIndex];
            if (addedActivity) {
              restoredActivities.push({
                activity: addedActivity,
                offset: activity.offset,
                scale: activity.scale,
              });
            }
          });

          restoredActivities.forEach(({ activity, offset, scale }) => {
            if (offset !== 0) {
              activityStore.updateOffset(activity.id, offset);
            }
            if (scale !== 1) {
              activityStore.updateScale(activity.id, scale);
            }
          });
        }
      } finally {
        isLoading.value = false;
      }
    } else {
      isLoading.value = false;
    }
    isInitialized.value = true;
  };

  onMounted(() => {
    initializeFromStorage();

    watch(
      () => activityStore.activities,
      () => {
        if (isEnabled.value && isInitialized.value) {
          saveActivities();
        }
      },
      { deep: true }
    );
  });

  return {
    isEnabled: computed(() => isEnabled.value),
    isLoading: computed(() => isLoading.value),
    setEnabled: saveEnabledState,
    saveActivities,
    loadActivities,
  };
}