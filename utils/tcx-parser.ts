import type { ParseResult } from "~/types/activity";
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import { createParseResult } from "./activity-parser-common";
import { extractTCXPoints } from "./parsers/tcx-point-extractor";

export function parseTCX(
  xmlText: string,
  distanceOptions: Partial<GpsDistanceOptions> = {},
): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const points = extractTCXPoints(doc);
  return createParseResult(points, distanceOptions);
}
