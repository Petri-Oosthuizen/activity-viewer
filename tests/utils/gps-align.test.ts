import { describe, it, expect } from "vitest";
import type { Activity, ActivityRecord } from "~/types/activity";
import { computeGpsAlignment } from "~/utils/gps-align";

const ORIGIN_LAT = 51.5;
const ORIGIN_LON = -0.1;
const METRES_PER_DEG_LAT = 111_320;
const METRES_PER_DEG_LON = METRES_PER_DEG_LAT * Math.cos((ORIGIN_LAT * Math.PI) / 180);

interface Position {
  lat: number;
  lon: number;
}

interface TrackOptions {
  speedMps?: number;
  durationSeconds?: number;
  sampleSeconds?: number;
  startDistanceMeters?: number;
  timeShiftSeconds?: number;
  eastShiftMeters?: number;
  northShiftMeters?: number;
  jitterMeters?: number;
  seed?: number;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

// L-shaped route: 600 m east, then north.
function positionAt({ distanceMeters, eastShift, northShift }: { distanceMeters: number; eastShift: number; northShift: number }): Position {
  const leg = 600;
  const east = Math.min(distanceMeters, leg) + eastShift;
  const north = Math.max(0, distanceMeters - leg) + northShift;
  return { lat: ORIGIN_LAT + north / METRES_PER_DEG_LAT, lon: ORIGIN_LON + east / METRES_PER_DEG_LON };
}

function buildTrack({
  speedMps = 3,
  durationSeconds = 400,
  sampleSeconds = 1,
  startDistanceMeters = 0,
  timeShiftSeconds = 0,
  eastShiftMeters = 0,
  northShiftMeters = 0,
  jitterMeters = 0,
  seed = 1,
}: TrackOptions = {}): ActivityRecord[] {
  const random = createRandom(seed);
  const records: ActivityRecord[] = [];
  for (let t = 0; t <= durationSeconds; t += sampleSeconds) {
    const d = startDistanceMeters + speedMps * t;
    const east = eastShiftMeters + (random() * 2 - 1) * jitterMeters * Math.SQRT1_2;
    const north = northShiftMeters + (random() * 2 - 1) * jitterMeters * Math.SQRT1_2;
    const { lat, lon } = positionAt({ distanceMeters: d, eastShift: east, northShift: north });
    records.push({ t: t + timeShiftSeconds, d, lat, lon });
  }
  return records;
}

function buildActivity({ id, records, offset = 0 }: { id: string; records: ActivityRecord[]; offset?: number }): Activity {
  return { id, name: id, records, offset, scale: 1, color: "#000" };
}

function alignedTimeAtDistance({ activity, distanceMeters }: { activity: Activity; distanceMeters: number }): number {
  const record = activity.records.find((r) => Math.abs(r.d - distanceMeters) < 1e-6);
  if (!record) throw new Error(`no record at ${distanceMeters} m`);
  return record.t + activity.offset;
}

describe("computeGpsAlignment", () => {
  it("aligns an identical track whose records are delayed by 37 s", () => {
    const reference = buildActivity({ id: "ref", records: buildTrack() });
    const target = buildActivity({ id: "tgt", records: buildTrack({ timeShiftSeconds: 37 }) });

    const result = computeGpsAlignment(reference, target);

    expect(result).not.toBeNull();
    expect(result!.offsetSeconds).toBe(-37);
    expect(result!.matchedAt).toBe("start");
    expect(result!.meanDistanceMeters).toBeLessThan(0.5);
    const aligned = { ...target, offset: result!.offsetSeconds };
    expect(alignedTimeAtDistance({ activity: aligned, distanceMeters: 300 })).toBe(
      alignedTimeAtDistance({ activity: reference, distanceMeters: 300 }),
    );
  });

  it("composes with an existing reference offset", () => {
    const reference = buildActivity({ id: "ref", records: buildTrack(), offset: 20 });
    const target = buildActivity({ id: "tgt", records: buildTrack({ timeShiftSeconds: 37 }), offset: 99 });

    const result = computeGpsAlignment(reference, target);

    expect(result!.offsetSeconds).toBe(-17);
    const aligned = { ...target, offset: result!.offsetSeconds };
    expect(alignedTimeAtDistance({ activity: aligned, distanceMeters: 600 })).toBe(
      alignedTimeAtDistance({ activity: reference, distanceMeters: 600 }),
    );
  });

  it("interpolates a target sampled every 5 s", () => {
    const reference = buildActivity({ id: "ref", records: buildTrack(), offset: 12 });
    const target = buildActivity({ id: "tgt", records: buildTrack({ sampleSeconds: 5, timeShiftSeconds: 37 }) });

    const result = computeGpsAlignment(reference, target);

    expect(result!.offsetSeconds).toBe(-25);
    expect(result!.meanDistanceMeters).toBeLessThan(0.5);
  });

  it("matches in reverse when the target joins the route after the reference start", () => {
    const reference = buildActivity({ id: "ref", records: buildTrack(), offset: 5 });
    const target = buildActivity({ id: "tgt", records: buildTrack({ startDistanceMeters: 300, durationSeconds: 200 }) });

    const result = computeGpsAlignment(reference, target);

    expect(result!.matchedAt).toBe("reverse");
    expect(result!.offsetSeconds).toBe(105);
    const aligned = { ...target, offset: result!.offsetSeconds };
    expect(alignedTimeAtDistance({ activity: aligned, distanceMeters: 600 })).toBe(
      alignedTimeAtDistance({ activity: reference, distanceMeters: 600 }),
    );
  });

  it("returns null when the target is on a different route", () => {
    const reference = buildActivity({ id: "ref", records: buildTrack() });
    const target = buildActivity({ id: "tgt", records: buildTrack({ eastShiftMeters: 5000, northShiftMeters: 5000 }) });

    expect(computeGpsAlignment(reference, target)).toBeNull();
  });

  it("refines past a coarse guess thrown off by noisy start samples", () => {
    const referenceRecords = buildTrack({ jitterMeters: 8, seed: 7 });
    const first = referenceRecords[0]!;
    // Push the first reference fix ~15 m along the route so the nearest target record is ~5 s off.
    referenceRecords[0] = { ...first, lon: first.lon! + 15 / METRES_PER_DEG_LON };
    const reference = buildActivity({ id: "ref", records: referenceRecords });
    const target = buildActivity({ id: "tgt", records: buildTrack({ timeShiftSeconds: 37, jitterMeters: 8, seed: 42 }) });

    const coarseOnly = computeGpsAlignment(reference, target, { refineWindowSeconds: 0 });
    const result = computeGpsAlignment(reference, target);

    expect(coarseOnly!.offsetSeconds).not.toBe(-37);
    expect(result!.offsetSeconds).toBe(-37);
    expect(result!.meanDistanceMeters).toBeLessThan(coarseOnly!.meanDistanceMeters);
  });

  it("returns null when either activity has no GPS", () => {
    const withGps = buildActivity({ id: "gps", records: buildTrack() });
    const withoutGps = buildActivity({ id: "none", records: buildTrack().map(({ t, d }) => ({ t, d })) });

    expect(computeGpsAlignment(withGps, withoutGps)).toBeNull();
    expect(computeGpsAlignment(withoutGps, withGps)).toBeNull();
  });

  it("applies option overrides", () => {
    const reference = buildActivity({ id: "ref", records: buildTrack({ durationSeconds: 190 }) });
    const shifted = buildActivity({
      id: "tgt",
      records: buildTrack({ durationSeconds: 190, timeShiftSeconds: 37, northShiftMeters: 50 }),
    });

    expect(computeGpsAlignment(reference, shifted)!.offsetSeconds).toBe(-37);
    expect(computeGpsAlignment(reference, shifted, { maxStartDistanceMeters: 30 })).toBeNull();
    expect(computeGpsAlignment(reference, shifted, { sampleCount: 5 })).toBeNull();
  });
});
