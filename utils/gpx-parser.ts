import type { ParseResult } from "~/types/activity";
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import { createParseResult } from "./activity-parser-common";
import { extractGPXPoints } from "./parsers/gpx-point-extractor";

function extractGPXType(doc: Document): string | undefined {
  const trk = doc.querySelector("trk");
  if (!trk) return undefined;
  
  const typeEl = Array.from(trk.children).find((el) => el.localName === "type");
  return typeEl?.textContent?.trim() || undefined;
}

export function parseGPX(
  xmlText: string,
  distanceOptions: Partial<GpsDistanceOptions> = {},
): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const points = extractGPXPoints(doc);
  const sport = extractGPXType(doc);
  const result = createParseResult(points, distanceOptions);
  return { ...result, sport };
}
