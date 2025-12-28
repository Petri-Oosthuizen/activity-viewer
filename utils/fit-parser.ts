import type { ActivityRecord, ParseResult } from "~/types/activity";

interface FITRecord {
  timestamp?: number;
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  heart_rate?: number;
  power?: number;
  cadence?: number;
  distance?: number;
}

// Convert FIT file semicircle coordinates to decimal degrees
// FIT files store lat/lon as semicircles (2^31 semicircles = 180 degrees)
function semicirclesToDegrees(semicircles: number): number {
  return semicircles * (180 / Math.pow(2, 31));
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function parseFIT(arrayBuffer: ArrayBuffer): Promise<ParseResult> {
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

        const records: ActivityRecord[] = [];
        let cumulativeDistance = 0;
        let startTime: number | null = null;
        let startDistance: number | null = null;
        let lastLat: number | null = null;
        let lastLon: number | null = null;
        let lastDistance: number | null = null;

        for (const record of data.records as FITRecord[]) {
          if (!record.timestamp) {
            continue;
          }

          if (startTime === null) {
            startTime = record.timestamp;
          }

          const elapsedTime = (record.timestamp - startTime) / 1000;

          let lat: number | null = null;
          let lon: number | null = null;
          let recordDistance: number | null = null;

          // Try multiple possible field names for GPS coordinates
          // FIT parser may use different field names depending on version
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

          // Convert FIT semicircle coordinates to degrees
          // Validate that coordinates are not null/undefined
          // Note: 0,0 is a valid GPS location (Gulf of Guinea), but FIT files often use 0 to mean "no data"
          // We'll check if the semicircle value is actually meaningful (not exactly 0 or very close to 0)
          if (
            positionLat !== undefined &&
            positionLat !== null &&
            positionLon !== undefined &&
            positionLon !== null &&
            !isNaN(positionLat) &&
            !isNaN(positionLon)
          ) {
            // Convert semicircles to degrees
            const convertedLat = semicirclesToDegrees(positionLat);
            const convertedLon = semicirclesToDegrees(positionLon);

            // Validate converted coordinates are within valid ranges
            // Also check that they're not exactly 0,0 (which usually means no GPS in FIT files)
            if (
              !isNaN(convertedLat) &&
              !isNaN(convertedLon) &&
              convertedLat >= -90 &&
              convertedLat <= 90 &&
              convertedLon >= -180 &&
              convertedLon <= 180 &&
              !(Math.abs(convertedLat) < 0.0001 && Math.abs(convertedLon) < 0.0001) // Not exactly 0,0
            ) {
              lat = convertedLat;
              lon = convertedLon;

              // Calculate distance increment using haversine if we have previous position
              if (lastLat !== null && lastLon !== null) {
                const distance = haversineDistance(lastLat, lastLon, lat, lon);
                cumulativeDistance += distance;
              }

              lastLat = lat;
              lastLon = lon;
            } else {
              // Invalid coordinates, skip GPS for this record
              lat = null;
              lon = null;
            }
          }

          // Prefer distance from FIT record if available (more accurate than calculated)
          // Normalize to start from 0
          if (record.distance !== undefined && record.distance !== null) {
            recordDistance = record.distance;
            if (startDistance === null) {
              startDistance = recordDistance;
            }
            cumulativeDistance = recordDistance - startDistance;
            lastDistance = recordDistance;
          } else if (lastDistance !== null && record.position_lat === undefined) {
            // If no GPS but have previous distance, use it
            cumulativeDistance = lastDistance - (startDistance || 0);
          }

          const activityRecord: ActivityRecord = {
            t: Math.max(0, elapsedTime),
            d: Math.max(0, cumulativeDistance),
            lat: lat ?? undefined,
            lon: lon ?? undefined,
            hr: record.heart_rate,
            pwr: record.power,
            alt: record.altitude,
            cad: record.cadence,
          };

          records.push(activityRecord);
        }

        if (records.length === 0) {
          reject(new Error("No valid records found in FIT file"));
          return;
        }

        resolve({
          records,
          startTime: startTime ? new Date(startTime) : undefined,
        });
      });
    });
  } catch (error) {
    throw new Error(
      `Failed to load FIT parser: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
