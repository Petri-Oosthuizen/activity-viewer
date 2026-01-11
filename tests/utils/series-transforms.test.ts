import { describe, it, expect } from "vitest";
import type { Activity } from "~/types/activity";
import { DEFAULT_CHART_TRANSFORM_SETTINGS } from "~/utils/chart-settings";
import {
  buildPivotZonesForActivities,
  buildTransformedChartData,
} from "~/utils/series-transforms";

describe("series-transforms", () => {
  const baseActivity: Activity = {
    id: "a1",
    name: "A1",
    offset: 0,
    scale: 1,
    color: "#000",
    records: [
      { t: 0, d: 0, hr: 100, alt: 10 },
      { t: 10, d: 100, hr: 105, alt: 11 },
      { t: 20, d: 200, hr: 1000, alt: 30 }, // spike
      { t: 30, d: 300, hr: 110, alt: 12 },
    ],
  };

  it("drops outliers when configured", () => {
    const transforms = {
      ...DEFAULT_CHART_TRANSFORM_SETTINGS,
      outliers: { mode: "drop", maxPercentChange: 20 },
    } as const;

    const data = buildTransformedChartData(baseActivity, "hr", "time", transforms);
    // Spike should be nulled (time=20)
    expect(data[2]).toEqual([20, null]);
  });

  it("applies cumulative sum", () => {
    const transforms = {
      ...DEFAULT_CHART_TRANSFORM_SETTINGS,
      outliers: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.outliers },
      smoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.smoothing, mode: "off" },
      cumulative: { mode: "sum" },
    } as const;

    const data = buildTransformedChartData(baseActivity, "alt", "time", transforms);
    // alt: 10 + 11 + 30 + 12 = 63
    expect(data[0][1]).toBeCloseTo(10, 6);
    expect(data[1][1]).toBeCloseTo(21, 6); // 10 + 11
    expect(data[2][1]).toBeCloseTo(51, 6); // 10 + 11 + 30
    expect(data[3][1]).toBeCloseTo(63, 6); // 10 + 11 + 30 + 12
  });

  it("applies cumulative positive delta sum", () => {
    const transforms = {
      ...DEFAULT_CHART_TRANSFORM_SETTINGS,
      outliers: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.outliers },
      smoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.smoothing, mode: "off" },
      cumulative: { mode: "positiveDeltaSum" },
    } as const;

    const data = buildTransformedChartData(baseActivity, "alt", "time", transforms);
    // alt: 10 -> 11 (+1) -> 30 (+19) -> 12 (-18, ignored) => total = 20
    expect(data[0][1]).toBeCloseTo(0, 6); // First value, no previous
    expect(data[1][1]).toBeCloseTo(1, 6); // +1 from 10 to 11
    expect(data[2][1]).toBeCloseTo(20, 6); // +1 + 19 = 20
    expect(data[3][1]).toBeCloseTo(20, 6); // No change (negative delta ignored)
  });

  it("applies cumulative positive delta sum with decreasing values", () => {
    const activity: Activity = {
      id: "a2",
      name: "A2",
      offset: 0,
      scale: 1,
      color: "#000",
      records: [
        { t: 0, d: 0, alt: 100 },
        { t: 10, d: 100, alt: 90 },
        { t: 20, d: 200, alt: 95 },
        { t: 30, d: 300, alt: 80 },
      ],
    };

    const transforms = {
      ...DEFAULT_CHART_TRANSFORM_SETTINGS,
      outliers: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.outliers },
      smoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.smoothing, mode: "off" },
      cumulative: { mode: "positiveDeltaSum" },
    } as const;

    const data = buildTransformedChartData(activity, "alt", "time", transforms);
    // alt: 100 -> 90 (-10, ignored) -> 95 (+5) -> 80 (-15, ignored) => total = 5
    expect(data[0][1]).toBeCloseTo(0, 6);
    expect(data[1][1]).toBeCloseTo(0, 6); // -10 ignored
    expect(data[2][1]).toBeCloseTo(5, 6); // +5 from 90 to 95
    expect(data[3][1]).toBeCloseTo(5, 6); // -15 ignored
  });

  it("builds pivot zones across activities", () => {
    const transforms = {
      ...DEFAULT_CHART_TRANSFORM_SETTINGS,
      viewMode: "pivotZones",
      pivotZones: { zoneCount: 3, strategy: "equalRange" },
      smoothing: { mode: "off", windowPoints: 1 },
      outliers: { mode: "off", maxPercentChange: 200 },
      cumulative: { mode: "off" },
      gpsSmoothing: { enabled: false, windowPoints: 1 },
    } as const;

    const a2: Activity = {
      ...baseActivity,
      id: "a2",
      name: "A2",
      records: [
        { t: 0, d: 0, hr: 120 },
        { t: 10, d: 100, hr: 130 },
        { t: 20, d: 200, hr: 140 },
      ],
    };

    const pivot = buildPivotZonesForActivities([baseActivity, a2], "hr", transforms);
    expect(pivot).not.toBeNull();
    // Distribution always uses at least 5 bins, even if configured lower.
    expect(pivot!.binCenters).toHaveLength(5);
    expect(pivot!.totalsSecondsByActivityId["a1"]).toHaveLength(5);
    expect(pivot!.totalsSecondsByActivityId["a2"]).toHaveLength(5);
  });
});

