import type { Activity, ActivityRecord } from "~/types/activity";
import type { MetricType } from "~/utils/chart-config";
import { calculateBestSplits, type BestSplit } from "~/utils/best-splits";
import {
  calculateBestTimePower,
  calculateNormalizedPower,
} from "~/utils/power-metrics";
import { calculateGpsSpeed, DEFAULT_GPS_DISTANCE_OPTIONS, type GpsDistanceOptions } from "~/utils/gps-distance";
import { smoothMovingAverage } from "~/utils/series-transforms";
import { DEFAULT_GPS_PACE_SMOOTHING_SETTINGS } from "~/utils/chart-settings";

export interface MetricStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
}

export interface PowerMetrics {
  normalizedPower: number | null;
  best12MinPower: number | null;
  best20MinPower: number | null;
}

export interface ActivityStats {
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  calories: number | null;
  metrics: Record<MetricType, MetricStats>;
  bestSplits: Record<string, BestSplit>;
  powerMetrics: PowerMetrics;
  additionalMetrics: Record<string, MetricStats>;
}

function safeMetricStats(records: ActivityRecord[], metric: "hr" | "alt" | "pwr" | "cad" | "speed" | "temp" | "grade" | "verticalSpeed"): MetricStats {
  let count = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;

  for (const r of records) {
    const v = r[metric];
    if (v === undefined || v === null) continue;
    count++;
    sum += v;
    min = min === null ? v : Math.min(min, v);
    max = max === null ? v : Math.max(max, v);
  }

  return {
    count,
    min,
    max,
    avg: count > 0 ? sum / count : null,
  };
}

function safeDurationSeconds(records: ActivityRecord[]): number {
  if (records.length === 0) return 0;
  const first = records[0]?.t ?? 0;
  const last = records[records.length - 1]?.t ?? first;
  return Math.max(0, last - first);
}

function safeDistanceMeters(records: ActivityRecord[]): number {
  if (records.length === 0) return 0;
  const first = records[0]?.d ?? 0;
  const last = records[records.length - 1]?.d ?? first;
  return Math.max(0, last - first);
}

function safeElevationGainMeters(records: ActivityRecord[]): number | null {
  let total = 0;
  let prev: number | null = null;
  let sawAlt = false;

  for (const r of records) {
    const alt = r.alt;
    if (alt === undefined || alt === null) continue;
    sawAlt = true;
    if (prev !== null) {
      const delta = alt - prev;
      if (delta > 0) total += delta;
    }
    prev = alt;
  }

  return sawAlt ? total : null;
}

function safeElevationLossMeters(records: ActivityRecord[]): number | null {
  let total = 0;
  let prev: number | null = null;
  let sawAlt = false;

  for (const r of records) {
    const alt = r.alt;
    if (alt === undefined || alt === null) continue;
    sawAlt = true;
    if (prev !== null) {
      const delta = alt - prev;
      if (delta < 0) total += Math.abs(delta);
    }
    prev = alt;
  }

  return sawAlt ? total : null;
}

