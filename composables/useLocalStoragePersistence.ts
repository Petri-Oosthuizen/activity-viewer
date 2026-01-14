/**
 * Composable for localStorage persistence of raw activities
 * Handles saving and loading raw activities to/from browser localStorage
 *
 * Note: Saves RawActivity objects (not processed Activity objects) so that
 * activities can be reprocessed with different settings.
 */

import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import type { RawActivity } from "~/types/activity";

const STORAGE_KEY_ENABLED = "activity-viewer:localStorageEnabled";
const STORAGE_KEY_ACTIVITIES = "activity-viewer:activities";

interface StoredRawActivity {
  id: string;
  name: string;
  sourceType: "gpx" | "fit" | "tcx";
  fileContent?: string; // Stored as string (base64 for binary files, plain text for XML)
  fileContentIsBase64?: boolean; // Flag to indicate if fileContent is base64 encoded
  records: RawActivity["records"];
  metadata: {
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
  };
}

export function useLocalStoragePersistence() {
  const rawActivityStore = useRawActivityStore();
  const settingsStore = useActivitySettingsStore();
  const isEnabled = ref(false);
  const isInitialized = ref(false);

  // Initialize loading state synchronously if localStorage is enabled and has activities (client-side only)
  // This prevents flash of upload UI when localStorage is enabled
  const getInitialLoadingState = (): boolean => {
    if (typeof window === "undefined") return false;
    const enabled = localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
    if (!enabled) return false;
    // Check if there are activities to load
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      if (!stored) return false;
      const parsed = JSON.parse(stored) as StoredRawActivity[];
      return parsed.length > 0;
    } catch {
      return false;
    }
  };
  const isLoading = ref(getInitialLoadingState());

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

  const serializeRawActivity = async (rawActivity: RawActivity): Promise<StoredRawActivity> => {
    let fileContent: string | undefined;
    let fileContentIsBase64 = false;

    if (rawActivity.fileContent) {
      if (typeof rawActivity.fileContent === "string") {
        fileContent = rawActivity.fileContent;
      } else if (rawActivity.fileContent instanceof Blob) {
        // Convert Blob to base64 string
        const arrayBuffer = await rawActivity.fileContent.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = String.fromCharCode(...uint8Array);
        fileContent = btoa(binaryString);
        fileContentIsBase64 = true;
      }
    }

    const laps = rawActivity.metadata.laps?.map((lap) => ({
      startTime: lap.startTime.toISOString(),
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

    // Clean records: remove any processed/derived fields (pace, grade, verticalSpeed) that shouldn't be saved
    // These are calculated during processing and should not be persisted
    const cleanedRecords = rawActivity.records.map((record) => {
      const cleaned = { ...record };
      delete cleaned.pace;
      delete cleaned.grade;
      delete cleaned.verticalSpeed;
      return cleaned;
    });

    return {
      id: rawActivity.id,
      name: rawActivity.name,
      sourceType: rawActivity.sourceType,
      fileContent,
      fileContentIsBase64,
      records: cleanedRecords,
      metadata: {
        startTime: rawActivity.metadata.startTime?.toISOString(),
        calories: rawActivity.metadata.calories,
        sport: rawActivity.metadata.sport,
        laps: laps,
      },
    };
  };

  const deserializeRawActivity = (stored: StoredRawActivity): RawActivity => {
    let fileContent: Blob | string | undefined;
    if (stored.fileContent) {
      if (stored.fileContentIsBase64) {
        // Convert base64 string back to Blob
        const binaryString = atob(stored.fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileContent = new Blob([bytes]);
      } else {
        fileContent = stored.fileContent;
      }
    }

    const laps = stored.metadata.laps?.map((lap) => ({
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

    // Clean records: remove any processed fields (pace, grade, verticalSpeed) that shouldn't be in raw records
    // These are derived metrics that should be recalculated during processing
    const cleanedRecords = stored.records.map((record) => {
      const cleaned = { ...record };
      delete cleaned.pace;
      delete cleaned.grade;
      delete cleaned.verticalSpeed;
      return cleaned;
    });

    return {
      id: stored.id,
      name: stored.name,
      sourceType: stored.sourceType,
      fileContent,
      records: cleanedRecords,
      metadata: {
        startTime: stored.metadata.startTime ? new Date(stored.metadata.startTime) : undefined,
        calories: stored.metadata.calories,
        sport: stored.metadata.sport,
        laps: laps,
      },
    };
  };

  const saveActivities = () => {
    if (typeof window === "undefined" || !isEnabled.value) return;
    // Use setTimeout to handle async serialization without blocking
    Promise.all(rawActivityStore.rawActivities.map(serializeRawActivity))
      .then((serialized) => {
        localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(serialized));
      })
      .catch((error) => {
        console.error("Failed to save activities to localStorage:", error);
      });
  };

  const loadActivities = (): RawActivity[] => {
    if (typeof window === "undefined" || !isEnabled.value) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as StoredRawActivity[];
      return parsed.map(deserializeRawActivity);
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
        if (loadedActivities.length > 0 && rawActivityStore.rawActivities.length === 0) {
          // Load activities into rawActivityStore
          loadedActivities.forEach((rawActivity) => {
            rawActivityStore.addRawActivity(rawActivity);
          });
          // Wait for Vue to process the reactive updates and render
          await nextTick();
          // Small delay to ensure smooth transition and that activities are fully processed
          await new Promise((resolve) => setTimeout(resolve, 100));
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
      () => rawActivityStore.rawActivities,
      () => {
        if (isEnabled.value && isInitialized.value) {
          saveActivities();
        }
      },
      { deep: true },
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
