import type { ParseResult } from "~/types/activity";
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import { createParseResult } from "./activity-parser-common";
import { extractGPXPoints } from "./parsers/gpx-point-extractor";

export function parseGPX(
  xmlText: string,
  distanceOptions: Partial<GpsDistanceOptions> = {},
): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const points = extractGPXPoints(doc);
  return createParseResult(points, distanceOptions);
}
