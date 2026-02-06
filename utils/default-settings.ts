/**
 * Default Settings
 * Centralized, type-safe default values for all application settings
 */

import { DEFAULT_CHART_TRANSFORM_SETTINGS, DEFAULT_GPS_PACE_SMOOTHING_SETTINGS } from "./chart-settings";
import { DEFAULT_GPS_DISTANCE_OPTIONS } from "./gps-distance";
import type { MetricType, XAxisType } from "./chart-config";
import type { ChartViewMode, CumulativeSettings, PivotZonesSettings, OutlierSettings, GpsSmoothingSettings, GpsPaceSmoothingSettings, SmoothingSettings } from "./chart-settings";
import type { GpsDistanceOptions } from "./gps-distance";
import type { DeltaSettings } from "~/stores/activitySettings";

/**
 * Strongly-typed interface for all persistable settings
 * This ensures we can't miss any settings when saving/loading/resetting
 */
export interface AppSettings {
  activitySettings: {
    outlierSettings: OutlierSettings;
    gpsDistanceOptions: GpsDistanceOptions;
    smoothing: SmoothingSettings;
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

/**
 * Default values for all settings
 * TypeScript will enforce that this matches the AppSettings interface exactly
 */
export const DEFAULT_SETTINGS: AppSettings = {
  activitySettings: {
    outlierSettings: DEFAULT_CHART_TRANSFORM_SETTINGS.outliers,
    gpsDistanceOptions: DEFAULT_GPS_DISTANCE_OPTIONS,
    smoothing: DEFAULT_CHART_TRANSFORM_SETTINGS.smoothing,
    gpsSmoothing: DEFAULT_CHART_TRANSFORM_SETTINGS.gpsSmoothing,
    gpsPaceSmoothing: DEFAULT_GPS_PACE_SMOOTHING_SETTINGS,
    deltaSettings: {
      enabled: false,
      mode: "overlay",
      baseActivityId: null,
      compareActivityId: null,
    },
  },
  chartOptions: {
    selectedMetrics: ["alt"],
    xAxisType: "distance",
    viewMode: "timeseries",
    metricSelectionMode: "single",
  },
  chartSeries: {
    transformationSettings: {
      cumulative: DEFAULT_CHART_TRANSFORM_SETTINGS.cumulative,
      pivotZones: DEFAULT_CHART_TRANSFORM_SETTINGS.pivotZones,
    },
  },
  ui: {
    overviewDisplayMode: "light",
    overviewBaselineEnabled: true,
    overviewBaselineActivityId: null,
  },
};

/**
 * Type-safe helper to ensure all settings properties are copied
 * This will produce a TypeScript error if any property is missing
 */
export function cloneSettings(settings: AppSettings): AppSettings {
  return {
    activitySettings: {
      outlierSettings: { ...settings.activitySettings.outlierSettings },
      gpsDistanceOptions: { ...settings.activitySettings.gpsDistanceOptions },
      smoothing: { ...settings.activitySettings.smoothing },
      gpsSmoothing: { ...settings.activitySettings.gpsSmoothing },
      gpsPaceSmoothing: { ...settings.activitySettings.gpsPaceSmoothing },
      deltaSettings: { ...settings.activitySettings.deltaSettings },
    },
    chartOptions: {
      selectedMetrics: [...settings.chartOptions.selectedMetrics],
      xAxisType: settings.chartOptions.xAxisType,
      viewMode: settings.chartOptions.viewMode,
      metricSelectionMode: settings.chartOptions.metricSelectionMode,
    },
    chartSeries: {
      transformationSettings: {
        cumulative: { ...settings.chartSeries.transformationSettings.cumulative },
        pivotZones: { ...settings.chartSeries.transformationSettings.pivotZones },
      },
    },
    ui: {
      overviewDisplayMode: settings.ui.overviewDisplayMode,
      overviewBaselineEnabled: settings.ui.overviewBaselineEnabled,
      overviewBaselineActivityId: settings.ui.overviewBaselineActivityId,
    },
  };
}
