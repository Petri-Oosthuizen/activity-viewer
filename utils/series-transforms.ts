import type { Activity, ActivityRecord } from "~/types/activity";
import type { ChartDataPoint, MetricType, XAxisType } from "~/utils/chart-config";
import { calculateXValue } from "~/utils/chart-config";
import type { ChartTransformSettings } from "~/utils/chart-settings";

type NullableNumber = number | null;

const chartDataCache = new Map<string, ChartDataPoint[]>();
const pivotZonesCache = new Map<string, PivotZonesMultiResult | null>();

function calculateAverageTimeInterval(records: ActivityRecord[]): number {
  if (records.length < 2) return 1;
  let totalInterval = 0;
  let count = 0;
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];
    if (!prev || !curr) continue;
    const dt = curr.t - prev.t;
    if (dt > 0 && Number.isFinite(dt)) {
      totalInterval += dt;
      count++;
    }
  }
  return count > 0 ? totalInterval / count : 1;
}

function chartCacheKey(
  activity: Activity,
  metric: MetricType,
  xAxisType: XAxisType,
  transforms: ChartTransformSettings,
): string {
  const start = activity.startTime ? activity.startTime.getTime() : 0;
  const t = transforms;
  const smoothingKey =
    metric === "pace" && t.paceSmoothing.enabled
      ? `paceSm:${t.paceSmoothing.windowSeconds}`
      : `sm:${t.smoothing.mode}:${t.smoothing.windowPoints}`;
  return [
    activity.id,
    metric,
    xAxisType,
    `off:${activity.offset}`,
    `scale:${activity.scale}`,
    `start:${start}`,
    `out:${t.outliers.mode}:${t.outliers.maxPercentChange}`,
    smoothingKey,
    `cum:${t.cumulative.mode}`,
  ].join("|");
}

function pivotCacheKey(
  activities: Activity[],
  metric: MetricType,
  transforms: ChartTransformSettings,
): string {
  const ids = activities
    .map((a) => a.id)
    .slice()
    .sort()
    .join(",");
  const t = transforms;
  const smoothingKey =
    metric === "pace" && t.paceSmoothing.enabled
      ? `paceSm:${t.paceSmoothing.windowSeconds}`
      : `sm:${t.smoothing.mode}:${t.smoothing.windowPoints}`;
  return [
    ids,
    metric,
    `out:${t.outliers.mode}:${t.outliers.maxPercentChange}`,
    smoothingKey,
    `zones:${t.pivotZones.strategy}:${t.pivotZones.zoneCount}`,
  ].join("|");
}

function getMetricValue(
  record: ActivityRecord,
  metric: MetricType,
  activity?: Activity,
  index?: number,
): NullableNumber {
  if (metric === "pace") {
    if (!activity || index === undefined || index === 0) return null;
    const prev = activity.records[index - 1];
    if (!prev) return null;
    const dt = record.t - prev.t;
    const dd = record.d - prev.d;
    if (dt <= 0 || dd <= 0) return null;
    const paceMinPerKm = (dt / 60) / (dd / 1000);
    return Number.isFinite(paceMinPerKm) && paceMinPerKm > 0 ? paceMinPerKm : null;
  }
  const value = record[metric];
  return value === undefined || value === null ? null : value;
}

function applyOutlierHandling(
  values: NullableNumber[],
  settings: ChartTransformSettings["outliers"],
): NullableNumber[] {
  if (settings.mode === "off") return values;

  const maxPercent = Math.max(0, settings.maxPercentChange);
  const next = values.slice();

  let prev: number | null = null;
  for (let i = 0; i < next.length; i++) {
    const current = next[i];
    if (current === null || current === undefined) continue;

    if (prev === null) {
      prev = current;
      continue;
    }

    const delta = current - prev;
    const denom = Math.max(Math.abs(prev), Math.abs(current), 1);
    const pct = (Math.abs(delta) / denom) * 100;

    if (pct <= maxPercent) {
      prev = current;
      continue;
    }

    if (settings.mode === "drop") {
      next[i] = null;
      continue;
    }

    // clamp
    const allowedDelta = (maxPercent / 100) * denom;
    const clamped: number = prev + Math.sign(delta) * allowedDelta;
    next[i] = clamped;
    prev = clamped;
  }

  return next;
}

