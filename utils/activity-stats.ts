import type { Activity, ActivityRecord } from "~/types/activity";
import type { MetricType } from "~/utils/chart-config";

export interface MetricStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
}

export interface ActivityStats {
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  calories: number | null;
  metrics: Record<MetricType, MetricStats>;
}

function safeMetricStats(records: ActivityRecord[], metric: "hr" | "alt" | "pwr" | "cad"): MetricStats {
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
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;

  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    const prev = records[i - 1];
    if (!r || !prev) continue;
    const dt = r.t - prev.t;
    const dd = r.d - prev.d;
    if (dt <= 0 || dd <= 0) continue;
    const paceMinPerKm = (dt / 60) / (dd / 1000);
    if (!Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) continue;
    count++;
    sum += paceMinPerKm;
    min = min === null ? paceMinPerKm : Math.min(min, paceMinPerKm);
    max = max === null ? paceMinPerKm : Math.max(max, paceMinPerKm);
  }

  return {
    count,
    min,
    max,
    avg: count > 0 ? sum / count : null,
  };
}

export function computeActivityStatsFromRecords(records: ActivityRecord[]): ActivityStats {
  return {
    durationSeconds: safeDurationSeconds(records),
    distanceMeters: safeDistanceMeters(records),
    elevationGainMeters: safeElevationGainMeters(records),
    elevationLossMeters: safeElevationLossMeters(records),
    calories: null,
    metrics: {
      hr: safeMetricStats(records, "hr"),
      alt: safeMetricStats(records, "alt"),
      pwr: safeMetricStats(records, "pwr"),
      cad: safeMetricStats(records, "cad"),
      pace: safePaceStats(records),
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

