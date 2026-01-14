/**
 * Field mapper for GPX files
 * Maps GPX extension field names to unified ActivityRecord field names
 */

import type { FieldMapper, FieldMapping, FieldMappingContext } from "./types";

/**
 * GPX field mapper
 * Handles GPX extension fields and standard GPX attributes
 */
export class GpxFieldMapper implements FieldMapper {
  mapField(sourceFieldName: string, value: number, context?: FieldMappingContext): FieldMapping | null {
    const normalized = sourceFieldName.toLowerCase().replace(/[_-]/g, "");

    // Heart rate mappings (GPX extensions)
    if (
      normalized === "hr" ||
      normalized === "heartrate" ||
      normalized === "heart_rate" ||
      normalized === "heartratebpm" ||
      normalized === "heart_rate_bpm"
    ) {
      return { unifiedField: "hr", value };
    }

    // Cadence mappings
    if (
      normalized === "cad" ||
      normalized === "cadence" ||
      normalized === "runcadence" ||
      normalized === "runningcadence" ||
      normalized === "run_cadence"
    ) {
      return { unifiedField: "cad", value };
    }

    // Power mappings
    if (
      normalized === "power" ||
      normalized === "pwr" ||
      normalized === "watts" ||
      normalized === "powerwatts"
    ) {
      return { unifiedField: "pwr", value };
    }

    // Temperature mappings (GPX uses 'atemp' for ambient temperature)
    if (
      normalized === "atemp" ||
      normalized === "temperature" ||
      normalized === "temp" ||
      normalized === "atempc" ||
      normalized === "atemp_c"
    ) {
      return { unifiedField: "temp", value };
    }

    // Speed mappings (GPX extensions)
    if (
      normalized === "speed" ||
      normalized === "velocity" ||
      normalized === "speedms" ||
      normalized === "speed_ms"
    ) {
      return { unifiedField: "speed", value };
    }

    // GPS quality indicators (keep as additional fields with standardized names)
    if (normalized === "sat" || normalized === "satellites") {
      return { additionalField: "satellites", value };
    }

    if (normalized === "hdop") {
      return { additionalField: "hdop", value };
    }

    if (normalized === "vdop") {
      return { additionalField: "vdop", value };
    }

    // Ignore standard GPX fields that are handled separately
    if (
      normalized === "lat" ||
      normalized === "lon" ||
      normalized === "latitude" ||
      normalized === "longitude" ||
      normalized === "ele" ||
      normalized === "elevation" ||
      normalized === "time" ||
      normalized === "timestamp"
    ) {
      return null;
    }

    // Unknown field - return null (will be added to additionalFields with original name)
    return null;
  }

  getKnownFields(): string[] {
    return [
      "hr",
      "heart_rate",
      "cad",
      "cadence",
      "power",
      "pwr",
      "atemp",
      "temperature",
      "speed",
      "sat",
      "satellites",
      "hdop",
      "vdop",
    ];
  }
}

/**
 * Default GPX field mapper instance
 */
export const gpxFieldMapper = new GpxFieldMapper();