function clampWindowPoints(windowPoints: number): number {
  if (!Number.isFinite(windowPoints)) return 1;
  return Math.max(1, Math.floor(windowPoints));
}

function smoothMovingAverage(values: NullableNumber[], windowPoints: number): NullableNumber[] {
  const w = clampWindowPoints(windowPoints);
  if (w <= 1) return values;

  const half = Math.floor(w / 2);
  const next = new Array<NullableNumber>(values.length).fill(null);

  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, i - half);
    const end = Math.min(values.length - 1, i + half);

    for (let j = start; j <= end; j++) {
      const v = values[j];
      if (v === null || v === undefined) continue;
      sum += v;
      count++;
    }

    next[i] = count > 0 ? sum / count : null;
  }

  return next;
}

function smoothEma(values: NullableNumber[], windowPoints: number): NullableNumber[] {
  const w = clampWindowPoints(windowPoints);
  if (w <= 1) return values;

  const alpha = 2 / (w + 1);
  const next = new Array<NullableNumber>(values.length).fill(null);

  let prevEma: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || v === undefined) {
      next[i] = prevEma;
      continue;
    }

    if (prevEma === null) {
      prevEma = v;
      next[i] = v;
      continue;
    }

    prevEma = alpha * v + (1 - alpha) * prevEma;
    next[i] = prevEma;
  }

  return next;
}

function applySmoothing(
  values: NullableNumber[],
  settings: ChartTransformSettings["smoothing"],
): NullableNumber[] {
  if (settings.mode === "off") return values;
  if (settings.mode === "movingAverage") return smoothMovingAverage(values, settings.windowPoints);
  return smoothEma(values, settings.windowPoints);
}

function applyCumulative(
  values: NullableNumber[],
  mode: ChartTransformSettings["cumulative"]["mode"],
): NullableNumber[] {
  if (mode === "off") return values;

  const next = new Array<NullableNumber>(values.length).fill(null);
  let total = 0;
  let prev: number | null = null;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || v === undefined) {
      next[i] = total;
      continue;
    }

    if (mode === "sum") {
      total += v;
      next[i] = total;
      continue;
    }

    // positiveDeltaSum
    if (prev !== null && prev !== undefined) {
      const delta = v - prev;
      if (delta > 0) total += delta;
    }
    prev = v;
    next[i] = total;
  }

  return next;
}

export function buildTransformedChartData(
  activity: Activity,
  metric: MetricType,
  xAxisType: XAxisType,
  transforms: ChartTransformSettings,
): ChartDataPoint[] {
  const key = chartCacheKey(activity, metric, xAxisType, transforms);
  const cached = chartDataCache.get(key);
  if (cached) return cached;

  const x = activity.records.map((r) => calculateXValue(r, activity, xAxisType));
  const yRaw = activity.records.map((r, i) => getMetricValue(r, metric, activity, i));

  const yNoOutliers = applyOutlierHandling(yRaw, transforms.outliers);
  
  let smoothingSettings: ChartTransformSettings["smoothing"];
  if (metric === "pace" && transforms.paceSmoothing.enabled) {
    const avgInterval = calculateAverageTimeInterval(activity.records);
    const windowPoints = Math.max(1, Math.round(transforms.paceSmoothing.windowSeconds / avgInterval));
    smoothingSettings = {
      mode: "movingAverage",
      windowPoints,
    };
  } else {
    smoothingSettings = transforms.smoothing;
  }
  
  const ySmoothed = applySmoothing(yNoOutliers, smoothingSettings);
  const yCumulative = applyCumulative(ySmoothed, transforms.cumulative.mode);

  const scale = Number.isFinite(activity.scale) ? activity.scale : 1;
  const yScaled =
    scale === 1
      ? yCumulative
      : yCumulative.map((v) => (v === null ? null : v * scale));

  const result = x.map((xVal, i): ChartDataPoint => [xVal, yScaled[i] ?? null]);
  chartDataCache.set(key, result);
  return result;
}

