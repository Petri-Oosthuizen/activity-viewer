/**
 * Composable for localStorage persistence of raw activities
 * Handles saving and loading raw activities to/from browser localStorage
 *
 * Note: Saves RawActivity objects (not processed Activity objects) so that
 * activities can be reprocessed with different settings.
 */

import { ref, computed, watch, onMounted, nextTick, getCurrentInstance } from "vue";
import { useRawActivityStore } from "~/stores/rawActivity";
import type { RawActivity } from "~/types/activity";

const STORAGE_KEY_ENABLED = "activity-viewer:localStorageEnabled";
const STORAGE_KEY_ACTIVITIES = "activity-viewer:activities";
const STORAGE_WARNING_THRESHOLD_BYTES = 4 * 1024 * 1024;

type SaveActivitiesResult =
  | { status: "disabled" }
  | { status: "saved"; bytes: number }
  | { status: "quota-exceeded"; bytes: number }
  | { status: "error"; bytes?: number };

const sharedIsEnabled = ref(false);
const sharedIsInitialized = ref(false);
const sharedIsLoading = ref(false);
const sharedSaveError = ref<string | null>(null);
const sharedEstimatedStorageBytes = ref<number>(0);
let watchedStores = new WeakSet<object>();
let saveRequestCounter = 0;

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

export function resetLocalStoragePersistenceStateForTests() {
  sharedIsEnabled.value = false;
  sharedIsInitialized.value = false;
  sharedIsLoading.value = false;
  sharedSaveError.value = null;
  sharedEstimatedStorageBytes.value = 0;
  watchedStores = new WeakSet<object>();
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read blob as array buffer"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("File read error"));
    reader.readAsArrayBuffer(blob);
  });
}

export function useLocalStoragePersistence() {
  const rawActivityStore = useRawActivityStore();
  const isEnabled = sharedIsEnabled;
  const isInitialized = sharedIsInitialized;
  const isLoading = sharedIsLoading;
  const saveError = sharedSaveError;
  const estimatedStorageBytes = sharedEstimatedStorageBytes;

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

  if (!isInitialized.value) {
    isLoading.value = getInitialLoadingState();
  }

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

  const clearPersistenceStorage = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_ENABLED);
    localStorage.removeItem(STORAGE_KEY_ACTIVITIES);
  };

  const setPersistenceDisabled = (message: string | null = null) => {
    if (typeof window !== "undefined") {
      clearPersistenceStorage();
    }
    isEnabled.value = false;
    estimatedStorageBytes.value = 0;
    saveError.value = message;
  };

  const isQuotaExceededError = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const maybeError = error as { name?: string; message?: string };
    return (
      maybeError.name === "QuotaExceededError" ||
      maybeError.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      maybeError.message?.toLowerCase().includes("quota") === true
    );
  };

  const buildQuotaExceededMessage = (bytes: number): string => {
    const sizeMb = (bytes / (1024 * 1024)).toFixed(1);
    return `Local browser save was turned off because the current activities need about ${sizeMb} MB, which exceeds available storage. Files remain loaded for this session.`;
  };

  const saveEnabledState = async (enabled: boolean) => {
    if (typeof window === "undefined") return;
    try {
      if (enabled) {
        localStorage.setItem(STORAGE_KEY_ENABLED, "true");
        isEnabled.value = true;
        saveError.value = null;
        if (isInitialized.value) {
          await saveActivities();
        }
      } else {
        setPersistenceDisabled();
      }
    } catch (error) {
      console.error("Failed to save localStorage enabled state:", error);
      setPersistenceDisabled("Could not enable local browser save in this browser.");
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
        const arrayBuffer = await blobToArrayBuffer(rawActivity.fileContent);
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

  const saveActivities = async (): Promise<SaveActivitiesResult> => {
    if (typeof window === "undefined" || !isEnabled.value) {
      return { status: "disabled" };
    }

    try {
      const requestId = ++saveRequestCounter;
      const serialized = await Promise.all(rawActivityStore.rawActivities.map(serializeRawActivity));
      const payload = JSON.stringify(serialized);
      const bytes = new Blob([payload]).size;

      if (requestId !== saveRequestCounter) {
        return { status: "saved", bytes };
      }

      localStorage.setItem(STORAGE_KEY_ACTIVITIES, payload);
      estimatedStorageBytes.value = bytes;
      saveError.value = null;

      return { status: "saved", bytes };
    } catch (error) {
      const bytes =
        typeof window !== "undefined"
          ? new Blob([JSON.stringify(rawActivityStore.rawActivities)]).size
          : 0;

      if (isQuotaExceededError(error)) {
        console.error("Activity localStorage quota exceeded:", error);
        setPersistenceDisabled(buildQuotaExceededMessage(bytes));
        return { status: "quota-exceeded", bytes };
      }

      console.error("Failed to save activities to localStorage:", error);
      saveError.value = "Could not save activities locally. Files remain loaded for this session.";
      return { status: "error", bytes };
    }
  };

  const loadActivitiesFromStorage = (): RawActivity[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      if (!stored) return [];
      estimatedStorageBytes.value = new Blob([stored]).size;
      const parsed = JSON.parse(stored) as StoredRawActivity[];
      const loaded: RawActivity[] = [];
      for (const storedActivity of parsed) {
        try {
          const deserialized = deserializeRawActivity(storedActivity);
          loaded.push(deserialized);
        } catch (error) {
          console.error(`Failed to deserialize activity ${storedActivity.id}:`, error);
        }
      }
      return loaded;
    } catch (error) {
      console.error("Failed to load activities from localStorage:", error);
      return [];
    }
  };

  const loadActivities = (): RawActivity[] => {
    if (typeof window === "undefined" || !isEnabled.value) return [];
    return loadActivitiesFromStorage();
  };

  const initializeFromStorage = async () => {
    if (typeof window === "undefined") {
      isInitialized.value = true;
      isLoading.value = false;
      return;
    }
    const enabled = loadEnabledState();
    isEnabled.value = enabled;
    saveError.value = null;

    if (enabled) {
      try {
        const loadedActivities = loadActivitiesFromStorage();
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
      estimatedStorageBytes.value = 0;
      isLoading.value = false;
    }
    isInitialized.value = true;

    if (
      enabled &&
      rawActivityStore.rawActivities.length > 0 &&
      localStorage.getItem(STORAGE_KEY_ACTIVITIES) === null
    ) {
      await saveActivities();
    }
  };

  const setupPersistenceWatch = () => {
    if (watchedStores.has(rawActivityStore)) return;
    watchedStores.add(rawActivityStore);

    watch(
      () => rawActivityStore.rawActivities,
      () => {
        if (isEnabled.value && isInitialized.value) {
          void saveActivities();
        }
      },
      { deep: true },
    );
  };

  if (getCurrentInstance()) {
    onMounted(async () => {
      await initializeFromStorage();
      setupPersistenceWatch();
    });
  } else {
    isEnabled.value = loadEnabledState();
    isInitialized.value = true;
    saveError.value = null;
    estimatedStorageBytes.value = 0;
  }

  return {
    isEnabled: computed(() => isEnabled.value),
    isLoading: computed(() => isLoading.value),
    saveError: computed(() => saveError.value),
    estimatedStorageBytes: computed(() => estimatedStorageBytes.value),
    isStorageNearLimit: computed(
      () => estimatedStorageBytes.value >= STORAGE_WARNING_THRESHOLD_BYTES,
    ),
    setEnabled: saveEnabledState,
    saveActivities,
    loadActivities,
  };
}