function safePaceStats(records: ActivityRecord[]): MetricStats {
  let count = 0;
  let min: number | null = null;
  let max: number | null = null;
  let totalDistance = 0;
  let totalTime = 0;

  const gpsOptions: GpsDistanceOptions = DEFAULT_GPS_DISTANCE_OPTIONS;

  // Collect all pace values and track which ones are GPS-calculated
  const paceValues: (number | null)[] = new Array(records.length).fill(null);
  const gpsCalculatedIndices: number[] = [];
  const speedValues: (number | null)[] = new Array(records.length).fill(null);

  // First pass: calculate speed from GPS if not already present (don't modify input records)
  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    const prev = records[i - 1];
    if (!r || !prev) continue;

    // Use existing speed if available
    if (r.speed !== undefined && r.speed !== null && r.speed > 0 && Number.isFinite(r.speed)) {
      speedValues[i] = r.speed;
    } else if (
      r.lat !== undefined &&
      r.lon !== undefined &&
      prev.lat !== undefined &&
      prev.lon !== undefined
    ) {
      // Calculate speed from GPS coordinates
      const speed = calculateGpsSpeed(
        { lat: prev.lat, lon: prev.lon, t: prev.t, alt: prev.alt },
        { lat: r.lat, lon: r.lon, t: r.t, alt: r.alt },
        gpsOptions
      );
      if (speed !== null && speed > 0 && Number.isFinite(speed)) {
        speedValues[i] = speed;
        gpsCalculatedIndices.push(i);
      }
    }
  }

  // Second pass: calculate pace from speed (now all records should have speed if GPS was available)
  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    const prev = records[i - 1];
    if (!r || !prev) continue;

    let paceMinPerKm: number | null = null;
    let segmentDistance = 0;
    let segmentTime = 0;

    // Use speed if available (embedded from TCX/FIT or calculated from GPS)
    const speed = speedValues[i];
    if (speed !== null && speed !== undefined && speed > 0 && Number.isFinite(speed)) {
      // Convert speed (m/s) to pace (min/km)
      // pace = (1000 meters / speed_mps) / 60 seconds = 1000 / (speed_mps * 60)
      paceMinPerKm = 1000 / (speed * 60);
      segmentTime = r.t - prev.t;
      segmentDistance = r.d - prev.d;
    } else {
      // Fall back to cumulative distance/time calculation if no speed available
      segmentTime = r.t - prev.t;
      segmentDistance = r.d - prev.d;
      if (segmentTime > 0 && segmentDistance > 0) {
        paceMinPerKm = (segmentTime / 60) / (segmentDistance / 1000);
      }
    }

    if (paceMinPerKm === null || !Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) continue;

    paceValues[i] = paceMinPerKm;

    count++;
    if (segmentTime > 0 && segmentDistance > 0) {
      totalDistance += segmentDistance;
      totalTime += segmentTime;
    }
  }

  // Apply smoothing to GPS-calculated speed values first, then recalculate pace
  // This reduces noise at the source and makes GPX pace comparable to TCX/FIT files
  // Only applies when GPS pace smoothing is enabled and pace is calculated from GPS
  // Note: This only applies when pace has to be calculated from GPS, not when activity contains embedded speed
  if (gpsCalculatedIndices.length > 0 && DEFAULT_GPS_PACE_SMOOTHING_SETTINGS.enabled) {
    const smoothedSpeed = smoothMovingAverage(speedValues, DEFAULT_GPS_PACE_SMOOTHING_SETTINGS.windowPoints);

    // Update GPS-calculated speeds with smoothed versions and recalculate pace
    for (const idx of gpsCalculatedIndices) {
      const smoothed = smoothedSpeed[idx];
      if (smoothed !== null && smoothed !== undefined && Number.isFinite(smoothed) && smoothed > 0) {
        speedValues[idx] = smoothed;
        // Recalculate pace from smoothed speed
        const r = records[idx];
        const prev = records[idx - 1];
        if (r && prev) {
          const paceMinPerKm = 1000 / (smoothed * 60);
          if (Number.isFinite(paceMinPerKm) && paceMinPerKm > 0) {
            paceValues[idx] = paceMinPerKm;
          }
        }
      }
    }

    // Apply additional smoothing to GPS-calculated pace values to better match TCX/FIT
    const smoothedPace = smoothMovingAverage(paceValues, DEFAULT_GPS_PACE_SMOOTHING_SETTINGS.windowPoints);
    for (const idx of gpsCalculatedIndices) {
      const smoothed = smoothedPace[idx];
      if (smoothed !== null && smoothed !== undefined && Number.isFinite(smoothed) && smoothed > 0) {
        paceValues[idx] = smoothed;
      }
    }
  }

  // Calculate min and max from (potentially smoothed) pace values
  // For GPS-calculated pace, use percentile-based min/max to be more robust to outliers
  const validPaceValues: number[] = [];
  for (let i = 1; i < paceValues.length; i++) {
    const pace = paceValues[i];
    if (pace !== null && pace !== undefined && Number.isFinite(pace) && pace > 0) {
      validPaceValues.push(pace);
    }
  }

  if (validPaceValues.length > 0) {
    if (gpsCalculatedIndices.length > 0 && validPaceValues.length > 10) {
      // For GPS-calculated pace, use 5th and 95th percentiles to filter extreme outliers
      // This makes GPX pace stats more comparable to TCX/FIT files
      const sorted = [...validPaceValues].sort((a, b) => a - b);
      const p5Index = Math.floor(sorted.length * 0.05);
      const p95Index = Math.ceil(sorted.length * 0.95) - 1;
      min = sorted[p5Index] ?? sorted[0] ?? null;
      max = sorted[p95Index] ?? sorted[sorted.length - 1] ?? null;
    } else {
      // For embedded speed (TCX/FIT) or small datasets, use absolute min/max
      min = Math.min(...validPaceValues);
      max = Math.max(...validPaceValues);
    }
  }

  // Calculate average pace from total distance/time (more accurate than averaging individual paces)
  const avgPace = totalTime > 0 && totalDistance > 0 ? (totalTime / 60) / (totalDistance / 1000) : null;

  return {
    count,
    min,
    max,
    avg: avgPace,
  };
}

