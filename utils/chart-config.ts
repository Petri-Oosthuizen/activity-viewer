/**
 * Chart configuration utilities for ECharts
 * Extracted from store to improve maintainability and testability
 */

import type { Activity, ActivityRecord } from "~/types/activity";

// Metric type definition
export type MetricType = "hr" | "alt" | "pwr" | "cad" | "pace" | "speed" | "temp" | "grade" | "vSpeed";

// X-axis type definition
export type XAxisType = "time" | "distance" | "localTime";

// Delta mode options
export type DeltaMode = "overlay" | "delta-only";

// Human-readable labels for metrics
export const METRIC_LABELS: Readonly<Record<MetricType, string>> = {
  hr: "Heart Rate (bpm)",
  alt: "Altitude (m)",
  pwr: "Power (W)",
  cad: "Cadence (rpm)",
  pace: "Pace (min/km)",
  speed: "Speed (m/s)",
  temp: "Temperature (°C)",
  grade: "Grade (%)",
  vSpeed: "Vertical Speed (m/h)",
};

const METRIC_ORDER: readonly MetricType[] = ["alt", "hr", "pwr", "cad", "pace", "speed", "temp", "grade", "vSpeed"] as const;

// Default color palette for activities
export const ACTIVITY_COLORS = [
  "#5470c6", // 0: Blue
  "#91cc75", // 1: Green
  "#fac858", // 2: Yellow
  "#ee6666", // 3: Red
  "#73c0de", // 4: Light Blue
  "#3ba272", // 5: Dark Green
  "#fc8452", // 6: Orange
  "#9a60b4", // 7: Purple
  "#ea7ccc", // 8: Pink
  "#ffd93d", // 9: Bright Yellow
] as const;

// Delta series color
export const DELTA_COLOR = "#ff6b6b";

/**
 * Check if an activity has data for a specific metric
 */
export function activityHasMetric(activity: Activity, metric: MetricType): boolean {
  if (metric === "pace") {
    if (activity.records.length <= 1) return false;
    return activity.records.some((r, i) => {
      if (i === 0) return false;
      const prev = activity.records[i - 1];
      if (!prev) return false;
      const dt = r.t - prev.t;
      const dd = r.d - prev.d;
      return dt > 0 && dd > 0;
    });
  }
  if (metric === "grade" || metric === "vSpeed") {
    return activity.records.some((r) => r[metric] !== null && r[metric] !== undefined);
  }
  return activity.records.some(
    (record) => record[metric] !== null && record[metric] !== undefined
  );
}

/**
 * Count how many records in an activity have data for a specific metric
 */
export function countRecordsWithMetric(activity: Activity, metric: MetricType): number {
  if (metric === "pace") {
    let count = 0;
    for (let i = 1; i < activity.records.length; i++) {
      const r = activity.records[i];
      const prev = activity.records[i - 1];
      if (!r || !prev) continue;
      const dt = r.t - prev.t;
      const dd = r.d - prev.d;
      if (dt > 0 && dd > 0) count++;
    }
    return count;
  }
  return activity.records.filter(
    (record) => record[metric] !== null && record[metric] !== undefined
  ).length;
}

/**
 * Get available metrics across all activities
 */
export function getAvailableMetrics(activities: Activity[]): MetricType[] {
  if (activities.length === 0) return [];

  const metrics = new Set<MetricType>();
  for (const activity of activities) {
    for (const record of activity.records) {
      if (record.hr !== undefined && record.hr !== null) metrics.add("hr");
      if (record.alt !== undefined && record.alt !== null) metrics.add("alt");
      if (record.pwr !== undefined && record.pwr !== null) metrics.add("pwr");
      if (record.cad !== undefined && record.cad !== null) metrics.add("cad");
      if (record.speed !== undefined && record.speed !== null) metrics.add("speed");
      if (record.temp !== undefined && record.temp !== null) metrics.add("temp");
      if (record.grade !== undefined && record.grade !== null) metrics.add("grade");
      if (record.vSpeed !== undefined && record.vSpeed !== null) metrics.add("vSpeed");
    }
    if (activity.records.length > 1) {
      const hasValidPace = activity.records.some((r, i) => {
        if (i === 0) return false;
        const prev = activity.records[i - 1];
        if (!prev) return false;
        const dt = r.t - prev.t;
        const dd = r.d - prev.d;
        return dt > 0 && dd > 0;
      });
      if (hasValidPace) metrics.add("pace");
    }
  }
  // Stable ordering, with altitude first when present.
  return METRIC_ORDER.filter((m) => metrics.has(m));
}

