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
 */

import type { ActivityRecord } from "~/types/activity";
import type { OutlierSettings, GpsSmoothingSettings, GpsPaceSmoothingSettings, SmoothingSettings } from "~/utils/chart-settings";
import { calculateDerivedMetrics, calculatePace } from "~/utils/calculate-derived-metrics";
import { smoothGpsPoints, smoothMovingAverage, smoothEma } from "~/utils/series-transforms";

type NullableNumber = number | null;

/**
 * Apply outlier handling to metric values in records
 * Optimized: processes records in-place without intermediate arrays
 */
function applyOutlierHandlingToRecords(
  records: ActivityRecord[],
  settings: OutlierSettings,
  metricFields: Array<keyof ActivityRecord>,
): void {
  if (settings.mode === "off" || records.length === 0) return;

  const maxPercent = Math.max(0, settings.maxPercentChange);

  for (const metricField of metricFields) {
    let prev: number | null = null;

    for (let i = 0; i < records.length; i++) {
      const record = records[i]!;
      const val = record[metricField];
      const current = typeof val === "number" && Number.isFinite(val) ? val : null;

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
        delete record[metricField];
        prev = null;
        continue;
      }

      // clamp
      const allowedDelta = (maxPercent / 100) * denom;
      const clamped: number = prev + Math.sign(delta) * allowedDelta;
      (record as any)[metricField] = clamped;
      prev = clamped;
    }
  }
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
 * Optimized: smooths in-place without intermediate data structures
 */
function applyGpsSmoothingToRecords(
  records: ActivityRecord[],
  settings: GpsSmoothingSettings,
): void {
  if (!settings.enabled || records.length === 0) return;

  // Extract GPS points with their indices
  const gpsIndices: number[] = [];
  const gpsPoints: Array<{ lat: number; lon: number }> = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    if (
      r.lat !== undefined && r.lon !== undefined &&
      Number.isFinite(r.lat) && Number.isFinite(r.lon)
    ) {
      gpsIndices.push(i);
      gpsPoints.push({ lat: r.lat, lon: r.lon });
    }
  }

  if (gpsPoints.length === 0) return;

  const smoothedPoints = smoothGpsPoints(gpsPoints, settings.windowPoints);

  // Apply smoothed coordinates back to records
  for (let i = 0; i < gpsIndices.length; i++) {
    const idx = gpsIndices[i]!;
    const point = smoothedPoints[i]!;
    records[idx]!.lat = point.lat;
    records[idx]!.lon = point.lon;
  }
}

/**
 * Apply smoothing to metric values in records
 * Optimized: still uses intermediate array for smoothing algorithm but avoids unnecessary copies
 */
function applySmoothingToRecords(
  records: ActivityRecord[],
  settings: SmoothingSettings,
  metricFields: Array<keyof ActivityRecord>,
): void {
  if (settings.mode === "off" || records.length === 0) return;

  for (const metricField of metricFields) {
    const values: NullableNumber[] = new Array(records.length);

    // Extract values
    for (let i = 0; i < records.length; i++) {
      const val = records[i]![metricField];
      values[i] = typeof val === "number" && Number.isFinite(val) ? val : null;
    }

    let smoothed: NullableNumber[];
    if (settings.mode === "movingAverage") {
      smoothed = smoothMovingAverage(values, settings.windowPoints);
    } else if (settings.mode === "ema") {
      smoothed = smoothEma(values, settings.windowPoints);
    } else {
      smoothed = values;
    }

    // Apply smoothed values back to records
    for (let i = 0; i < records.length; i++) {
      const val = smoothed[i];
      if (val === null) {
        delete records[i]![metricField];
      } else {
        (records[i] as any)[metricField] = val;
      }
    }
  }
}

/**
 * Apply scaling to metric values
 * Optimized: processes in-place
 */
function applyScalingToRecords(
  records: ActivityRecord[],
  scale: number,
  metricFields: Array<keyof ActivityRecord>,
): void {
  if (scale === 1 || !Number.isFinite(scale) || records.length === 0) return;

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    for (const metricField of metricFields) {
      const val = record[metricField];
      if (typeof val === "number" && Number.isFinite(val)) {
        (record as any)[metricField] = val * scale;
      }
    }
  }
}

/**
 * Process activity records through the full pipeline
 *
 * Optimized: Clone records once at entry, then mutate in-place through all steps
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
  },
): ActivityRecord[] {
  if (records.length === 0) return records;

  // Clone records once at entry point to avoid mutating input
  const processed = records.map((r) => ({ ...r }));

  // Metric fields that should be processed (excluding pace, which is calculated separately)
  const metricFields: Array<keyof ActivityRecord> = ["hr", "pwr", "cad", "alt", "speed", "temp"];

  // 1. Outlier handling (clean bad metric values) - mutates in-place
  applyOutlierHandlingToRecords(processed, settings.outliers, metricFields);

  // 2. GPS distance filtering - happens during parsing, not here
  // (controlled by gpsDistanceOptions in parsing phase)

  // 3. Remove invalid records (returns new array, so reassign)
  const validRecords = removeInvalidRecords(processed);

  // 4. GPS smoothing (smooth GPS coordinates) - mutates in-place
  applyGpsSmoothingToRecords(validRecords, settings.gpsSmoothing);

  // 5. Calculate pace (from smoothed GPS coordinates, before metric smoothing)
  // Note: GPS pace smoothing only applies when pace is calculated from GPS coordinates,
  // not when the activity contains embedded speed (TCX/FIT files)
  const withPace = calculatePace(validRecords, settings.gpsPaceSmoothing);

  // 5.5. Apply outlier handling to pace (to catch GPS spikes that result in pace spikes) - mutates in-place
  applyOutlierHandlingToRecords(withPace, settings.outliers, ["pace"]);

  // 6. Apply smoothing to metric values (affects totals, distance calculations, etc.) - mutates in-place
  // Include pace in smoothing so it gets smoothed along with other metrics
  const metricFieldsWithPace: Array<keyof ActivityRecord> = [...metricFields, "pace"];
  applySmoothingToRecords(withPace, settings.smoothing, metricFieldsWithPace);

  // 7. Apply scaling (Y-axis scaling) - mutates in-place
  applyScalingToRecords(withPace, settings.scaling, metricFieldsWithPace);

  // 8. Calculate other derived metrics (grade, verticalSpeed) (returns new array)
  return calculateDerivedMetrics(withPace);
}
