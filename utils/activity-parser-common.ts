import type { ActivityRecord, ParseResult } from "~/types/activity";
import { DEFAULT_GPS_DISTANCE_OPTIONS, filterGpsDistanceDeltaMeters, type GpsDistanceOptions, type GpsPoint } from "~/utils/gps-distance";

export interface RawPoint {
  lat: number;
  lon: number;
  alt?: number;
  time?: Date;
  hr?: number;
  cad?: number;
  pwr?: number;
  distanceMeters?: number;
}

function calculateElapsedTime(
  point: RawPoint,
  index: number,
  points: RawPoint[],
  startTime: Date,
): number {
  if (point.time) {
    return (point.time.getTime() - startTime.getTime()) / 1000;
  }

  if (index > 0) {
    const prevPoint = points[index - 1];
    if (prevPoint?.time) {
      const prevTime = prevPoint.time;
      let estimatedInterval = 1;
      if (index > 1) {
        const prevPrevPoint = points[index - 2];
        if (prevPrevPoint?.time) {
          estimatedInterval = (prevPoint.time.getTime() - prevPrevPoint.time.getTime()) / 1000;
        }
      }
      return (prevTime.getTime() - startTime.getTime()) / 1000 + estimatedInterval;
    }
  }

  return index;
}

function processPointsToRecords(
  points: RawPoint[],
  distanceOptions: GpsDistanceOptions,
): ActivityRecord[] {
  if (points.length === 0) {
    return [];
  }

  const records: ActivityRecord[] = [];
  let cumulativeDistance = 0;
  let startDistance: number | null = null;
  const firstPoint = points[0];
  if (!firstPoint) {
    return [];
  }
  const startTime = firstPoint.time || new Date();

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point) {
      continue;
    }

    const elapsedTime = calculateElapsedTime(point, i, points, startTime);

    if (point.distanceMeters !== undefined) {
      if (startDistance === null) {
        startDistance = point.distanceMeters;
      }
      cumulativeDistance = point.distanceMeters - startDistance;
    } else if (i > 0) {
      const prevPoint = points[i - 1];
      if (prevPoint) {
        const prevElapsed = records[records.length - 1]?.t ?? Math.max(0, elapsedTime - 1);
        const prevGps: GpsPoint = {
          lat: prevPoint.lat,
          lon: prevPoint.lon,
          t: prevElapsed,
          alt: prevPoint.alt,
        };
        const nextGps: GpsPoint = {
          lat: point.lat,
          lon: point.lon,
          t: elapsedTime,
          alt: point.alt,
        };
        cumulativeDistance += filterGpsDistanceDeltaMeters(prevGps, nextGps, distanceOptions);
      }
    }

    const record: ActivityRecord = {
      t: Math.max(0, elapsedTime),
      d: Math.max(0, cumulativeDistance),
      lat: point.lat,
      lon: point.lon,
      alt: point.alt,
      hr: point.hr,
      cad: point.cad,
      pwr: point.pwr,
    };

    records.push(record);
  }

  return records;
}

export function createParseResult(
  points: RawPoint[],
  distanceOptions: Partial<GpsDistanceOptions> = {},
): ParseResult {
  if (points.length === 0) {
    throw new Error("No valid track points found");
  }

  const distOpts: GpsDistanceOptions = { ...DEFAULT_GPS_DISTANCE_OPTIONS, ...distanceOptions };
  const firstPoint = points[0];
  if (!firstPoint) {
    throw new Error("No valid track points found");
  }

  const records = processPointsToRecords(points, distOpts);
  const startTime = firstPoint.time || new Date();

  return {
    records,
    startTime: startTime instanceof Date ? startTime : undefined,
  };
}
