import { computed } from "vue";
import type { ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useActivityList } from "~/composables/useActivityList";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useWindowActivityStore } from "~/stores/windowActivity";
import { useUIStore } from "~/stores/ui";
import { computeActivityStatsFromRecords, computeActivityStats } from "~/utils/activity-stats";
import type { ActivityStats } from "~/utils/activity-stats";
import {
  formatAdditionalMetricValue,
  formatDateTime,
  formatDistance,
  formatGapSeconds,
  formatMetricValue,
  formatSpeed,
  formatTime,
  getAdditionalMetricDisplayName,
} from "~/utils/format";
import type { MetricType } from "~/utils/chart-config";
import { METRIC_LABELS, METRIC_ORDER } from "~/utils/chart-config";
import type { Lap } from "~/types/activity";
import { METRIC_DESCRIPTIONS } from "~/utils/metric-descriptions";
import { COMMON_SPLITS } from "~/utils/best-splits";
import { computeSamplingStats, SAMPLING_FIELDS } from "~/utils/sampling-stats";
import type { SamplingField, SamplingStats } from "~/utils/sampling-stats";
import {
  computeGlobalXExtent,
  filterRecordsByXRange,
  isPercentWindowActive,
  percentWindowToXRange,
} from "~/utils/windowing";

export interface OverviewCell {
  text: string;
  muted?: boolean;
  title?: string;
  note?: string;
}

export type OverviewRowVariant = "row" | "sub" | "group";

export interface OverviewRowDef {
  key: string;
  label: string;
  description?: string;
  variant?: OverviewRowVariant;
  cells?: OverviewCell[];
  deltas?: string[];
}

type MaybeNumber = number | null | undefined;

interface DeltaOptions {
  pick: (activityId: string) => MaybeNumber;
  formatDiff: (diff: number) => string;
  threshold: number;
}

type DeltaFormat = Omit<DeltaOptions, "pick">;

interface StatRowOptions {
  key: string;
  label: string;
  variant?: OverviewRowVariant;
  description?: string;
  pick: (stats: ActivityStats) => MaybeNumber;
  format: (v: number) => string;
  delta?: DeltaFormat;
}

interface LapRowDef {
  key: string;
  label: string;
  pick: (lap: Lap) => MaybeNumber;
  format: (value: number) => string;
}

const STAT_KINDS = [
  { kind: "min", label: "min" },
  { kind: "avg", label: "average" },
  { kind: "max", label: "max" },
] as const;

type StatKind = (typeof STAT_KINDS)[number]["kind"];

const LAP_ROWS: readonly LapRowDef[] = [
  { key: "time", label: "avg time", pick: (lap) => lap.totalTimeSeconds, format: formatTime },
  { key: "distance", label: "avg distance", pick: (lap) => lap.distanceMeters, format: formatDistance },
  { key: "hr", label: "avg HR", pick: (lap) => lap.averageHeartRateBpm, format: (v) => `${Math.round(v)} bpm` },
  { key: "speed", label: "avg speed", pick: (lap) => lap.averageSpeed, format: formatSpeed },
];

const EMPTY_CELL: OverviewCell = { text: "—", muted: true };
const LIGHT_MODE_METRICS: readonly MetricType[] = ["hr", "pwr"];

function isNumber(value: MaybeNumber): value is number {
  return value !== null && value !== undefined;
}

function getMetricName(metric: MetricType): string {
  const label = METRIC_LABELS[metric];
  return label.match(/^(.+?)\s*\(/)?.[1]?.trim() ?? label;
}

function getMetricUnit(metric: MetricType): string {
  return METRIC_LABELS[metric].match(/\(([^)]+)\)/)?.[1] ?? "";
}

function describe(name: string): string | undefined {
  return METRIC_DESCRIPTIONS[name] || undefined;
}

function cellOf(value: MaybeNumber, format: (v: number) => string): OverviewCell {
  return isNumber(value) ? { text: format(value) } : EMPTY_CELL;
}

