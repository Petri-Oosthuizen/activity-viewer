/**
 * Activity Settings Store
 * Manages all user settings except metric selection and view mode
 */

import { defineStore } from "pinia";
import { shallowRef } from "vue";
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import { DEFAULT_GPS_DISTANCE_OPTIONS } from "~/utils/gps-distance";
import type { GpsSmoothingSettings, GpsPaceSmoothingSettings, OutlierSettings, SmoothingSettings } from "~/utils/chart-settings";
import {
  DEFAULT_GPS_PACE_SMOOTHING_SETTINGS,
  DEFAULT_GPS_SMOOTHING_SETTINGS,
  DEFAULT_OUTLIER_SETTINGS,
  DEFAULT_SMOOTHING_SETTINGS,
} from "~/utils/chart-settings";

export interface DeltaSettings {
  enabled: boolean;
  mode: "overlay" | "delta-only";
  baseActivityId: string | null;
  compareActivityId: string | null;
}

export interface PersistedActivitySettings {
  outlierSettings: OutlierSettings;
  gpsDistanceOptions: GpsDistanceOptions;
  smoothing: SmoothingSettings;
  gpsSmoothing: GpsSmoothingSettings;
  gpsPaceSmoothing: GpsPaceSmoothingSettings;
  deltaSettings: DeltaSettings;
}

export const useActivitySettingsStore = defineStore("activitySettings", () => {
  // Data Cleaning Settings
  const outlierSettings = shallowRef<OutlierSettings>({
    ...DEFAULT_OUTLIER_SETTINGS,
  });

  const gpsDistanceOptions = shallowRef<GpsDistanceOptions>({
    ...DEFAULT_GPS_DISTANCE_OPTIONS,
  });

  // Smoothing Settings
  const gpsSmoothing = shallowRef<GpsSmoothingSettings>({
    ...DEFAULT_GPS_SMOOTHING_SETTINGS,
  });

  const gpsPaceSmoothing = shallowRef<GpsPaceSmoothingSettings>({
    ...DEFAULT_GPS_PACE_SMOOTHING_SETTINGS,
  });

  const smoothing = shallowRef<SmoothingSettings>({
    ...DEFAULT_SMOOTHING_SETTINGS,
  });

  // Activity Display Settings
  const activityOffsets = shallowRef<Map<string, number>>(new Map());
  const activityScales = shallowRef<Map<string, number>>(new Map());

  // Comparison Settings
  const disabledActivities = shallowRef<Set<string>>(new Set());
  const deltaSettings = shallowRef<DeltaSettings>({
    enabled: false,
    mode: "overlay",
    baseActivityId: null,
    compareActivityId: null,
  });

  // Actions
  function setOutlierSettings(settings: OutlierSettings) {
    outlierSettings.value = { ...settings };
  }

  function setGpsDistanceOptions(options: Partial<GpsDistanceOptions>) {
    gpsDistanceOptions.value = { ...gpsDistanceOptions.value, ...options };
  }

  function setGpsSmoothing(settings: GpsSmoothingSettings) {
    gpsSmoothing.value = { ...settings };
  }

  function setGpsPaceSmoothing(settings: GpsPaceSmoothingSettings) {
    gpsPaceSmoothing.value = { ...settings };
  }

  function setSmoothing(settings: SmoothingSettings) {
    smoothing.value = { ...settings };
  }

  function setActivityOffset(activityId: string, offset: number) {
    const newMap = new Map(activityOffsets.value);
    newMap.set(activityId, offset);
    activityOffsets.value = newMap;
  }

  function setActivityScale(activityId: string, scale: number) {
    const newMap = new Map(activityScales.value);
    newMap.set(activityId, scale);
    activityScales.value = newMap;
  }

  function toggleActivity(activityId: string) {
    const newSet = new Set(disabledActivities.value);
    if (newSet.has(activityId)) {
      newSet.delete(activityId);
    } else {
      newSet.add(activityId);
    }
    disabledActivities.value = newSet;
  }

  function setDeltaSettings(settings: Partial<DeltaSettings>) {
    deltaSettings.value = { ...deltaSettings.value, ...settings };
  }

  function clearFileSpecificSettings() {
    activityOffsets.value = new Map();
    activityScales.value = new Map();
    disabledActivities.value = new Set();
    deltaSettings.value = {
      enabled: false,
      mode: "overlay",
      baseActivityId: null,
      compareActivityId: null,
    };
  }

  function exportSettings(): PersistedActivitySettings {
    return {
      outlierSettings: { ...outlierSettings.value },
      gpsDistanceOptions: { ...gpsDistanceOptions.value },
      smoothing: { ...smoothing.value },
      gpsSmoothing: { ...gpsSmoothing.value },
      gpsPaceSmoothing: { ...gpsPaceSmoothing.value },
      deltaSettings: { ...deltaSettings.value },
    };
  }

  function importSettings(settings: Partial<PersistedActivitySettings>) {
    if (settings.outlierSettings) setOutlierSettings(settings.outlierSettings);
    if (settings.gpsDistanceOptions) setGpsDistanceOptions(settings.gpsDistanceOptions);
    if (settings.smoothing) setSmoothing(settings.smoothing);
    if (settings.gpsSmoothing) setGpsSmoothing(settings.gpsSmoothing);
    if (settings.gpsPaceSmoothing) setGpsPaceSmoothing(settings.gpsPaceSmoothing);
    if (settings.deltaSettings) setDeltaSettings(settings.deltaSettings);
  }

  function clearAll() {
    outlierSettings.value = { ...DEFAULT_OUTLIER_SETTINGS };
    gpsDistanceOptions.value = { ...DEFAULT_GPS_DISTANCE_OPTIONS };
    gpsSmoothing.value = { ...DEFAULT_GPS_SMOOTHING_SETTINGS };
    gpsPaceSmoothing.value = { ...DEFAULT_GPS_PACE_SMOOTHING_SETTINGS };
    smoothing.value = { ...DEFAULT_SMOOTHING_SETTINGS };
    clearFileSpecificSettings();
  }

  return {
    // State
    outlierSettings,
    gpsDistanceOptions,
    gpsSmoothing,
    gpsPaceSmoothing,
    smoothing,
    activityOffsets,
    activityScales,
    disabledActivities,
    deltaSettings,

    // Actions
    setOutlierSettings,
    setGpsDistanceOptions,
    setGpsSmoothing,
    setGpsPaceSmoothing,
    setSmoothing,
    setActivityOffset,
    setActivityScale,
    toggleActivity,
    setDeltaSettings,
    clearFileSpecificSettings,
    clearAll,
    exportSettings,
    importSettings,
  };
});
