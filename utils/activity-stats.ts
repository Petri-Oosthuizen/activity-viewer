import type { Activity, ActivityRecord } from "~/types/activity";
import type { MetricType } from "~/utils/chart-config";
import { calculateBestSplits, type BestSplit } from "~/utils/best-splits";
import {
  calculateBestTimePower,
  calculateNormalizedPower,
} from "~/utils/power-metrics";
import { calculateGpsSpeed, DEFAULT_GPS_DISTANCE_OPTIONS, type GpsDistanceOptions } from "~/utils/gps-distance";

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
}

function safeMetricStats(records: ActivityRecord[], metric: "hr" | "alt" | "pwr" | "cad" | "speed" | "temp" | "grade" | "vSpeed"): MetricStats {
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

  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    const prev = records[i - 1];
    if (!r || !prev) continue;

    let paceMinPerKm: number | null = null;
    let segmentDistance = 0;
    let segmentTime = 0;

    // Prefer embedded speed if available (TCX/FIT files)
    if (r.speed !== undefined && r.speed !== null && r.speed > 0 && Number.isFinite(r.speed)) {
      // Convert speed (m/s) to pace (min/km)
      // pace = (1000 meters / speed_mps) / 60 seconds = 1000 / (speed_mps * 60)
      paceMinPerKm = 1000 / (r.speed * 60);
      segmentTime = r.t - prev.t;
      segmentDistance = r.d - prev.d;
    } else if (r.lat !== undefined && r.lon !== undefined && prev.lat !== undefined && prev.lon !== undefined) {
      // For GPX files: calculate speed directly from GPS coordinates with filtering
      const speed = calculateGpsSpeed(
        { lat: prev.lat, lon: prev.lon, t: prev.t, alt: prev.alt },
        { lat: r.lat, lon: r.lon, t: r.t, alt: r.alt },
        gpsOptions
      );
      if (speed !== null && speed > 0 && Number.isFinite(speed)) {
        paceMinPerKm = 1000 / (speed * 60);
        segmentTime = r.t - prev.t;
        segmentDistance = r.d - prev.d;
      }
    } else {
      // Fall back to cumulative distance/time calculation
      segmentTime = r.t - prev.t;
      segmentDistance = r.d - prev.d;
      if (segmentTime > 0 && segmentDistance > 0) {
        paceMinPerKm = (segmentTime / 60) / (segmentDistance / 1000);
      }
    }

    if (paceMinPerKm === null || !Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) continue;
    
    count++;
    if (segmentTime > 0 && segmentDistance > 0) {
      totalDistance += segmentDistance;
      totalTime += segmentTime;
    }
    min = min === null ? paceMinPerKm : Math.min(min, paceMinPerKm);
    max = max === null ? paceMinPerKm : Math.max(max, paceMinPerKm);
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
      vSpeed: safeMetricStats(records, "vSpeed"),
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
  };
}

export function computeActivityStats(activity: Activity): ActivityStats {
  const stats = computeActivityStatsFromRecords(activity.records);
  return {
    ...stats,
    calories: activity.calories ?? null,
  };
}

