/**
 * Default Settings
 * Centralized, type-safe default values for all application settings
 */

import {
  DEFAULT_CHART_TRANSFORM_SETTINGS,
  DEFAULT_GPS_PACE_SMOOTHING_SETTINGS,
  DEFAULT_GPS_SMOOTHING_SETTINGS,
  DEFAULT_OUTLIER_SETTINGS,
  DEFAULT_SMOOTHING_SETTINGS,
} from "./chart-settings";
import { DEFAULT_GPS_DISTANCE_OPTIONS } from "./gps-distance";
import type { PersistedActivitySettings } from "~/stores/activitySettings";
import type { PersistedChartOptions } from "~/stores/chartOptions";
import type { PersistedChartSeriesSettings } from "~/stores/chartSeries";
import type { PersistedUISettings } from "~/stores/ui";

/**
 * Persisted settings, stored as JSON in localStorage
 */
export interface AppSettings {
  activitySettings: PersistedActivitySettings;
  chartOptions: PersistedChartOptions;
  chartSeries: PersistedChartSeriesSettings;
  ui: PersistedUISettings;
}

/** Settings saved by older releases may lack any section or field. */
export type StoredAppSettings = { [K in keyof AppSettings]?: Partial<AppSettings[K]> };

export const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  activitySettings: {
    outlierSettings: DEFAULT_OUTLIER_SETTINGS,
    gpsDistanceOptions: DEFAULT_GPS_DISTANCE_OPTIONS,
    smoothing: DEFAULT_SMOOTHING_SETTINGS,
    gpsSmoothing: DEFAULT_GPS_SMOOTHING_SETTINGS,
    gpsPaceSmoothing: DEFAULT_GPS_PACE_SMOOTHING_SETTINGS,
    deltaSettings: {
      enabled: false,
      mode: "overlay",
      baseActivityId: null,
      compareActivityId: null,
    },
    alignmentMode: "startTime",
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
