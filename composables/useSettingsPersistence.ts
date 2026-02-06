/**
 * Composable for localStorage persistence of settings
 * Handles saving and loading settings to/from browser localStorage
 */

import { watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { useUIStore } from "~/stores/ui";
import { DEFAULT_SETTINGS, cloneSettings, type AppSettings } from "~/utils/default-settings";

const STORAGE_KEY_SETTINGS = "activity-viewer:settings";

export function useSettingsPersistence() {
  const settingsStore = useActivitySettingsStore();
  const chartOptionsStore = useChartOptionsStore();
  const chartSeriesStore = useChartSeriesStore();
  const uiStore = useUIStore();

  const {
    outlierSettings,
    gpsDistanceOptions,
    smoothing,
    gpsSmoothing,
    gpsPaceSmoothing,
    deltaSettings,
  } = storeToRefs(settingsStore);

  const {
    selectedMetrics,
    xAxisType,
    viewMode,
    metricSelectionMode,
  } = storeToRefs(chartOptionsStore);

  const { transformationSettings } = storeToRefs(chartSeriesStore);

  const {
    overviewDisplayMode,
    overviewBaselineEnabled,
    overviewBaselineActivityId,
  } = storeToRefs(uiStore);

  const saveSettings = () => {
    if (typeof window === "undefined") return;
    try {
      // Use the type-safe clone function to ensure all properties are included
      const currentSettings: AppSettings = {
        activitySettings: {
          outlierSettings: outlierSettings.value,
          gpsDistanceOptions: gpsDistanceOptions.value,
          smoothing: smoothing.value,
          gpsSmoothing: gpsSmoothing.value,
          gpsPaceSmoothing: gpsPaceSmoothing.value,
          deltaSettings: deltaSettings.value,
        },
        chartOptions: {
          selectedMetrics: selectedMetrics.value,
          xAxisType: xAxisType.value,
          viewMode: viewMode.value,
          metricSelectionMode: metricSelectionMode.value,
        },
        chartSeries: {
          transformationSettings: transformationSettings.value,
        },
        ui: {
          overviewDisplayMode: overviewDisplayMode.value,
          overviewBaselineEnabled: overviewBaselineEnabled.value,
          overviewBaselineActivityId: overviewBaselineActivityId.value,
        },
      };

      // Clone to ensure we have a clean copy for storage
      const stored = cloneSettings(currentSettings);
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(stored));
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error);
    }
  };

  const loadSettings = () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!stored) return;
      const parsed = JSON.parse(stored) as AppSettings;

      // Load activity settings
      if (parsed.activitySettings) {
        if (parsed.activitySettings.outlierSettings) {
          settingsStore.setOutlierSettings(parsed.activitySettings.outlierSettings);
        }
        if (parsed.activitySettings.gpsDistanceOptions) {
          settingsStore.setGpsDistanceOptions(parsed.activitySettings.gpsDistanceOptions);
        }
        if (parsed.activitySettings.smoothing) {
          settingsStore.setSmoothing(parsed.activitySettings.smoothing);
        }
        if (parsed.activitySettings.gpsSmoothing) {
          settingsStore.setGpsSmoothing(parsed.activitySettings.gpsSmoothing);
        }
        if (parsed.activitySettings.gpsPaceSmoothing) {
          settingsStore.setGpsPaceSmoothing(parsed.activitySettings.gpsPaceSmoothing);
        }
        if (parsed.activitySettings.deltaSettings) {
          settingsStore.setDeltaSettings(parsed.activitySettings.deltaSettings);
        }
      }

      // Load chart options
      if (parsed.chartOptions) {
        if (parsed.chartOptions.selectedMetrics) {
          chartOptionsStore.setSelectedMetrics(parsed.chartOptions.selectedMetrics);
        }
        if (parsed.chartOptions.xAxisType) {
          chartOptionsStore.setXAxisType(parsed.chartOptions.xAxisType);
        }
        if (parsed.chartOptions.viewMode) {
          chartOptionsStore.setViewMode(parsed.chartOptions.viewMode);
        }
        if (parsed.chartOptions.metricSelectionMode) {
          chartOptionsStore.setMetricSelectionMode(parsed.chartOptions.metricSelectionMode);
        }
      }

      // Load chart series settings
      if (parsed.chartSeries?.transformationSettings) {
        chartSeriesStore.setTransformationSettings(parsed.chartSeries.transformationSettings);
      }

      // Load UI settings
      if (parsed.ui) {
        if (parsed.ui.overviewDisplayMode) {
          uiStore.setOverviewDisplayMode(parsed.ui.overviewDisplayMode);
        }
        if (parsed.ui.overviewBaselineEnabled !== undefined) {
          uiStore.setOverviewBaselineEnabled(parsed.ui.overviewBaselineEnabled);
        }
        if (parsed.ui.overviewBaselineActivityId !== undefined) {
          uiStore.setOverviewBaselineActivityId(parsed.ui.overviewBaselineActivityId);
        }
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
    }
  };

  const clearFileSpecificSettings = () => {
    // Clear activity-specific settings (offsets, scales, disabled activities)
    // These are file-specific and should be cleared when files are cleared
    settingsStore.clearFileSpecificSettings();
  };

  const resetToDefaults = () => {
    // Reset all settings to default values
    const defaults = DEFAULT_SETTINGS;

    // Reset activity settings
    settingsStore.setOutlierSettings(defaults.activitySettings.outlierSettings);
    settingsStore.setGpsDistanceOptions(defaults.activitySettings.gpsDistanceOptions);
    settingsStore.setSmoothing(defaults.activitySettings.smoothing);
    settingsStore.setGpsSmoothing(defaults.activitySettings.gpsSmoothing);
    settingsStore.setGpsPaceSmoothing(defaults.activitySettings.gpsPaceSmoothing);
    settingsStore.setDeltaSettings(defaults.activitySettings.deltaSettings);

    // Reset chart options
    chartOptionsStore.setSelectedMetrics(defaults.chartOptions.selectedMetrics);
    chartOptionsStore.setXAxisType(defaults.chartOptions.xAxisType);
    chartOptionsStore.setViewMode(defaults.chartOptions.viewMode);
    chartOptionsStore.setMetricSelectionMode(defaults.chartOptions.metricSelectionMode);

    // Reset chart series settings
    chartSeriesStore.setTransformationSettings(defaults.chartSeries.transformationSettings);

    // Reset UI settings
    uiStore.setOverviewDisplayMode(defaults.ui.overviewDisplayMode);
    uiStore.setOverviewBaselineEnabled(defaults.ui.overviewBaselineEnabled);
    uiStore.setOverviewBaselineActivityId(defaults.ui.overviewBaselineActivityId);

    // Clear file-specific settings
    settingsStore.clearFileSpecificSettings();

    // Save to localStorage
    saveSettings();
  };

  onMounted(() => {
    loadSettings();

    // Watch for changes and save to localStorage
    watch(
      [
        outlierSettings,
        gpsDistanceOptions,
        smoothing,
        gpsSmoothing,
        gpsPaceSmoothing,
        deltaSettings,
        selectedMetrics,
        xAxisType,
        viewMode,
        metricSelectionMode,
        transformationSettings,
        overviewDisplayMode,
        overviewBaselineEnabled,
        overviewBaselineActivityId,
      ],
      () => {
        saveSettings();
      },
      { deep: true },
    );
  });

  return {
    saveSettings,
    loadSettings,
    clearFileSpecificSettings,
    resetToDefaults,
  };
}
