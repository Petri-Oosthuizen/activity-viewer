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
import type { OutlierSettings, GpsSmoothingSettings, GpsPaceSmoothingSettings, SmoothingSettings, CumulativeSettings, PivotZonesSettings } from "~/utils/chart-settings";
import { DEFAULT_CHART_TRANSFORM_SETTINGS } from "~/utils/chart-settings";
import { DEFAULT_GPS_DISTANCE_OPTIONS, type GpsDistanceOptions } from "~/utils/gps-distance";
import type { DeltaSettings } from "~/stores/activitySettings";
import type { MetricType, XAxisType } from "~/utils/chart-config";
import type { ChartViewMode } from "~/utils/chart-settings";

const STORAGE_KEY_SETTINGS = "activity-viewer:settings";

interface StoredSettings {
  activitySettings: {
    outlierSettings: OutlierSettings;
    gpsDistanceOptions: GpsDistanceOptions;
    gpsSmoothing: GpsSmoothingSettings;
    gpsPaceSmoothing: GpsPaceSmoothingSettings;
    deltaSettings: DeltaSettings;
  };
  chartOptions: {
    selectedMetrics: MetricType[];
    xAxisType: XAxisType;
    viewMode: ChartViewMode;
    metricSelectionMode: "single" | "multi";
  };
  chartSeries: {
    transformationSettings: {
      cumulative: CumulativeSettings;
      pivotZones: PivotZonesSettings;
    };
  };
  ui: {
    overviewDisplayMode: "light" | "full";
    overviewBaselineEnabled: boolean;
    overviewBaselineActivityId: string | null;
  };
}

export function useSettingsPersistence() {
  const settingsStore = useActivitySettingsStore();
  const chartOptionsStore = useChartOptionsStore();
  const chartSeriesStore = useChartSeriesStore();
  const uiStore = useUIStore();

  const {
    outlierSettings,
    gpsDistanceOptions,
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
      const stored: StoredSettings = {
        activitySettings: {
          outlierSettings: { ...outlierSettings.value },
          gpsDistanceOptions: { ...gpsDistanceOptions.value },
          gpsSmoothing: { ...gpsSmoothing.value },
          gpsPaceSmoothing: { ...gpsPaceSmoothing.value },
          deltaSettings: { ...deltaSettings.value },
        },
        chartOptions: {
          selectedMetrics: [...selectedMetrics.value],
          xAxisType: xAxisType.value,
          viewMode: viewMode.value,
          metricSelectionMode: metricSelectionMode.value,
        },
        chartSeries: {
          transformationSettings: {
            cumulative: { ...transformationSettings.value.cumulative },
            pivotZones: { ...transformationSettings.value.pivotZones },
          },
        },
        ui: {
          overviewDisplayMode: overviewDisplayMode.value,
          overviewBaselineEnabled: overviewBaselineEnabled.value,
          overviewBaselineActivityId: overviewBaselineActivityId.value,
        },
      };
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
      const parsed = JSON.parse(stored) as StoredSettings;

      // Load activity settings
      if (parsed.activitySettings) {
        if (parsed.activitySettings.outlierSettings) {
          settingsStore.setOutlierSettings(parsed.activitySettings.outlierSettings);
        }
        if (parsed.activitySettings.gpsDistanceOptions) {
          settingsStore.setGpsDistanceOptions(parsed.activitySettings.gpsDistanceOptions);
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

  onMounted(() => {
    loadSettings();

    // Watch for changes and save to localStorage
    watch(
      [
        outlierSettings,
        gpsDistanceOptions,
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
  };
}
