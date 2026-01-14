/**
 * Activity processing pipeline
 * Processes raw activity records through cleaning, smoothing, scaling, and derived metrics
 * 
 * Processing order (critical):
 * 1. Outlier handling (clean bad metric values)
 * 2. GPS distance filtering (filter GPS jumps - happens during distance calc)
 * 3. Remove invalid records
 * 4. GPS smoothing (smooth GPS coordinates)
 * 5. Calculate pace (from smoothed GPS coordinates, before metric smoothing)
 * 5.5. Apply outlier handling to pace (to catch GPS spikes that result in pace spikes)
 * 6. Apply smoothing to metric values (affects totals, distance calculations, etc.) - includes pace
 * 7. Apply scaling (Y-axis scaling)
 * 8. Calculate other derived metrics (grade, verticalSpeed)
 * 9. Apply offset (time alignment) - LAST
 */

import type { ActivityRecord } from "~/types/activity";
import type { OutlierSettings, GpsSmoothingSettings, GpsPaceSmoothingSettings, SmoothingSettings } from "~/utils/chart-settings";
import { calculateDerivedMetrics, calculatePace } from "~/utils/calculate-derived-metrics";
import { smoothGpsPoints, smoothMovingAverage, smoothEma } from "~/utils/series-transforms";

type NullableNumber = number | null;

/**
 * Apply outlier handling to metric values in records
 */
function applyOutlierHandlingToRecords(
  records: ActivityRecord[],
  settings: OutlierSettings,
  metricFields: Array<keyof ActivityRecord>,
): ActivityRecord[] {
  if (settings.mode === "off" || records.length === 0) return records;

  const maxPercent = Math.max(0, settings.maxPercentChange);
  const result: ActivityRecord[] = records.map((r) => ({ ...r }));

  for (const metricField of metricFields) {
    const values: NullableNumber[] = result.map((r) => {
      const val = r[metricField];
      return typeof val === "number" && Number.isFinite(val) ? val : null;
    });

    let prev: number | null = null;
    for (let i = 0; i < values.length; i++) {
      const current = values[i];
      if (current === null || current === undefined) {
        prev = null;
        continue;
      }

      if (prev === null) {
        prev = current;
        continue;
      }

      const delta = current - prev;
      const denom = Math.max(Math.abs(prev), Math.abs(current), 1);
      const pct = (Math.abs(delta) / denom) * 100;

      if (pct <= maxPercent) {
        prev = current;
        continue;
      }

      if (settings.mode === "drop") {
        values[i] = null;
        prev = null;
        continue;
      }

      // clamp
      const allowedDelta = (maxPercent / 100) * denom;
      const clamped: number = prev + Math.sign(delta) * allowedDelta;
      values[i] = clamped;
      prev = clamped;
    }

    // Apply values back to records
    for (let i = 0; i < result.length; i++) {
      const val = values[i];
      if (val === null) {
        delete result[i]![metricField];
      } else {
        (result[i] as any)[metricField] = val;
      }
    }
  }

  return result;
}

/**
 * Remove invalid records (missing required fields, invalid GPS, etc.)
 */
function removeInvalidRecords(records: ActivityRecord[]): ActivityRecord[] {
  return records.filter((record) => {
    // Must have time and distance
    if (typeof record.t !== "number" || !Number.isFinite(record.t)) return false;
    if (typeof record.d !== "number" || !Number.isFinite(record.d)) return false;

    // If GPS coordinates exist, they must be valid
    if (record.lat !== undefined && (typeof record.lat !== "number" || !Number.isFinite(record.lat) || record.lat < -90 || record.lat > 90)) {
      return false;
    }
    if (record.lon !== undefined && (typeof record.lon !== "number" || !Number.isFinite(record.lon) || record.lon < -180 || record.lon > 180)) {
      return false;
    }

    return true;
  });
}

/**
 * Apply GPS smoothing to records
 */
function applyGpsSmoothingToRecords(
  records: ActivityRecord[],
  settings: GpsSmoothingSettings,
): ActivityRecord[] {
  if (!settings.enabled || records.length === 0) return records;

  const gpsPoints = records
    .map((r, i) => ({ lat: r.lat, lon: r.lon, index: i }))
    .filter((p): p is { lat: number; lon: number; index: number } => 
      p.lat !== undefined && p.lon !== undefined && Number.isFinite(p.lat) && Number.isFinite(p.lon)
    );

  if (gpsPoints.length === 0) return records;

  const smoothedPoints = smoothGpsPoints(
    gpsPoints.map((p) => ({ lat: p.lat, lon: p.lon })),
    settings.windowPoints,
  );

  const result = records.map((r) => ({ ...r }));
  const pointMap = new Map<number, { lat: number; lon: number }>();
  
  for (let i = 0; i < gpsPoints.length; i++) {
    pointMap.set(gpsPoints[i]!.index, smoothedPoints[i]!);
  }

  for (const [index, point] of pointMap) {
    result[index]!.lat = point.lat;
    result[index]!.lon = point.lon;
  }

  return result;
}

