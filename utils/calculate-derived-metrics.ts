import type { ActivityRecord } from "~/types/activity";
import { calculateGpsSpeed, DEFAULT_GPS_DISTANCE_OPTIONS } from "~/utils/gps-distance";
import { smoothMovingAverage } from "~/utils/series-transforms";
import type { GpsPaceSmoothingSettings } from "~/utils/chart-settings";
import { DEFAULT_GPS_PACE_SMOOTHING_SETTINGS } from "~/utils/chart-settings";

/**
 * Calculate pace (min/km) for activity records
 * Pace is calculated from speed or GPS coordinates
 * This should be called after GPS smoothing but before metric smoothing
 *
 * Note: Always recalculates pace to ensure consistency, even if records already have pace values
 * (e.g., when loading from localStorage where pace might have been calculated with different settings)
 *
 * GPS pace smoothing only applies when pace is calculated from GPS coordinates (GPX files).
 * Activities with embedded speed (TCX/FIT files) are not smoothed as they already have
 * device-smoothed speed values.
 */
export function calculatePace(
  records: ActivityRecord[],
  gpsPaceSmoothing: GpsPaceSmoothingSettings = DEFAULT_GPS_PACE_SMOOTHING_SETTINGS,
): ActivityRecord[] {
  if (records.length === 0) return records;

  const result: ActivityRecord[] = records.map((r) => {
    const newRecord = { ...r };
    // Clear any existing pace value to ensure fresh calculation
    delete newRecord.pace;
    return newRecord;
  });

  const gpsCalculatedIndices: number[] = [];

  // First pass: calculate and store speed from GPS if not already present
  for (let i = 1; i < result.length; i++) {
    const record = result[i]!;
    const prev = result[i - 1]!;

    // If speed doesn't exist, calculate it from GPS coordinates
    if (
      (record.speed === undefined || record.speed === null || record.speed <= 0 || !Number.isFinite(record.speed)) &&
      record.lat !== undefined &&
      record.lon !== undefined &&
      prev.lat !== undefined &&
      prev.lon !== undefined
    ) {
      const speed = calculateGpsSpeed(
        { lat: prev.lat, lon: prev.lon, t: prev.t, alt: prev.alt },
        { lat: record.lat, lon: record.lon, t: record.t, alt: record.alt },
        DEFAULT_GPS_DISTANCE_OPTIONS,
      );
      if (speed !== null && speed > 0 && Number.isFinite(speed)) {
        record.speed = speed;
        gpsCalculatedIndices.push(i);
      }
    }
  }

  // Second pass: calculate pace from speed (now all records should have speed if GPS was available)
  for (let i = 1; i < result.length; i++) {
    const record = result[i]!;
    const prev = result[i - 1]!;

    // Use speed if available (embedded from TCX/FIT or calculated from GPS)
    if (
      record.speed !== undefined &&
      record.speed !== null &&
      record.speed > 0 &&
      Number.isFinite(record.speed)
    ) {
      const paceMinPerKm = 1000 / (record.speed * 60);
      if (Number.isFinite(paceMinPerKm) && paceMinPerKm > 0) {
        record.pace = paceMinPerKm;
      }
    } else {
      // Fall back to cumulative distance/time calculation if no speed available
      const dt = record.t - prev.t;
      const dd = record.d - prev.d;
      if (dt > 0 && dd > 0) {
        const paceMinPerKm = dt / 60 / (dd / 1000);
        if (Number.isFinite(paceMinPerKm) && paceMinPerKm > 0) {
          record.pace = paceMinPerKm;
        }
      }
    }
  }

  // Apply smoothing to GPS-calculated speed values first, then recalculate pace
  // This reduces noise at the source and makes GPX pace comparable to TCX/FIT files
  // Note: Only applies when pace is calculated from GPS coordinates (GPX files).
  // Activities with embedded speed (TCX/FIT files) are not smoothed as they already have
  // device-smoothed speed values.
  if (gpsCalculatedIndices.length > 0 && gpsPaceSmoothing.enabled) {
    const speedValues: (number | null)[] = result.map((r) => r.speed ?? null);
    const smoothedSpeed = smoothMovingAverage(speedValues, gpsPaceSmoothing.windowPoints);

    // Update GPS-calculated speeds with smoothed versions and recalculate pace
    for (const idx of gpsCalculatedIndices) {
      const smoothed = smoothedSpeed[idx];
      if (smoothed !== null && smoothed !== undefined && Number.isFinite(smoothed) && smoothed > 0) {
        result[idx]!.speed = smoothed;
        // Recalculate pace from smoothed speed
        const paceMinPerKm = 1000 / (smoothed * 60);
        if (Number.isFinite(paceMinPerKm) && paceMinPerKm > 0) {
          result[idx]!.pace = paceMinPerKm;
        }
      }
    }

    // Apply additional smoothing to GPS-calculated pace values to better match TCX/FIT
    const paceValues: (number | null)[] = result.map((r) => r.pace ?? null);
    const smoothedPace = smoothMovingAverage(paceValues, gpsPaceSmoothing.windowPoints);
    for (const idx of gpsCalculatedIndices) {
      const smoothed = smoothedPace[idx];
      if (smoothed !== null && smoothed !== undefined && Number.isFinite(smoothed) && smoothed > 0) {
        result[idx]!.pace = smoothed;
      }
    }
  }

  return result;
}

/**
 * Calculate grade (gradient) and vertical speed (VAM) for activity records
 * Grade is calculated as (elevation change / horizontal distance) * 100
 * Vertical speed (VAM) is calculated as elevation change per hour
 */
export function calculateDerivedMetrics(records: ActivityRecord[]): ActivityRecord[] {
  if (records.length === 0) return records;

  const result: ActivityRecord[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    const newRecord = { ...record };

    if (i > 0) {
      const prev = records[i - 1]!;

      // Calculate grade if we have altitude and distance
      if (
        record.alt !== undefined &&
        record.alt !== null &&
        prev.alt !== undefined &&
        prev.alt !== null &&
        record.d !== undefined &&
        prev.d !== undefined
      ) {
        const elevationChange = record.alt - prev.alt;
        const horizontalDistance = record.d - prev.d;

        if (
          horizontalDistance > 0 &&
          Number.isFinite(elevationChange) &&
          Number.isFinite(horizontalDistance)
        ) {
          const gradePercent = (elevationChange / horizontalDistance) * 100;
          if (Number.isFinite(gradePercent)) {
            newRecord.grade = gradePercent;
          }
        }
      }

      // Calculate vertical speed (VAM) if we have altitude and time
      if (
        record.alt !== undefined &&
        record.alt !== null &&
        prev.alt !== undefined &&
        prev.alt !== null &&
        record.t !== undefined &&
        prev.t !== undefined
      ) {
        const elevationChange = record.alt - prev.alt;
        const timeDeltaHours = (record.t - prev.t) / 3600;

        if (
          timeDeltaHours > 0 &&
          Number.isFinite(elevationChange) &&
          Number.isFinite(timeDeltaHours)
        ) {
          const vam = elevationChange / timeDeltaHours;
          if (Number.isFinite(vam)) {
            newRecord.verticalSpeed = vam;
          }
        }
      }
    }

    result.push(newRecord);
  }

  return result;
}
