import type { ParseResult } from "~/types/activity";
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

export function parseTCX(
  xmlText: string,
  distanceOptions: Partial<GpsDistanceOptions> = {},
): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const points = extractTCXPoints(doc);
  const calories = extractTCXCalories(doc);
  const result = createParseResult(points, distanceOptions);
  return { ...result, calories };
}
