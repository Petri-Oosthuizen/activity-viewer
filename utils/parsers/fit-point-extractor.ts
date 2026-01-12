import type { RawPoint } from "../activity-parser-common";
import type { Lap } from "~/types/activity";
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
  speed?: number;
  temperature?: number;
}

function toTimestampMs(value: number | string | Date): number | null {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractFITLaps(data: any, recordsCount: number, startTime?: Date): Lap[] | undefined {
  if (!data.laps || !Array.isArray(data.laps) || data.laps.length === 0) {
    return undefined;
  }

  const laps: Lap[] = [];
  let currentRecordIndex = 0;
  const avgTimePerRecord = recordsCount > 0 && data.records && data.records.length > 0
    ? (toTimestampMs(data.records[data.records.length - 1]?.timestamp) ?? startTime?.getTime() ?? 0) - (startTime?.getTime() ?? 0)
    : 0;

  for (const lapData of data.laps) {
    const lapStartTimeMs = toTimestampMs(lapData.start_time ?? lapData.startTime ?? lapData.timestamp);
    if (lapStartTimeMs === null) continue;

    const lapStartTime = new Date(lapStartTimeMs);
    
    const totalElapsed = lapData.total_elapsed_time ?? lapData.totalElapsedTime ?? lapData.elapsed_time;
    const distance = lapData.total_distance ?? lapData.distance;
    const calories = lapData.total_calories ?? lapData.calories;
    const avgHr = lapData.avg_heart_rate ?? lapData.avgHeartRate ?? lapData.average_heart_rate;
    const maxHr = lapData.max_heart_rate ?? lapData.maxHeartRate ?? lapData.maximum_heart_rate;
    const avgCadence = lapData.avg_cadence ?? lapData.avgCadence ?? lapData.average_cadence;
    const maxCadence = lapData.max_cadence ?? lapData.maxCadence ?? lapData.maximum_cadence;
    const avgSpeed = lapData.avg_speed ?? lapData.avgSpeed ?? lapData.average_speed;
    const maxSpeed = lapData.max_speed ?? lapData.maxSpeed ?? lapData.maximum_speed;
    const intensity = lapData.intensity;
    const trigger = lapData.lap_trigger ?? lapData.lapTrigger ?? lapData.trigger;

    const timeSeconds = totalElapsed ? (typeof totalElapsed === "number" ? totalElapsed : parseFloat(totalElapsed)) : undefined;
    const recordCount = timeSeconds && avgTimePerRecord > 0
      ? Math.max(1, Math.round((timeSeconds * 1000) / (avgTimePerRecord / recordsCount)))
      : Math.floor(recordsCount / data.laps.length);

    const startIndex = currentRecordIndex;
    const endIndex = Math.min(currentRecordIndex + Math.max(1, recordCount) - 1, recordsCount - 1);

    if (startIndex <= endIndex && startIndex < recordsCount) {
      laps.push({
        startTime: lapStartTime,
        startRecordIndex: startIndex,
        endRecordIndex: endIndex,
        totalTimeSeconds: timeSeconds !== undefined && Number.isFinite(timeSeconds) && timeSeconds > 0 ? timeSeconds : undefined,
        distanceMeters: distance !== undefined && Number.isFinite(distance) && distance >= 0 ? distance : undefined,
        calories: calories !== undefined && Number.isFinite(calories) && calories > 0 ? calories : undefined,
        averageHeartRateBpm: avgHr !== undefined && Number.isFinite(avgHr) && avgHr > 0 ? avgHr : undefined,
        maximumHeartRateBpm: maxHr !== undefined && Number.isFinite(maxHr) && maxHr > 0 ? maxHr : undefined,
        averageCadence: avgCadence !== undefined && Number.isFinite(avgCadence) && avgCadence >= 0 ? avgCadence : undefined,
        maximumCadence: maxCadence !== undefined && Number.isFinite(maxCadence) && maxCadence >= 0 ? maxCadence : undefined,
        averageSpeed: avgSpeed !== undefined && Number.isFinite(avgSpeed) && avgSpeed >= 0 ? avgSpeed : undefined,
        maximumSpeed: maxSpeed !== undefined && Number.isFinite(maxSpeed) && maxSpeed >= 0 ? maxSpeed : undefined,
        intensity: intensity === "active" || intensity === "Active" ? "Active" : intensity === "resting" || intensity === "Resting" ? "Resting" : undefined,
        triggerMethod: typeof trigger === "string" ? trigger : undefined,
      });

      currentRecordIndex = endIndex + 1;
    }
  }

  return laps.length > 0 ? laps : undefined;
}

export async function extractFITPoints(arrayBuffer: ArrayBuffer): Promise<{ points: RawPoint[]; calories?: number; sport?: string; laps?: Lap[] }> {
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

          const speed = record.speed ?? recordAny.speed ?? recordAny.velocity;
          const temp = record.temperature ?? recordAny.temperature ?? recordAny.temp;

          const additionalFields: Record<string, number> = {};

          // Running dynamics fields (in milliseconds, convert to seconds for consistency)
          const stanceTime = recordAny.stance_time ?? recordAny.stanceTime;
          if (stanceTime !== undefined && stanceTime !== null && Number.isFinite(stanceTime)) {
            additionalFields["stance_time_ms"] = stanceTime;
          }

          // Vertical oscillation (in mm, keep as mm)
          const verticalOscillation = recordAny.vertical_oscillation ?? recordAny.verticalOscillation;
          if (verticalOscillation !== undefined && verticalOscillation !== null && Number.isFinite(verticalOscillation)) {
            additionalFields["vertical_oscillation_mm"] = verticalOscillation;
          }

          // Step length (in mm, convert to cm for readability)
          const stepLength = recordAny.step_length ?? recordAny.stepLength;
          if (stepLength !== undefined && stepLength !== null && Number.isFinite(stepLength)) {
            additionalFields["step_length_cm"] = stepLength / 10;
          }

          // Ground contact time balance (percentage)
          const groundContactTimeBalance = recordAny.ground_contact_time_balance ?? recordAny.groundContactTimeBalance;
          if (groundContactTimeBalance !== undefined && groundContactTimeBalance !== null && Number.isFinite(groundContactTimeBalance)) {
            additionalFields["gct_balance"] = groundContactTimeBalance;
          }

          // Extract any other numeric fields that aren't already handled
          const knownFields = new Set([
            "timestamp", "position_lat", "position_long", "latitude", "longitude", "lat", "lon",
            "positionLat", "positionLon", "altitude", "heart_rate", "power", "cadence",
            "distance", "speed", "velocity", "temperature", "temp",
            "stance_time", "stanceTime", "vertical_oscillation", "verticalOscillation",
            "step_length", "stepLength", "ground_contact_time_balance", "groundContactTimeBalance",
            "elapsed_time", "elapsedTime", "timer_time", "timerTime"
          ]);

          for (const [key, value] of Object.entries(recordAny)) {
            if (knownFields.has(key)) continue;
            if (typeof value === "number" && Number.isFinite(value) && value !== null && value !== undefined) {
              additionalFields[key] = value;
            }
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
            speed: speed !== undefined && speed !== null && Number.isFinite(speed) && speed >= 0 ? speed : undefined,
            temp: temp !== undefined && temp !== null && Number.isFinite(temp) ? temp : undefined,
            additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined,
          };

          points.push(point);
        }

        if (points.length === 0) {
          reject(new Error("No valid records found in FIT file"));
          return;
        }

        let calories: number | undefined;
        let sport: string | undefined;
        const dataAny = data as any;
        
        if (dataAny.activity && Array.isArray(dataAny.activity) && dataAny.activity.length > 0) {
          const activity = dataAny.activity[0];
          const totalCalories = activity.total_calories ?? activity.calories ?? activity.Calories;
          if (typeof totalCalories === "number" && totalCalories > 0) {
            calories = totalCalories;
          }
          const sportType = activity.sport ?? activity.sport_type ?? activity.type;
          if (typeof sportType === "string" && sportType) {
            sport = sportType;
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

        const laps = extractFITLaps(dataAny, points.length, startTime !== null ? new Date(startTime) : undefined);

        resolve({ points, calories, sport, laps });
      });
    });
  } catch (error) {
    throw new Error(
      `Failed to load FIT parser: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