/**
 * Get metric availability map (which activities have which metrics)
 */
export function getMetricAvailability(
  activities: Activity[]
): Record<MetricType, string[]> {
  const availability: Record<MetricType, string[]> = {
    hr: [],
    alt: [],
    pwr: [],
    cad: [],
    pace: [],
    speed: [],
    temp: [],
    grade: [],
    vSpeed: [],
  };

  activities.forEach((activity) => {
    (["hr", "alt", "pwr", "cad", "speed", "temp", "grade", "vSpeed"] as MetricType[]).forEach((metric) => {
      if (activityHasMetric(activity, metric)) {
        availability[metric].push(activity.id);
      }
    });
    if (activityHasMetric(activity, "pace")) {
      availability.pace.push(activity.id);
    }
  });

  return availability;
}

/**
 * Calculate X value for a record based on axis type
 */
export function calculateXValue(
  record: ActivityRecord,
  activity: Activity,
  xAxisType: XAxisType
): number {
  if (xAxisType === "localTime") {
    if (activity.startTime) {
      return activity.startTime.getTime() + (record.t + activity.offset) * 1000;
    }
    return record.t + activity.offset;
  } else if (xAxisType === "time") {
    return record.t + activity.offset;
  }
  return record.d;
}

/**
 * Format X-axis value for display
 */
export function formatXAxisValue(value: number, xAxisType: XAxisType): string {
  if (xAxisType === "localTime") {
    const date = new Date(value);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  } else if (xAxisType === "time") {
    return `${value.toFixed(1)}s`;
  } else {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}km`;
    }
    return `${value.toFixed(0)}m`;
  }
}

/**
 * Generate unique activity ID
 */
export function generateActivityId(): string {
  return `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get color for an activity based on its index
 * Index 0 = blue, index 1 = green, etc.
 * Colors repeat after 10+ activities
 */
export function getActivityColorByIndex(index: number): string {
  const color = ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];
  if (!color) {
    return ACTIVITY_COLORS[0]!;
  }
  return color;
}

// Chart data point type
export type ChartDataPoint = [number, number | null];

/**
 * Transform activity records to chart data points
 * Note: This is a simple transform that doesn't handle computed metrics like pace.
 * For production use, use buildTransformedChartData from series-transforms.ts instead.
 */
export function transformToChartData(
  activity: Activity,
  metric: MetricType,
  xAxisType: XAxisType
): ChartDataPoint[] {
  // Preserve record order and indices to keep chart ↔ map synchronization exact.
  // Missing values are represented as `null` so ECharts can naturally gap the line.
  return activity.records.map((record, i): ChartDataPoint => {
    const x = calculateXValue(record, activity, xAxisType);
    let y: number | null = null;
    if (metric === "pace") {
      if (i > 0) {
        const prev = activity.records[i - 1];
        if (prev) {
          const dt = record.t - prev.t;
          const dd = record.d - prev.d;
          if (dt > 0 && dd > 0) {
            const paceMinPerKm = (dt / 60) / (dd / 1000);
            y = Number.isFinite(paceMinPerKm) && paceMinPerKm > 0 ? paceMinPerKm : null;
          }
        }
      }
    } else {
      y = record[metric] ?? null;
    }
    return [x, y];
  });
}

/**
 * Find nearest value in a data map using nearest-neighbor interpolation
 */
export function findNearestValue(
  dataMap: Map<number, number>,
  targetX: number,
  maxDiff: number = 1000
): number | null {
  if (dataMap.has(targetX)) {
    return dataMap.get(targetX)!;
  }

  let nearestX = targetX;
  let minDiff = Infinity;

  dataMap.forEach((_, x) => {
    const diff = Math.abs(x - targetX);
    if (diff < minDiff) {
      minDiff = diff;
      nearestX = x;
    }
  });

  if (minDiff < maxDiff) {
    return dataMap.get(nearestX) ?? null;
  }
  return null;
}


