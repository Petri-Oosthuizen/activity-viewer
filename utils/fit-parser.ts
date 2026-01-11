import type { ParseResult } from "~/types/activity";
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import { createParseResult } from "./activity-parser-common";
import { extractFITPoints } from "./parsers/fit-point-extractor";

export async function parseFIT(
  arrayBuffer: ArrayBuffer,
  distanceOptions: Partial<GpsDistanceOptions> = {},
): Promise<ParseResult> {
  const { points, calories } = await extractFITPoints(arrayBuffer);
  const result = createParseResult(points, distanceOptions);
  return { ...result, calories };
}
