import type { RawPoint } from "../activity-parser-common";
import { normalizeFitPosition } from "../fit-coordinates";

interface FITRecord {
  timestamp?: number | string | Date;
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  heart_rate?: number;
  power?: number;
  cadence?: number;
  distance?: number;
}

function toTimestampMs(value: number | string | Date): number | null {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function extractFITPoints(arrayBuffer: ArrayBuffer): Promise<{ points: RawPoint[]; calories?: number }> {
  try {
    const fitModule = await import("fit-file-parser");
    const FitParser = (fitModule.default || fitModule) as any;

    if (!FitParser) {
      throw new Error("Failed to import fit-file-parser");
    }

    const parser = new FitParser({
      force: true,
      speedUnit: "ms",
      lengthUnit: "m",
      temperatureUnit: "celsius",
      elapsedRecordField: true,
      mode: "list",
    });

    return new Promise((resolve, reject) => {
      parser.parse(arrayBuffer, (error: string | Error | null | undefined, data: any) => {
        if (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          reject(new Error(`Failed to parse FIT file: ${errorMessage}`));
          return;
        }

        if (!data || !data.records) {
          reject(new Error("No records found in FIT file"));
          return;
        }

        const points: RawPoint[] = [];
        let startTime: number | null = null;

        for (const record of data.records as FITRecord[]) {
          if (!record.timestamp) {
            continue;
          }

          const timestampMs = toTimestampMs(record.timestamp);
          if (timestampMs === null) continue;

          if (startTime === null) {
            startTime = timestampMs;
          }

          const recordAny = record as any;
          const positionLat =
            record.position_lat ??
            recordAny.latitude ??
            recordAny.lat ??
            recordAny.positionLat ??
            recordAny["position_lat"] ??
            recordAny["positionLat"];
          const positionLon =
            record.position_long ??
            recordAny.longitude ??
            recordAny.lon ??
            recordAny.positionLon ??
            recordAny["position_long"] ??
            recordAny["positionLon"];

          const normalized = normalizeFitPosition(positionLat, positionLon);
          if (!normalized) {
            continue;
          }

          const point: RawPoint = {
            lat: normalized.lat,
            lon: normalized.lon,
            alt: record.altitude,
            time: new Date(timestampMs),
            hr: record.heart_rate,
            pwr: record.power,
            cad: record.cadence,
            distanceMeters: record.distance,
          };

          points.push(point);
        }

        if (points.length === 0) {
          reject(new Error("No valid records found in FIT file"));
          return;
        }

        let calories: number | undefined;
        const dataAny = data as any;
        
        if (dataAny.activity && Array.isArray(dataAny.activity) && dataAny.activity.length > 0) {
          const activity = dataAny.activity[0];
          const totalCalories = activity.total_calories ?? activity.calories ?? activity.Calories;
          if (typeof totalCalories === "number" && totalCalories > 0) {
            calories = totalCalories;
          }
        } else if (dataAny.laps && Array.isArray(dataAny.laps) && dataAny.laps.length > 0) {
          let totalCalories = 0;
          let foundCalories = false;
          for (const lap of dataAny.laps) {
            const lapCalories = lap.total_calories ?? lap.calories ?? lap.Calories;
            if (typeof lapCalories === "number" && lapCalories > 0) {
              totalCalories += lapCalories;
              foundCalories = true;
            }
          }
          if (foundCalories) {
            calories = totalCalories;
          }
        }

        resolve({ points, calories });
      });
    });
  } catch (error) {
    throw new Error(
      `Failed to load FIT parser: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
