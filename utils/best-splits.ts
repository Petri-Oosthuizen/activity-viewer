/**
 * Calculate best split times for common distance segments
 */

import type { ActivityRecord } from "~/types/activity";

export interface BestSplit {
  distanceMeters: number;
  timeSeconds: number | null;
}

export const COMMON_SPLITS = [
  { distanceMeters: 100, label: "100m" },
  { distanceMeters: 1000, label: "1km" },
  { distanceMeters: 1609.34, label: "1 mile" },
  { distanceMeters: 5000, label: "5km" },
  { distanceMeters: 10000, label: "10km" },
  { distanceMeters: 21097.5, label: "Half Marathon" },
  { distanceMeters: 42195, label: "Marathon" },
  { distanceMeters: 50000, label: "50km" },
  { distanceMeters: 100000, label: "100km" },
] as const;

/**
 * Calculate best split time for a given distance segment
 * Returns the minimum time taken to cover the specified distance
 * Uses a sliding window approach for efficiency
 */
function calculateBestSplit(records: ActivityRecord[], targetDistance: number): number | null {
  if (records.length < 2 || targetDistance <= 0) return null;

  let bestTime: number | null = null;

  // For each start position, find the minimum time to cover targetDistance
  for (let startIdx = 0; startIdx < records.length - 1; startIdx++) {
    const startRecord = records[startIdx];
    if (!startRecord) continue;

    const startDistance = startRecord.d;
    const targetEndDistance = startDistance + targetDistance;

    // Skip if we can't reach the target distance from this starting point
    const lastRecord = records[records.length - 1];
    if (!lastRecord || lastRecord.d < targetEndDistance) break;

    // Find the record that first reaches or exceeds the target distance
    for (let endIdx = startIdx + 1; endIdx < records.length; endIdx++) {
      const endRecord = records[endIdx];
      if (!endRecord) break;

      const distanceCovered = endRecord.d - startDistance;

      if (distanceCovered >= targetDistance) {
        const timeTaken = endRecord.t - startRecord.t;
        if (timeTaken > 0) {
          if (bestTime === null || timeTaken < bestTime) {
            bestTime = timeTaken;
          }
        }
        break; // Move to next start position
      }
    }
  }

  return bestTime;
}

/**
 * Calculate best splits for common distance segments
 * Only includes splits that are achievable given the total distance
 */
export function calculateBestSplits(
  records: ActivityRecord[],
  totalDistanceMeters: number
): Record<string, BestSplit> {
  const splits: Record<string, BestSplit> = {};

  for (const split of COMMON_SPLITS) {
    // Only include splits that are shorter than or equal to the total distance
    if (split.distanceMeters <= totalDistanceMeters) {
      const bestTime = calculateBestSplit(records, split.distanceMeters);
      if (bestTime !== null) {
        splits[split.label] = {
          distanceMeters: split.distanceMeters,
          timeSeconds: bestTime,
        };
      }
    }
  }

  return splits;
}
