import type { Activity } from "~/types/activity";
import type { XAxisType } from "~/utils/chart-config";
import { calculateXValue } from "~/utils/chart-config";

export interface ActivityXValues {
  values: number[];
  isMonotonic: boolean;
}

type CacheEntry = ActivityXValues & { key: string };
const cache = new Map<string, CacheEntry>();

function cacheKey(activity: Activity, xAxisType: XAxisType): string {
  const start = activity.startTime ? activity.startTime.getTime() : 0;
  return `${activity.id}:${xAxisType}:off=${activity.offset}:start=${start}`;
}

/**
 * Returns per-record X values for an activity (cached).
 * Used for fast nearest-point lookup (e.g. chart hover → map point).
 */
export function getActivityXValues(activity: Activity, xAxisType: XAxisType): ActivityXValues {
  const key = cacheKey(activity, xAxisType);
  const cached = cache.get(activity.id);
  if (cached?.key === key) return cached;

  const values = activity.records.map((r) => calculateXValue(r, activity, xAxisType));
  let isMonotonic = true;
  for (let i = 1; i < values.length; i++) {
    if (values[i]! < values[i - 1]!) {
      isMonotonic = false;
      break;
    }
  }

  const next: CacheEntry = { key, values, isMonotonic };
  cache.set(activity.id, next);
  return next;
}

export function findNearestIndex(sorted: number[], target: number): number {
  if (sorted.length === 0) return -1;
  let lo = 0;
  let hi = sorted.length - 1;
  if (target <= sorted[lo]!) return lo;
  if (target >= sorted[hi]!) return hi;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = sorted[mid]!;
    if (v === target) return mid;
    if (v < target) lo = mid + 1;
    else hi = mid - 1;
  }

  const left = Math.max(0, hi);
  const right = Math.min(sorted.length - 1, lo);
  return Math.abs(sorted[right]! - target) < Math.abs(sorted[left]! - target) ? right : left;
}

export function findNearestIndexLinear(values: number[], target: number): number {
  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < values.length; i++) {
    const d = Math.abs(values[i]! - target);
    if (d < bestDiff) {
      bestDiff = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

