/**
 * Chart transform settings
 *
 * These settings control how raw activity data is transformed into chart/map output.
 * Kept separate from the store to keep defaults and types centralized + testable.
 */

export type ChartViewMode = "timeseries" | "pivotZones";

export type OutlierHandling = "off" | "drop" | "clamp";
export interface OutlierSettings {
  mode: OutlierHandling;
  /**
   * Reject a point if the percent change from the previous valid point exceeds this threshold.
   * Example: 200 means "more than ±200% change".
   */
  maxPercentChange: number;
}

export type SmoothingMode = "off" | "movingAverage" | "ema";
export interface SmoothingSettings {
  mode: SmoothingMode;
  /** Window size in points (odd numbers recommended for moving average). */
  windowPoints: number;
}

export interface GpsSmoothingSettings {
  enabled: boolean;
  /** Window size in points used for smoothing lat/lon. */
  windowPoints: number;
}

export interface PaceSmoothingSettings {
  enabled: boolean;
  /** Window size in seconds used for smoothing pace values. */
  windowSeconds: number;
}

export type CumulativeMode = "off" | "sum" | "positiveDeltaSum";
export interface CumulativeSettings {
  mode: CumulativeMode;
}

export type PivotZoneStrategy = "equalRange" | "quantiles";
export interface PivotZonesSettings {
  zoneCount: number;
  strategy: PivotZoneStrategy;
}

export interface ChartTransformSettings {
  viewMode: ChartViewMode;
  outliers: OutlierSettings;
  smoothing: SmoothingSettings;
  gpsSmoothing: GpsSmoothingSettings;
  paceSmoothing: PaceSmoothingSettings;
  cumulative: CumulativeSettings;
  pivotZones: PivotZonesSettings;
}

export const DEFAULT_CHART_TRANSFORM_SETTINGS: Readonly<ChartTransformSettings> = {
  viewMode: "timeseries",
  outliers: {
    mode: "off",
    maxPercentChange: 200,
  },
  smoothing: {
    mode: "off",
    windowPoints: 5,
  },
  gpsSmoothing: {
    enabled: false,
    windowPoints: 5,
  },
  paceSmoothing: {
    enabled: true,
    windowSeconds: 10,
  },
  cumulative: {
    mode: "off",
  },
  pivotZones: {
    zoneCount: 5,
    strategy: "quantiles",
  },
};

