import type { Activity, ActivityRecord } from "~/types/activity";
import type { XAxisType } from "~/utils/chart-config";
import { calculateXValue } from "~/utils/chart-config";

export interface PercentWindow {
  startPercent: number;
  endPercent: number;
}

export interface XExtent {
  min: number;
  max: number;
}

export interface XRange {
  lo: number;
  hi: number;
}

export function isPercentWindowActive(window: PercentWindow): boolean {
  return window.startPercent > 0 || window.endPercent < 100;
}

export function computeGlobalXExtent(activities: Activity[], xAxisType: XAxisType): XExtent | null {
  let min = Infinity;
  let max = -Infinity;

  for (const a of activities) {
    for (const r of a.records) {
      const x = calculateXValue(r, a, xAxisType);
      if (x < min) min = x;
      if (x > max) max = x;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;
  return { min, max };
}

export function percentWindowToXRange(extent: XExtent, window: PercentWindow): XRange {
  const start = Math.min(100, Math.max(0, window.startPercent));
  const end = Math.min(100, Math.max(0, window.endPercent));
  const xStart = extent.min + ((extent.max - extent.min) * start) / 100;
  const xEnd = extent.min + ((extent.max - extent.min) * end) / 100;
  return { lo: Math.min(xStart, xEnd), hi: Math.max(xStart, xEnd) };
}

export function filterRecordsByXRange(
  activity: Activity,
  xAxisType: XAxisType,
  range: XRange,
): ActivityRecord[] {
  return activity.records.filter((r) => {
    const x = calculateXValue(r, activity, xAxisType);
    return x >= range.lo && x <= range.hi;
  });
}

