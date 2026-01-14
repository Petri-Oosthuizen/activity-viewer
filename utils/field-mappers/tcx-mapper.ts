/**
 * Field mapper for TCX files
 * Maps TCX field names to unified ActivityRecord field names
 */

import type { FieldMapper, FieldMapping, FieldMappingContext } from "./types";

/**
 * TCX field mapper
 * Handles TCX standard fields and extension fields
 */
export class TcxFieldMapper implements FieldMapper {
  mapField(sourceFieldName: string, value: number, context?: FieldMappingContext): FieldMapping | null {
    const normalized = sourceFieldName.toLowerCase().replace(/[_-]/g, "");

    // Heart rate mappings (TCX uses HeartRateBpm/Value)
    if (
      normalized === "heartrate" ||
      normalized === "heart_rate" ||
      normalized === "heartratebpm" ||
      normalized === "heart_rate_bpm" ||
      normalized === "hr" ||
      normalized === "bpm"
    ) {
      return { unifiedField: "hr", value };
    }

    // Cadence mappings
    if (
      normalized === "cadence" ||
      normalized === "cad" ||
      normalized === "runcadence" ||
      normalized === "runningcadence"
    ) {
      return { unifiedField: "cad", value };
    }

    // Power mappings (TCX extensions)
    if (
      normalized === "power" ||
      normalized === "pwr" ||
      normalized === "watts" ||
      normalized === "powerwatts" ||
      normalized === "wattsavg" ||
      normalized === "watts_avg"
    ) {
      return { unifiedField: "pwr", value };
    }

    // Temperature mappings
    if (
      normalized === "temperature" ||
      normalized === "temp" ||
      normalized === "temperaturecelsius" ||
      normalized === "temperature_celsius"
    ) {
      return { unifiedField: "temp", value };
    }

    // Speed mappings (TCX uses Speed element)
    if (
      normalized === "speed" ||
      normalized === "velocity" ||
      normalized === "speedms" ||
      normalized === "speed_ms"
    ) {
      return { unifiedField: "speed", value };
    }

    // Ignore standard TCX fields that are handled separately
    if (
      normalized === "latitude" ||
      normalized === "latitudedegrees" ||
      normalized === "longitude" ||
      normalized === "longitudedegrees" ||
      normalized === "altitudemeters" ||
      normalized === "altitude" ||
      normalized === "distancemeters" ||
      normalized === "distance" ||
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
      "heart_rate",
      "heartRateBpm",
      "hr",
      "cadence",
      "cad",
      "power",
      "pwr",
      "watts",
      "temperature",
      "temp",
      "speed",
    ];
  }
}

/**
 * Default TCX field mapper instance
 */
export const tcxFieldMapper = new TcxFieldMapper();