function safeAdditionalFieldStats(records: ActivityRecord[], fieldName: string): MetricStats {
  let count = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;

  for (const r of records) {
    const v = r.additionalFields?.[fieldName];
    if (v === undefined || v === null || !Number.isFinite(v)) continue;
    count++;
    sum += v;
    min = min === null ? v : Math.min(min, v);
    max = max === null ? v : Math.max(max, v);
  }

  return {
    count,
    min,
    max,
    avg: count > 0 ? sum / count : null,
  };
}

function computeAdditionalMetrics(records: ActivityRecord[]): Record<string, MetricStats> {
  const fieldNames = new Set<string>();
  for (const r of records) {
    if (r.additionalFields) {
      Object.keys(r.additionalFields).forEach((key) => fieldNames.add(key));
    }
  }

  const result: Record<string, MetricStats> = {};
  for (const fieldName of fieldNames) {
    const stats = safeAdditionalFieldStats(records, fieldName);
    if (stats.count > 0) {
      result[fieldName] = stats;
    }
  }

  return result;
}

export function computeActivityStatsFromRecords(records: ActivityRecord[]): ActivityStats {
  const distanceMeters = safeDistanceMeters(records);
  const hasPower = records.some((r) => r.pwr !== undefined && r.pwr !== null);

  return {
    durationSeconds: safeDurationSeconds(records),
    distanceMeters,
    elevationGainMeters: safeElevationGainMeters(records),
    elevationLossMeters: safeElevationLossMeters(records),
    calories: null,
    metrics: {
      hr: safeMetricStats(records, "hr"),
      alt: safeMetricStats(records, "alt"),
      pwr: safeMetricStats(records, "pwr"),
      cad: safeMetricStats(records, "cad"),
      pace: safePaceStats(records),
      speed: safeMetricStats(records, "speed"),
      temp: safeMetricStats(records, "temp"),
      grade: safeMetricStats(records, "grade"),
      verticalSpeed: safeMetricStats(records, "verticalSpeed"),
    },
    bestSplits: calculateBestSplits(records, distanceMeters),
    powerMetrics: hasPower
      ? {
          normalizedPower: calculateNormalizedPower(records),
          best12MinPower: calculateBestTimePower(records, 12 * 60),
          best20MinPower: calculateBestTimePower(records, 20 * 60),
        }
      : {
          normalizedPower: null,
          best12MinPower: null,
          best20MinPower: null,
        },
    additionalMetrics: computeAdditionalMetrics(records),
  };
}

export function computeActivityStats(activity: Activity): ActivityStats {
  const stats = computeActivityStatsFromRecords(activity.records);
  return {
    ...stats,
    calories: activity.calories ?? null,
  };
}