function averageLapValue(laps: Lap[] | undefined, pick: LapRowDef["pick"]): number | null {
  const values = (laps ?? []).map(pick).filter(isNumber);
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

function samplingCell(stats: SamplingStats | null | undefined): OverviewCell {
  if (!stats) return EMPTY_CELL;
  const s = formatGapSeconds;
  const hasLargeGaps = stats.maxGap > stats.meanGap * 2;
  return {
    text: `every ${s(stats.meanGap)} s`,
    note: hasLargeGaps ? `gaps up to ${s(stats.maxGap)} s` : undefined,
    title: [
      `${stats.count} samples`,
      `average ${s(stats.meanGap)} s apart`,
      `smallest gap ${s(stats.minGap)} s`,
      `largest gap ${s(stats.maxGap)} s`,
      `median ${s(stats.p50Gap)} s`,
      `95% of gaps within ${s(stats.p95Gap)} s`,
    ].join("\n"),
  };
}

const roundedDiff = (unit: string) => (diff: number) => `${Math.round(diff)}${unit}`;

/** Overview table rows for the active activities, honouring display mode, chart window and baseline. */
export function useOverviewRows(): {
  rows: ComputedRef<OverviewRowDef[]>;
  baselineActivityId: ComputedRef<string | null>;
} {
  const { activeActivities } = useActivityList();
  const { rawActivities } = storeToRefs(useRawActivityStore());
  const { xAxisType, viewMode } = storeToRefs(useChartOptionsStore());
  const { chartWindow } = storeToRefs(useWindowActivityStore());
  const { overviewDisplayMode, overviewBaselineEnabled, overviewBaselineActivityId } =
    storeToRefs(useUIStore());

  const isBaselineActive = computed(
    () => activeActivities.value.length >= 2 && overviewBaselineEnabled.value,
  );

  // A cleared or inactive stored baseline falls back to the first active activity.
  const baselineActivityId = computed<string | null>(() => {
    const stored = overviewBaselineActivityId.value;
    const acts = activeActivities.value;
    return acts.some((a) => a.id === stored) ? stored : (acts[0]?.id ?? null);
  });

  const statsById = computed(() => {
    const map: Record<string, ActivityStats> = {};
    const acts = activeActivities.value;
    const w = chartWindow.value;
    const isWindowActive = isPercentWindowActive({
      startPercent: w.xStartPercent,
      endPercent: w.xEndPercent,
    });
    // Pivot view has no X window, so it keeps full-activity stats.
    const extent =
      viewMode.value === "timeseries" && isWindowActive
        ? computeGlobalXExtent(acts, xAxisType.value)
        : null;

    if (!extent) {
      for (const a of acts) map[a.id] = computeActivityStats(a);
      return map;
    }

    const range = percentWindowToXRange(extent, {
      startPercent: w.xStartPercent,
      endPercent: w.xEndPercent,
    });
    for (const a of acts) {
      const subset = filterRecordsByXRange(a, xAxisType.value, range);
      const subsetStats = computeActivityStatsFromRecords(
        subset.length > 0 ? subset : a.records.slice(0, 1),
      );
      map[a.id] = { ...subsetStats, calories: computeActivityStats(a).calories };
    }
    return map;
  });

  // Sampling is a device property, so it reads raw records and ignores processing and the chart window.
  const samplingById = computed(() => {
    const map = new Map<string, Record<SamplingField, SamplingStats | null>>();
    for (const raw of rawActivities.value) map.set(raw.id, computeSamplingStats(raw.records));
    return map;
  });

  function deltasFor({ pick, formatDiff, threshold }: DeltaOptions): string[] | undefined {
    if (!isBaselineActive.value) return undefined;
    const baselineId = baselineActivityId.value;
    const base = baselineId ? pick(baselineId) : null;
    return activeActivities.value.map((a) => {
      const value = pick(a.id);
      if (!isNumber(base) || !isNumber(value)) return "—";
      if (a.id === baselineId) return "baseline";
      const diff = value - base;
      const pct = base === 0 ? null : (diff / base) * 100;
      const absPct = pct === null ? 0 : Math.abs(pct);
      if (Math.abs(diff) < threshold && absPct < 0.05) return "—";
      const sign = diff >= 0 ? "+" : "";
      const pctLabel =
        pct !== null && absPct >= 0.05 ? ` (${sign}${pct.toFixed(1).replace(/\.0$/, "")}%)` : "";
      return `${sign}${formatDiff(diff)}${pctLabel}`;
    });
  }

  function statRow({ pick, format, delta, ...row }: StatRowOptions): OverviewRowDef {
    const pickById = (id: string): MaybeNumber => {
      const stats = statsById.value[id];
      return stats ? pick(stats) : null;
    };
    return {
      ...row,
      cells: activeActivities.value.map((a) => cellOf(pickById(a.id), format)),
      deltas: delta ? deltasFor({ ...delta, pick: pickById }) : undefined,
    };
  }

  function minAvgMaxRows({
    key,
    pick,
    format,
    delta,
  }: {
    key: string;
    pick: (stats: ActivityStats, kind: StatKind) => MaybeNumber;
    format: (v: number) => string;
    delta: DeltaFormat;
  }): OverviewRowDef[] {
    return STAT_KINDS.map(({ kind, label }) =>
      statRow({ key: `${key}-${kind}`, label, variant: "sub", pick: (s) => pick(s, kind), format, delta }),
    );
  }

  function summaryRows(full: boolean): OverviewRowDef[] {
    const acts = activeActivities.value;
    const rows: OverviewRowDef[] = [
      {
        key: "start",
        label: "Start Time",
        cells: acts.map((a) => (a.startTime ? { text: formatDateTime(a.startTime) } : EMPTY_CELL)),
      },
      statRow({
        key: "duration",
        label: "Duration",
        description: describe("Duration"),
        pick: (s) => s.durationSeconds,
        format: formatTime,
        delta: { threshold: 0.5, formatDiff: roundedDiff("s") },
      }),
      statRow({
        key: "distance",
        label: "Distance",
        description: describe("Distance"),
        pick: (s) => s.distanceMeters,
        format: formatDistance,
        delta: { threshold: 0.5, formatDiff: roundedDiff("m") },
      }),
    ];
    if (!full) return rows;
    if (acts.some((a) => a.sport)) {
      rows.push({
        key: "sport",
        label: "Type",
        cells: acts.map((a) => (a.sport ? { text: a.sport } : EMPTY_CELL)),
      });
    }
    if (acts.some((a) => isNumber(statsById.value[a.id]?.calories))) {
      rows.push(
        statRow({
          key: "calories",
          label: "Calories",
          description: describe("Calories"),
          pick: (s) => s.calories,
          format: (v) => `${Math.round(v)} kcal`,
          delta: { threshold: 1, formatDiff: roundedDiff(" kcal") },
        }),
      );
    }
    return rows;
  }

  function elevationRows(full: boolean): OverviewRowDef[] {
    const acts = activeActivities.value;
    const hasElevation = acts.some((a) => {
      const s = statsById.value[a.id];
      return isNumber(s?.elevationGainMeters) || isNumber(s?.elevationLossMeters);
    });
    if (!hasElevation) return [];
    const format = (v: number) => `${Math.round(v)} m`;
    const delta = { threshold: 0.5, formatDiff: roundedDiff("m") };
    const description = describe("Elevation gain");
    const gain = statRow({
      key: "elevation-gain",
      label: "gained",
      variant: "sub",
      pick: (s) => s.elevationGainMeters,
      format,
      delta,
    });
    const loss = statRow({
      key: "elevation-loss",
      label: "lost",
      variant: "sub",
      pick: (s) => s.elevationLossMeters,
      format,
      delta,
    });

    if (full) return [{ key: "elevation", label: "Elevation", description, variant: "group" }, gain, loss];

    return [
      {
        key: "elevation",
        label: "Elevation",
        description,
        cells: acts.map((_, i) => {
          const g = gain.cells?.[i] ?? EMPTY_CELL;
          const l = loss.cells?.[i] ?? EMPTY_CELL;
          return { text: `+ ${g.text}  − ${l.text}`, muted: g.muted && l.muted };
        }),
        deltas: gain.deltas?.map((g, i) => {
          const parts = [g, loss.deltas?.[i] ?? "—"];
          if (parts.includes("baseline")) return "baseline";
          return parts.filter((d) => d !== "—").join("  ");
        }),
      },
    ];
  }

  function metricRows(full: boolean): OverviewRowDef[] {
    const available = METRIC_ORDER.filter((metric) =>
      activeActivities.value.some((activity) => {
        const m = statsById.value[activity.id]?.metrics[metric];
        return m !== undefined && (m.avg !== null || m.min !== null || m.max !== null);
      }),
    );
    const shown = full ? available : available.filter((m) => LIGHT_MODE_METRICS.includes(m));

    return shown.flatMap((metric): OverviewRowDef[] => {
      const name = getMetricName(metric);
      const format = (v: number) => formatMetricValue(v, metric);
      const unit = getMetricUnit(metric);
      const delta: DeltaFormat = {
        threshold: 0.05,
        formatDiff: (diff) => `${diff.toFixed(1).replace(/\.0$/, "")} ${unit}`,
      };
      if (!full) {
        return [
          statRow({
            key: `metric-${metric}`,
            label: `${name} (ave)`,
            description: describe(name),
            pick: (s) => s.metrics[metric].avg,
            format,
            delta,
          }),
        ];
      }
      return [
        { key: `metric-${metric}`, label: name, description: describe(name), variant: "group" },
        ...minAvgMaxRows({
          key: `metric-${metric}`,
          pick: (s, kind) => s.metrics[metric][kind],
          format,
          delta,
        }),
      ];
    });
  }

  function lapRows(): OverviewRowDef[] {
    const acts = activeActivities.value;
    if (!acts.some((a) => a.laps && a.laps.length > 1)) return [];
    const lapDefs = LAP_ROWS.filter((def) =>
      acts.some((a) => a.laps?.some((lap) => isNumber(def.pick(lap)))),
    );
    return [
      { key: "laps", label: "Laps", description: describe("Laps"), variant: "group" },
      {
        key: "laps-count",
        label: "Count",
        cells: acts.map((a) => ({ text: a.laps && a.laps.length > 0 ? String(a.laps.length) : "—" })),
      },
      ...lapDefs.map(
        (def): OverviewRowDef => ({
          key: `laps-${def.key}`,
          label: def.label,
          variant: "sub",
          cells: acts.map((a) => cellOf(averageLapValue(a.laps, def.pick), def.format)),
        }),
      ),
    ];
  }

  function additionalMetricRows(): OverviewRowDef[] {
    const fields = new Set<string>();
    for (const a of activeActivities.value) {
      Object.keys(statsById.value[a.id]?.additionalMetrics ?? {}).forEach((key) => fields.add(key));
    }
    return [...fields].sort().flatMap((field): OverviewRowDef[] => {
      const name = getAdditionalMetricDisplayName(field);
      const format = (v: number) => formatAdditionalMetricValue(field, v);
      return [
        { key: `extra-${field}`, label: name, description: describe(name), variant: "group" },
        ...minAvgMaxRows({
          key: `extra-${field}`,
          pick: (s, kind) => s.additionalMetrics[field]?.[kind],
          format,
          delta: { threshold: 0.01, formatDiff: format },
        }),
      ];
    });
  }

  function bestSplitRows(): OverviewRowDef[] {
    const labels = new Set<string>();
    for (const a of activeActivities.value) {
      Object.keys(statsById.value[a.id]?.bestSplits ?? {}).forEach((label) => labels.add(label));
    }
    if (labels.size === 0) return [];
    const ordered = COMMON_SPLITS.map((split) => split.label).filter((label) => labels.has(label));
    return [
      { key: "splits", label: "Best Splits", description: describe("Best Splits"), variant: "group" },
      ...ordered.map((label) =>
        statRow({
          key: `split-${label}`,
          label,
          pick: (s) => s.bestSplits[label]?.timeSeconds,
          format: formatTime,
          delta: { threshold: 0.5, formatDiff: roundedDiff("s") },
        }),
      ),
    ];
  }

  function samplingRows(): OverviewRowDef[] {
    const acts = activeActivities.value;
    const fieldStats = (id: string, field: SamplingField) => samplingById.value.get(id)?.[field];
    const fields = SAMPLING_FIELDS.filter((field) => acts.some((a) => fieldStats(a.id, field)));
    if (fields.length === 0) return [];
    return [
      {
        key: "sampling",
        label: "Sampling",
        description: "How often each sensor recorded a value. Hover a cell for details.",
        variant: "group",
      },
      ...fields.map(
        (field): OverviewRowDef => ({
          key: `sampling-${field}`,
          label: field === "gps" ? "GPS" : getMetricName(field),
          variant: "sub",
          cells: acts.map((a) => samplingCell(fieldStats(a.id, field))),
          deltas: deltasFor({
            pick: (id) => fieldStats(id, field)?.meanGap,
            formatDiff: (diff) => `${formatGapSeconds(diff)} s`,
            threshold: 0.05,
          }),
        }),
      ),
    ];
  }

  const rows = computed<OverviewRowDef[]>(() => {
    const full = overviewDisplayMode.value === "full";
    const detailRows = full
      ? [...lapRows(), ...additionalMetricRows(), ...bestSplitRows(), ...samplingRows()]
      : [];
    return [...summaryRows(full), ...elevationRows(full), ...metricRows(full), ...detailRows];
  });

  return { rows, baselineActivityId };
}
