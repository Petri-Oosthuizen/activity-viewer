import type { ParseResult, Lap } from "~/types/activity";
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import { createParseResult } from "./activity-parser-common";
import { extractTCXPoints } from "./parsers/tcx-point-extractor";

function extractTCXCalories(doc: Document): number | undefined {
  const laps = doc.querySelectorAll("Lap");
  let totalCalories = 0;
  let foundCalories = false;

  for (const lap of laps) {
    const caloriesEl = lap.querySelector("Calories");
    if (caloriesEl?.textContent) {
      const calories = parseFloat(caloriesEl.textContent);
      if (!isNaN(calories) && calories > 0) {
        totalCalories += calories;
        foundCalories = true;
      }
    }
  }

  return foundCalories ? totalCalories : undefined;
}

function extractTCXSport(doc: Document): string | undefined {
  const activity = doc.querySelector("Activity");
  if (!activity) return undefined;
  const sport = activity.getAttribute("Sport");
  return sport || undefined;
}

function extractTCXLaps(doc: Document, recordsCount: number): Lap[] | undefined {
  const lapElements = doc.querySelectorAll("Lap");
  if (lapElements.length === 0) return undefined;

  const laps: Lap[] = [];
  let currentRecordIndex = 0;

  for (const lapEl of lapElements) {
    const startTimeAttr = lapEl.getAttribute("StartTime");
    if (!startTimeAttr) continue;

    const lapStartTime = new Date(startTimeAttr);
    
    const trackpoints = lapEl.querySelectorAll("Trackpoint");
    const lapPointCount = trackpoints.length;
    
    if (lapPointCount === 0) continue;

    const totalTimeEl = lapEl.querySelector("TotalTimeSeconds");
    const totalTimeSeconds = totalTimeEl?.textContent ? parseFloat(totalTimeEl.textContent) : undefined;

    const distanceEl = lapEl.querySelector("DistanceMeters");
    const distanceMeters = distanceEl?.textContent ? parseFloat(distanceEl.textContent) : undefined;

    const caloriesEl = lapEl.querySelector("Calories");
    const calories = caloriesEl?.textContent ? parseFloat(caloriesEl.textContent) : undefined;

    const avgHrEl = lapEl.querySelector("AverageHeartRateBpm");
    const avgHr = avgHrEl?.querySelector("Value")?.textContent ? parseFloat(avgHrEl.querySelector("Value")!.textContent!) : undefined;

    const maxHrEl = lapEl.querySelector("MaximumHeartRateBpm");
    const maxHr = maxHrEl?.querySelector("Value")?.textContent ? parseFloat(maxHrEl.querySelector("Value")!.textContent!) : undefined;

    const cadenceEl = lapEl.querySelector("Cadence");
    const avgCadence = cadenceEl?.textContent ? parseFloat(cadenceEl.textContent) : undefined;

    const maxSpeedEl = lapEl.querySelector("MaximumSpeed");
    const maxSpeed = maxSpeedEl?.textContent ? parseFloat(maxSpeedEl.textContent) : undefined;

    const intensityEl = lapEl.querySelector("Intensity");
    const intensity = intensityEl?.textContent as "Active" | "Resting" | undefined;

    const triggerEl = lapEl.querySelector("TriggerMethod");
    const triggerMethod = triggerEl?.textContent || undefined;

    const startIndex = currentRecordIndex;
    const endIndex = Math.min(currentRecordIndex + lapPointCount - 1, recordsCount - 1);

    if (startIndex <= endIndex) {
      laps.push({
        startTime: lapStartTime,
        startRecordIndex: startIndex,
        endRecordIndex: endIndex,
        totalTimeSeconds: totalTimeSeconds !== undefined && !isNaN(totalTimeSeconds) ? totalTimeSeconds : undefined,
        distanceMeters: distanceMeters !== undefined && !isNaN(distanceMeters) ? distanceMeters : undefined,
        calories: calories !== undefined && !isNaN(calories) && calories > 0 ? calories : undefined,
        averageHeartRateBpm: avgHr !== undefined && !isNaN(avgHr) ? avgHr : undefined,
        maximumHeartRateBpm: maxHr !== undefined && !isNaN(maxHr) ? maxHr : undefined,
        averageCadence: avgCadence !== undefined && !isNaN(avgCadence) ? avgCadence : undefined,
        maximumSpeed: maxSpeed !== undefined && !isNaN(maxSpeed) && maxSpeed > 0 ? maxSpeed : undefined,
        intensity,
        triggerMethod,
      });

      currentRecordIndex = endIndex + 1;
    }
  }

  return laps.length > 0 ? laps : undefined;
}

export function parseTCX(
  xmlText: string,
  distanceOptions: Partial<GpsDistanceOptions> = {},
): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const points = extractTCXPoints(doc);
  const calories = extractTCXCalories(doc);
  const sport = extractTCXSport(doc);
  const result = createParseResult(points, distanceOptions);
  const laps = extractTCXLaps(doc, result.records.length);
  return { ...result, calories, sport, laps };
}
