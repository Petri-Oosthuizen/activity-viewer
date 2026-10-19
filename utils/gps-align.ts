import type { Activity } from "~/types/activity";

export interface GpsAlignmentOptions {
  maxStartDistanceMeters: number;
  refineWindowSeconds: number;
  sampleCount: number;
}

export interface GpsAlignmentResult {
  /** Offset to store on the target so its aligned times match the reference. */
  offsetSeconds: number;
  meanDistanceMeters: number;
  matchedAt: "start" | "reverse";
}

export const DEFAULT_GPS_ALIGNMENT_OPTIONS: Readonly<GpsAlignmentOptions> = {
  maxStartDistanceMeters: 100,
  refineWindowSeconds: 120,
  sampleCount: 300,
};

const MIN_OVERLAP_SAMPLES = 10;
const COARSE_STEP_SECONDS = 5;

interface GpsTrack {
  t: number[];
  lat: number[];
  lon: number[];
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractGpsTrack(activity: Activity): GpsTrack {
  const track: GpsTrack = { t: [], lat: [], lon: [] };
  for (const r of activity.records) {
    if (typeof r.lat !== "number" || typeof r.lon !== "number") continue;
    track.t.push(r.t);
    track.lat.push(r.lat);
    track.lon.push(r.lon);
  }
  return track;
}

/** Nearest point within the earliest pass through the radius, so a loop finish cannot win over the start. */
function findStartMatch({
  track,
  lat,
  lon,
  maxDistanceMeters,
}: {
  track: GpsTrack;
  lat: number;
  lon: number;
  maxDistanceMeters: number;
}): number | null {
  let index: number | null = null;
  let distanceMeters = Infinity;
  for (let i = 0; i < track.t.length; i++) {
    const d = haversineMeters(lat, lon, track.lat[i]!, track.lon[i]!);
    if (d > maxDistanceMeters) {
      if (index !== null) break;
      continue;
    }
    if (d < distanceMeters) {
      distanceMeters = d;
      index = i;
    }
  }
  return index;
}

/** Index of the last element <= value, or -1. */
function findFloorIndex(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! <= value) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function sampleIndices({ length, count }: { length: number; count: number }): number[] {
  const n = Math.min(length, Math.max(1, Math.floor(count)));
  if (n === 1) return [0];
  return Array.from({ length: n }, (_, k) => Math.round((k * (length - 1)) / (n - 1)));
}

function scoreOffset({
  reference,
  referenceOffset,
  samples,
  target,
  targetOffset,
}: {
  reference: GpsTrack;
  referenceOffset: number;
  samples: number[];
  target: GpsTrack;
  targetOffset: number;
}): number {
  const first = target.t[0]!;
  const last = target.t[target.t.length - 1]!;
  let sum = 0;
  let count = 0;
  for (const i of samples) {
    const targetTime = reference.t[i]! + referenceOffset - targetOffset;
    if (targetTime < first || targetTime > last) continue;
    const j = findFloorIndex(target.t, targetTime);
    const k = Math.min(j + 1, target.t.length - 1);
    const span = target.t[k]! - target.t[j]!;
    const f = span > 0 ? (targetTime - target.t[j]!) / span : 0;
    const lat = target.lat[j]! + f * (target.lat[k]! - target.lat[j]!);
    const lon = target.lon[j]! + f * (target.lon[k]! - target.lon[j]!);
    sum += haversineMeters(reference.lat[i]!, reference.lon[i]!, lat, lon);
    count++;
  }
  return count < MIN_OVERLAP_SAMPLES ? Infinity : sum / count;
}

/**
 * Finds the target offset that lines up both activities along their shared route.
 * Aligned time of a record is `t + activity.offset`.
 */
export function computeGpsAlignment(
  reference: Activity,
  target: Activity,
  options: Partial<GpsAlignmentOptions> = {},
): GpsAlignmentResult | null {
  const { maxStartDistanceMeters, refineWindowSeconds, sampleCount } = { ...DEFAULT_GPS_ALIGNMENT_OPTIONS, ...options };
  const ref = extractGpsTrack(reference);
  const tgt = extractGpsTrack(target);
  if (ref.t.length === 0 || tgt.t.length === 0) return null;

  let coarse: number;
  let matchedAt: GpsAlignmentResult["matchedAt"];
  const forward = findStartMatch({ track: tgt, lat: ref.lat[0]!, lon: ref.lon[0]!, maxDistanceMeters: maxStartDistanceMeters });
  if (forward !== null) {
    coarse = ref.t[0]! + reference.offset - tgt.t[forward]!;
    matchedAt = "start";
  } else {
    const backward = findStartMatch({ track: ref, lat: tgt.lat[0]!, lon: tgt.lon[0]!, maxDistanceMeters: maxStartDistanceMeters });
    if (backward === null) return null;
    coarse = ref.t[backward]! + reference.offset - tgt.t[0]!;
    matchedAt = "reverse";
  }
  coarse = Math.round(coarse);

  const samples = sampleIndices({ length: ref.t.length, count: sampleCount });
  const score = (targetOffset: number): number =>
    scoreOffset({ reference: ref, referenceOffset: reference.offset, samples, target: tgt, targetOffset });

  const window = Math.max(0, Math.round(refineWindowSeconds));
  let best = coarse;
  let bestScore = score(coarse);
  const consider = (candidate: number): void => {
    const s = score(candidate);
    if (s < bestScore) {
      best = candidate;
      bestScore = s;
    }
  };

  for (let c = coarse - window; c <= coarse + window; c += COARSE_STEP_SECONDS) consider(c);
  const center = best;
  const fineLow = Math.max(coarse - window, center - COARSE_STEP_SECONDS + 1);
  const fineHigh = Math.min(coarse + window, center + COARSE_STEP_SECONDS - 1);
  for (let c = fineLow; c <= fineHigh; c++) consider(c);

  if (!Number.isFinite(bestScore)) return null;
  return { offsetSeconds: best, meanDistanceMeters: bestScore, matchedAt };
}