/**
 * Apply smoothing to metric values in records
 */
function applySmoothingToRecords(
  records: ActivityRecord[],
  settings: SmoothingSettings,
  metricFields: Array<keyof ActivityRecord>,
): ActivityRecord[] {
  if (settings.mode === "off" || records.length === 0) return records;

  const result: ActivityRecord[] = records.map((r) => ({ ...r }));

  for (const metricField of metricFields) {
    const values: NullableNumber[] = result.map((r) => {
      const val = r[metricField];
      return typeof val === "number" && Number.isFinite(val) ? val : null;
    });

    let smoothed: NullableNumber[];
    if (settings.mode === "movingAverage") {
      smoothed = smoothMovingAverage(values, settings.windowPoints);
    } else if (settings.mode === "ema") {
      smoothed = smoothEma(values, settings.windowPoints);
    } else {
      smoothed = values;
    }

    // Apply smoothed values back to records
    for (let i = 0; i < result.length; i++) {
      const val = smoothed[i];
      if (val === null) {
        delete result[i]![metricField];
      } else {
        (result[i] as any)[metricField] = val;
      }
    }
  }

  return result;
}

/**
 * Apply scaling to metric values
 */
function applyScalingToRecords(
  records: ActivityRecord[],
  scale: number,
  metricFields: Array<keyof ActivityRecord>,
): ActivityRecord[] {
  if (scale === 1 || !Number.isFinite(scale) || records.length === 0) return records;

  return records.map((record) => {
    const newRecord = { ...record };
    for (const metricField of metricFields) {
      const val = record[metricField];
      if (typeof val === "number" && Number.isFinite(val)) {
        (newRecord as any)[metricField] = val * scale;
      }
    }
    return newRecord;
  });
}

/**
 * Apply time offset to records
 */
function applyOffsetToRecords(records: ActivityRecord[], offset: number): ActivityRecord[] {
  if (offset === 0 || !Number.isFinite(offset) || records.length === 0) return records;

  return records.map((record) => ({
    ...record,
    t: Math.max(0, record.t + offset),
  }));
}

/**
 * Process activity records through the full pipeline
 * 
 * Note: GPS distance filtering happens during parsing (in activity-parser-common.ts)
 * and is controlled by gpsDistanceOptions, so it's not explicitly called here.
 */
export function processActivityRecords(
  records: ActivityRecord[],
  settings: {
    outliers: OutlierSettings;
    gpsSmoothing: GpsSmoothingSettings;
    gpsPaceSmoothing: GpsPaceSmoothingSettings;
    smoothing: SmoothingSettings;
    scaling: number;
    offset: number;
  },
): ActivityRecord[] {
  if (records.length === 0) return records;

  // Metric fields that should be processed (excluding pace, which is calculated separately)
  const metricFields: Array<keyof ActivityRecord> = ["hr", "pwr", "cad", "alt", "speed", "temp"];

  // 1. Outlier handling (clean bad metric values)
  let processed = applyOutlierHandlingToRecords(records, settings.outliers, metricFields);

  // 2. GPS distance filtering - happens during parsing, not here
  // (controlled by gpsDistanceOptions in parsing phase)

  // 3. Remove invalid records
  processed = removeInvalidRecords(processed);

  // 4. GPS smoothing (smooth GPS coordinates)
  processed = applyGpsSmoothingToRecords(processed, settings.gpsSmoothing);

  // 5. Calculate pace (from smoothed GPS coordinates, before metric smoothing)
  // Note: GPS pace smoothing only applies when pace is calculated from GPS coordinates,
  // not when the activity contains embedded speed (TCX/FIT files)
  processed = calculatePace(processed, settings.gpsPaceSmoothing);

  // 5.5. Apply outlier handling to pace (to catch GPS spikes that result in pace spikes)
  processed = applyOutlierHandlingToRecords(processed, settings.outliers, ["pace"]);

  // 6. Apply smoothing to metric values (affects totals, distance calculations, etc.)
  // Include pace in smoothing so it gets smoothed along with other metrics
  const metricFieldsWithPace: Array<keyof ActivityRecord> = [...metricFields, "pace"];
  processed = applySmoothingToRecords(processed, settings.smoothing, metricFieldsWithPace);

  // 7. Apply scaling (Y-axis scaling)
  processed = applyScalingToRecords(processed, settings.scaling, metricFieldsWithPace);

  // 8. Calculate other derived metrics (grade, verticalSpeed)
  processed = calculateDerivedMetrics(processed);

  // 9. Apply offset (time alignment) - LAST
  processed = applyOffsetToRecords(processed, settings.offset);

  return processed;
}
