export interface GpsDistanceOptions {
  /** Ignore movements smaller than this (meters). */
  minMoveMeters: number;
  /** Ignore segments with speed above this (meters/second). */
  maxSpeedMps: number;
  /** Ignore jumps larger than this when dt ≤ 1s (meters). */
  maxJumpMetersAt1s: number;
  /** If enabled, distance is computed in 3D using altitude deltas. */
  includeElevation: boolean;
}

export const DEFAULT_GPS_DISTANCE_OPTIONS: Readonly<GpsDistanceOptions> = {
  minMoveMeters: 0,
  maxSpeedMps: 40,
  maxJumpMetersAt1s: 250,
  includeElevation: false,
};

export interface GpsPoint {
  lat: number;
  lon: number;
  /** Elapsed time seconds. */
  t: number;
  alt?: number;
}

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function clampNonNegative(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Compute the segment distance (meters) between two GPS points, optionally in 3D.
 */
export function computeSegmentDistanceMeters(
  prev: GpsPoint,
  next: GpsPoint,
  options: GpsDistanceOptions,
): number {
  const d2 = haversineDistanceMeters(prev.lat, prev.lon, next.lat, next.lon);
  if (!options.includeElevation) return d2;
  const z1 = prev.alt;
  const z2 = next.alt;
  if (typeof z1 !== "number" || typeof z2 !== "number") return d2;
  const dz = z2 - z1;
  return Math.hypot(d2, dz);
}

/**
 * Applies basic GPS distance filtering to reduce jitter and unrealistic spikes.
 * Returns the delta distance (meters) to be accumulated, or 0 if rejected.
 */
export function filterGpsDistanceDeltaMeters(
  prev: GpsPoint,
  next: GpsPoint,
  options: GpsDistanceOptions,
): number {
  const dt = clampNonNegative(next.t - prev.t);
  const dist = computeSegmentDistanceMeters(prev, next, options);

  const isJitter = dist < options.minMoveMeters;
  const isSpeedSpike = dt > 0 && dist / dt > options.maxSpeedMps;
  const isJumpSpike = dt <= 1 && dist > options.maxJumpMetersAt1s;

  if (isJitter || isSpeedSpike || isJumpSpike) return 0;
  return dist;
}

