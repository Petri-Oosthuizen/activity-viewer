import type { ActivityRecord } from "~/types/activity";

export type SamplingField = "gps" | "hr" | "pwr" | "cad" | "alt" | "speed" | "temp";

export interface SamplingStats {
  count: number;
  meanGap: number;
  minGap: number;
  maxGap: number;
  p50Gap: number;
  p95Gap: number;
}

export const SAMPLING_FIELDS: readonly SamplingField[] = ["gps", "hr", "pwr", "cad", "alt", "speed", "temp"];

function isFiniteNumber(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

function hasSample(record: ActivityRecord, field: SamplingField): boolean {
  if (field === "gps") return isFiniteNumber(record.lat) && isFiniteNumber(record.lon);
  return isFiniteNumber(record[field]);
}

function nearestRank(sorted: number[], percentile: number): number {
  const index = Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1);
  return sorted[index] ?? Number.NaN;
}

function fieldSamplingStats(records: ActivityRecord[], field: SamplingField): SamplingStats | null {
  const times: number[] = [];
  for (const record of records) {
    if (hasSample(record, field)) times.push(record.t);
  }
  if (times.length < 2) return null;

  // Files are not guaranteed to be in time order, so gaps come from sorted sample times.
  times.sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) gaps.push(times[i]! - times[i - 1]!);
  const span = times[times.length - 1]! - times[0]!;
  gaps.sort((a, b) => a - b);

  return {
    count: times.length,
    meanGap: span / gaps.length,
    minGap: gaps[0] ?? Number.NaN,
    maxGap: gaps[gaps.length - 1] ?? Number.NaN,
    p50Gap: nearestRank(gaps, 50),
    p95Gap: nearestRank(gaps, 95),
  };
}

/** Sampling cadence per field, measured on raw records so cleaning and zoom do not change it. */
export function computeSamplingStats(records: ActivityRecord[]): Record<SamplingField, SamplingStats | null> {
  return {
    gps: fieldSamplingStats(records, "gps"),
    hr: fieldSamplingStats(records, "hr"),
    pwr: fieldSamplingStats(records, "pwr"),
    cad: fieldSamplingStats(records, "cad"),
    alt: fieldSamplingStats(records, "alt"),
    speed: fieldSamplingStats(records, "speed"),
    temp: fieldSamplingStats(records, "temp"),
  };
}
