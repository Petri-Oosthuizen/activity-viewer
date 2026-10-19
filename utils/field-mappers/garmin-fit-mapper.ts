/**
 * Field mapper for Garmin-specific FIT files
 * Extends base FIT mapper with Garmin-specific field names
 */

import { FitFieldMapper } from "./fit-mapper";
import type { FieldMapping } from "./types";

/**
 * Garmin-specific FIT field mapper
 * Handles Garmin-specific field names like runcadence
 */
export class GarminFitFieldMapper extends FitFieldMapper {
  override mapField(sourceFieldName: string, value: number): FieldMapping | null {
    const normalized = sourceFieldName.toLowerCase().replace(/[_-]/g, "");

    // Garmin-specific cadence mappings
    // runcadence, running_cadence, runningcadence → cad (unified cadence)
    if (
      normalized === "runcadence" ||
      normalized === "runningcadence" ||
      normalized === "running_cadence" ||
      normalized === "run_cadence"
    ) {
      return { unifiedField: "cad", value };
    }

    // Garmin bike cadence (may differ from run cadence)
    // bikecadence, bikingcadence, bike_cadence → cad (unified cadence)
    if (
      normalized === "bikecadence" ||
      normalized === "bikingcadence" ||
      normalized === "bike_cadence" ||
      normalized === "cyclingcadence" ||
      normalized === "cycling_cadence"
    ) {
      return { unifiedField: "cad", value };
    }

    // Fall back to base FIT mapper for other fields
    return super.mapField(sourceFieldName, value);
  }

  override getKnownFields(): string[] {
    return [
      ...super.getKnownFields(),
      "runcadence",
      "running_cadence",
      "run_cadence",
      "bikecadence",
      "bike_cadence",
      "bikingcadence",
      "cyclingcadence",
      "cycling_cadence",
    ];
  }
}

/**
 * Default Garmin FIT field mapper instance
 */
export const garminFitFieldMapper = new GarminFitFieldMapper();