export interface PivotZoneResult {
  binCenters: number[];
  totalsSeconds: number[];
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loVal = sorted[lo];
  const hiVal = sorted[hi];
  if (lo === hi || loVal === undefined || hiVal === undefined) {
    return loVal ?? hiVal ?? 0;
  }
  const t = idx - lo;
  return loVal * (1 - t) + hiVal * t;
}

export function buildPivotZones(
  activity: Activity,
  metric: MetricType,
  transforms: ChartTransformSettings,
): PivotZoneResult | null {
  const zoneCount = Math.max(5, Math.floor(transforms.pivotZones.zoneCount));

  let smoothingSettings: ChartTransformSettings["smoothing"];
  if (metric === "pace" && transforms.paceSmoothing.enabled) {
    const avgInterval = calculateAverageTimeInterval(activity.records);
    const windowPoints = Math.max(1, Math.round(transforms.paceSmoothing.windowSeconds / avgInterval));
    smoothingSettings = {
      mode: "movingAverage",
      windowPoints,
    };
  } else {
    smoothingSettings = transforms.smoothing;
  }

  // We pivot by elapsed time between points.
  const values = applySmoothing(
    applyOutlierHandling(activity.records.map((r, i) => getMetricValue(r, metric, activity, i)), transforms.outliers),
    smoothingSettings,
  );

  // Build segment durations (seconds) and associate with "current" value.
  const segments: Array<{ v: number; dt: number }> = [];
  for (let i = 0; i < activity.records.length - 1; i++) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    const nextRecord = activity.records[i + 1];
    const currentRecord = activity.records[i];
    if (!nextRecord || !currentRecord) continue;
    const dt = nextRecord.t - currentRecord.t;
    if (!Number.isFinite(dt) || dt <= 0) continue;
    segments.push({ v, dt });
  }

  if (segments.length === 0) return null;

  const numeric = segments.map((s) => s.v).sort((a, b) => a - b);
  const min = numeric[0];
  const max = numeric[numeric.length - 1];
  if (min === undefined || max === undefined || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;

  const edges: number[] = [];
  if (transforms.pivotZones.strategy === "equalRange") {
    const step = (max - min) / zoneCount;
    for (let i = 0; i <= zoneCount; i++) edges.push(min + step * i);
  } else {
    for (let i = 0; i <= zoneCount; i++) {
      edges.push(quantile(numeric, i / zoneCount));
    }
    // Ensure monotonic edges (can happen with repeated values)
    for (let i = 1; i < edges.length; i++) {
      const prevEdge = edges[i - 1];
      const currEdge = edges[i];
      if (prevEdge !== undefined && currEdge !== undefined) {
        edges[i] = Math.max(currEdge, prevEdge);
      }
    }
  }

  const totalsSeconds = new Array<number>(zoneCount).fill(0);
  for (const s of segments) {
    let zone = zoneCount - 1;
    for (let i = 0; i < zoneCount; i++) {
      const lo = edges[i];
      const hi = edges[i + 1];
      if (lo === undefined || hi === undefined) continue;
      const isLast = i === zoneCount - 1;
      if (s.v >= lo && (s.v < hi || (isLast && s.v <= hi))) {
        zone = i;
        break;
      }
    }
    const totalAtZone = totalsSeconds[zone];
    if (totalAtZone !== undefined) {
      totalsSeconds[zone] = totalAtZone + s.dt;
    }
  }

  const binCenters = totalsSeconds.map((_, i) => {
    const loEdge = edges[i];
    const hiEdge = edges[i + 1];
    if (loEdge === undefined || hiEdge === undefined) return 0;
    return (loEdge + hiEdge) / 2;
  });

  return { binCenters, totalsSeconds };
}

export interface PivotZonesMultiResult {
  binCenters: number[];
  totalsSecondsByActivityId: Record<string, number[]>;
}

