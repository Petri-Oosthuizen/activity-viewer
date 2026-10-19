import { describe, it, expect } from "vitest";
import { computeSamplingStats, SAMPLING_FIELDS } from "~/utils/sampling-stats";
import type { ActivityRecord } from "~/types/activity";

function makeRecords(times: number[], fill: (t: number) => Partial<ActivityRecord>): ActivityRecord[] {
  return times.map((t) => ({ t, d: 0, ...fill(t) }));
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let t = start; t <= end; t++) out.push(t);
  return out;
}

describe("computeSamplingStats", () => {
  it("returns an entry for every sampling field", () => {
    const stats = computeSamplingStats([]);
    expect(Object.keys(stats).sort()).toEqual([...SAMPLING_FIELDS].sort());
  });

  it("reports uniform 1 s sampling", () => {
    const records = makeRecords(range(0, 100), () => ({ hr: 120 }));
    expect(computeSamplingStats(records).hr).toEqual({
      count: 101,
      meanGap: 1,
      minGap: 1,
      maxGap: 1,
      p50Gap: 1,
      p95Gap: 1,
    });
  });

  it("reports each field at its own rate", () => {
    const records = makeRecords(range(0, 20), (t) => (t % 5 === 0 ? { hr: 120, pwr: 200 } : { hr: 120 }));
    const stats = computeSamplingStats(records);
    expect(stats.hr?.count).toBe(21);
    expect(stats.hr?.meanGap).toBe(1);
    expect(stats.pwr).toEqual({ count: 5, meanGap: 5, minGap: 5, maxGap: 5, p50Gap: 5, p95Gap: 5 });
  });

  it("shows a single 60 s hole in max and p95 but not p50", () => {
    const records = makeRecords([...range(0, 9), ...range(69, 78)], () => ({ hr: 120 }));
    const hr = computeSamplingStats(records).hr;
    expect(hr?.count).toBe(20);
    expect(hr?.minGap).toBe(1);
    expect(hr?.maxGap).toBe(60);
    expect(hr?.p95Gap).toBe(60);
    expect(hr?.p50Gap).toBe(1);
    expect(hr?.meanGap).toBeCloseTo(78 / 19, 10);
  });

  it("returns null for a field with one sample or none", () => {
    const records = makeRecords(range(0, 10), (t) => (t === 3 ? { cad: 90 } : {}));
    const stats = computeSamplingStats(records);
    expect(stats.cad).toBeNull();
    expect(stats.temp).toBeNull();
  });

  it("counts gps only when both lat and lon are present", () => {
    const records: ActivityRecord[] = [
      { t: 0, d: 0, lat: 1, lon: 2 },
      { t: 1, d: 0, lat: 1 },
      { t: 2, d: 0, lon: 2 },
      { t: 4, d: 0, lat: 1, lon: 2 },
    ];
    expect(computeSamplingStats(records).gps).toEqual({
      count: 2,
      meanGap: 4,
      minGap: 4,
      maxGap: 4,
      p50Gap: 4,
      p95Gap: 4,
    });
  });

  it("skips non-finite values", () => {
    const records: ActivityRecord[] = [
      { t: 0, d: 0, alt: 10, speed: 3, lat: 1, lon: 2 },
      { t: 1, d: 0, alt: Number.NaN, speed: Number.POSITIVE_INFINITY, lat: Number.NaN, lon: 2 },
      { t: 3, d: 0, alt: 11, speed: 3, lat: 1, lon: 2 },
    ];
    const stats = computeSamplingStats(records);
    expect(stats.alt?.count).toBe(2);
    expect(stats.alt?.minGap).toBe(3);
    expect(stats.speed?.count).toBe(2);
    expect(stats.gps?.count).toBe(2);
    expect(stats.gps?.maxGap).toBe(3);
  });
});
