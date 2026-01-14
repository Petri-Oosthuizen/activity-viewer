/**
 * Activity importer utilities
 * Handles importing and parsing files, applying field mapping
 */

import type { RawActivity, ParseResult } from "~/types/activity";
import { parseGPX } from "~/utils/gpx-parser";
import { parseFIT } from "~/utils/fit-parser";
import { parseTCX } from "~/utils/tcx-parser";
// Field mappers are imported but not yet integrated into parsers
// TODO: Integrate field mappers into point extractors
import type { GpsDistanceOptions } from "~/utils/gps-distance";
import { generateActivityId } from "~/utils/chart-config";

/**
 * Import and parse a file, returning a RawActivity
 */
export async function importActivityFile(
  file: File,
  gpsDistanceOptions: Partial<GpsDistanceOptions> = {},
): Promise<RawActivity> {
  const fileName = file.name;
  const fileType = detectFileType(fileName);

  let parseResult: ParseResult;
  let fileContent: Blob | string;

  if (fileType === "gpx") {
    fileContent = await file.text();
    parseResult = parseGPX(fileContent, gpsDistanceOptions);
  } else if (fileType === "fit") {
    fileContent = await file.arrayBuffer();
    parseResult = await parseFIT(fileContent, gpsDistanceOptions);
  } else if (fileType === "tcx") {
    fileContent = await file.text();
    parseResult = parseTCX(fileContent, gpsDistanceOptions);
  } else {
    throw new Error(`Unsupported file type: ${fileName}`);
  }

  // Field mapping is applied during parsing in the point extractors
  // (would need to integrate field mappers into parsers - for now, records are already mapped)

  const id = generateActivityId();

  return {
    id,
    name: fileName,
    sourceType: fileType,
    fileContent: typeof fileContent === "string" ? fileContent : new Blob([fileContent]),
    records: parseResult.records,
    metadata: {
      startTime: parseResult.startTime,
      calories: parseResult.calories,
      sport: parseResult.sport,
      laps: parseResult.laps,
    },
  };
}

/**
 * Detect file type from file name
 */
function detectFileType(fileName: string): "gpx" | "fit" | "tcx" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".gpx")) return "gpx";
  if (lower.endsWith(".fit")) return "fit";
  if (lower.endsWith(".tcx")) return "tcx";
  throw new Error(`Unknown file type: ${fileName}`);
}

/**
 * Import multiple files
 */
export async function importActivityFiles(
  files: File[],
  gpsDistanceOptions: Partial<GpsDistanceOptions> = {},
): Promise<RawActivity[]> {
  const results: RawActivity[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      const activity = await importActivityFile(file, gpsDistanceOptions);
      results.push(activity);
    } catch (error) {
      errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (errors.length > 0) {
    console.warn("Some files failed to import:", errors);
  }

  return results;
}
