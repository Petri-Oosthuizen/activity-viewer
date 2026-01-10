/**
 * FIT coordinate normalization
 *
 * FIT lat/lon can appear as:
 * - semicircles (native FIT representation, large integers)
 * - decimal degrees (some parsers convert for you)
 */

export interface NormalizedPosition {
  lat: number;
  lon: number;
}

function semicirclesToDegrees(semicircles: number): number {
  return semicircles * (180 / Math.pow(2, 31));
}

export function normalizeFitPosition(
  latRaw: unknown,
  lonRaw: unknown,
): NormalizedPosition | null {
  const latNum = typeof latRaw === "number" ? latRaw : Number(latRaw);
  const lonNum = typeof lonRaw === "number" ? lonRaw : Number(lonRaw);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;

  // Many FIT files (or parsers) represent missing GPS as 0,0.
  if (latNum === 0 && lonNum === 0) return null;

  // Heuristic: if values already look like degrees, keep them.
  if (Math.abs(latNum) <= 90 && Math.abs(lonNum) <= 180) {
    return { lat: latNum, lon: lonNum };
  }

  // Otherwise, assume semicircles.
  const lat = semicirclesToDegrees(latNum);
  const lon = semicirclesToDegrees(lonNum);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (Math.abs(lat) < 1e-9 && Math.abs(lon) < 1e-9) return null;

  return { lat, lon };
}