export function buildPivotZonesForActivities(
  activities: Activity[],
  metric: MetricType,
  transforms: ChartTransformSettings,
): PivotZonesMultiResult | null {
  const key = pivotCacheKey(activities, metric, transforms);
  if (pivotZonesCache.has(key)) {
    return pivotZonesCache.get(key) ?? null;
  }

  const zoneCount = Math.max(5, Math.floor(transforms.pivotZones.zoneCount));

  const activitySegments = new Map<string, Array<{ v: number; dt: number }>>();
  const allValues: number[] = [];

  for (const activity of activities) {
    let smoothingSettings: ChartTransformSettings["smoothing"];
    if (metric === "pace" && transforms.paceSmoothing.enabled) {
      const avgInterval = calculateAverageTimeInterval(activity.records);
      const windowPoints = Math.max(1, Math.round(transforms.paceSmoothing.windowSeconds / avgInterval));
      smoothingSettings = {
        mode: "movingAverage",
        windowPoints,
      };
    } else {
      smoothingSettings = transforms.smoothing;
    }

    const values = applySmoothing(
      applyOutlierHandling(activity.records.map((r, i) => getMetricValue(r, metric, activity, i)), transforms.outliers),
      smoothingSettings,
    );

    const segments: Array<{ v: number; dt: number }> = [];
    for (let i = 0; i < activity.records.length - 1; i++) {
      const v = values[i];
      if (v === null || v === undefined) continue;
      const nextRecord = activity.records[i + 1];
      const currentRecord = activity.records[i];
      if (!nextRecord || !currentRecord) continue;
      const dt = nextRecord.t - currentRecord.t;
      if (!Number.isFinite(dt) || dt <= 0) continue;
      segments.push({ v, dt });
      allValues.push(v);
    }

    if (segments.length > 0) {
      activitySegments.set(activity.id, segments);
    }
  }

  if (activitySegments.size === 0) {
    pivotZonesCache.set(key, null);
    return null;
  }

  const numeric = allValues.sort((a, b) => a - b);
  const min = numeric[0];
  const max = numeric[numeric.length - 1];
  if (min === undefined || max === undefined || !Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    pivotZonesCache.set(key, null);
    return null;
  }

  const edges: number[] = [];
  if (transforms.pivotZones.strategy === "equalRange") {
    const step = (max - min) / zoneCount;
    for (let i = 0; i <= zoneCount; i++) edges.push(min + step * i);
  } else {
    for (let i = 0; i <= zoneCount; i++) edges.push(quantile(numeric, i / zoneCount));
    for (let i = 1; i < edges.length; i++) {
      const prevEdge = edges[i - 1];
      const currEdge = edges[i];
      if (prevEdge !== undefined && currEdge !== undefined) {
        edges[i] = Math.max(currEdge, prevEdge);
      }
    }
  }

  const binCenters = Array.from({ length: zoneCount }, (_, i) => {
    const loEdge = edges[i];
    const hiEdge = edges[i + 1];
    if (loEdge === undefined || hiEdge === undefined) return 0;
    return (loEdge + hiEdge) / 2;
  });

  const totalsSecondsByActivityId: Record<string, number[]> = {};
  for (const [activityId, segments] of activitySegments.entries()) {
    const totals = new Array<number>(zoneCount).fill(0);
    for (const s of segments) {
      let zone = zoneCount - 1;
      for (let i = 0; i < zoneCount; i++) {
        const lo = edges[i];
        const hi = edges[i + 1];
        if (lo === undefined || hi === undefined) continue;
        const isLast = i === zoneCount - 1;
        if (s.v >= lo && (s.v < hi || (isLast && s.v <= hi))) {
          zone = i;
          break;
        }
      }
      const totalAtZone = totals[zone];
      if (totalAtZone !== undefined) {
        totals[zone] = totalAtZone + s.dt;
      }
    }
    totalsSecondsByActivityId[activityId] = totals;
  }

  const result = { binCenters, totalsSecondsByActivityId };
  pivotZonesCache.set(key, result);
  return result;
}

export function smoothGpsPoints(
  points: Array<{ lat: number; lon: number }>,
  windowPoints: number,
): Array<{ lat: number; lon: number }> {
  const w = clampWindowPoints(windowPoints);
  if (w <= 1) return points;

  const lat = points.map((p) => p.lat);
  const lon = points.map((p) => p.lon);
  const latSm = smoothMovingAverage(lat, w).map((v, i) => v ?? lat[i]);
  const lonSm = smoothMovingAverage(lon, w).map((v, i) => v ?? lon[i]);

  return points.map((p, i) => ({
    lat: latSm[i] ?? p.lat,
    lon: lonSm[i] ?? p.lon,
  }));
}

