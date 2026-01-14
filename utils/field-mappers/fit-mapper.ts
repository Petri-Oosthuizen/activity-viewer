/**
 * Field mapper for FIT files
 * Maps FIT-specific field names to unified ActivityRecord field names
 */

import type { FieldMapper, FieldMapping, FieldMappingContext } from "./types";

/**
 * Base FIT field mapper
 * Handles standard FIT fields and common variations
 */
export class FitFieldMapper implements FieldMapper {
  mapField(sourceFieldName: string, value: number, context?: FieldMappingContext): FieldMapping | null {
    const normalized = sourceFieldName.toLowerCase().replace(/[_-]/g, "");

    // Heart rate mappings
    if (
      normalized === "heartrate" ||
      normalized === "heart_rate" ||
      normalized === "hr" ||
      normalized === "heartratebpm" ||
      normalized === "heart_rate_bpm"
    ) {
      return { unifiedField: "hr", value };
    }

    // Cadence mappings (general cadence - may be overridden by provider-specific mappers)
    if (
      normalized === "cadence" ||
      normalized === "cad" ||
      normalized === "cyclingcadence" ||
      normalized === "cycling_cadence"
    ) {
      return { unifiedField: "cad", value };
    }

    // Power mappings
    if (
      normalized === "power" ||
      normalized === "pwr" ||
      normalized === "watts" ||
      normalized === "powerwatts" ||
      normalized === "power_watts"
    ) {
      return { unifiedField: "pwr", value };
    }

    // Altitude mappings
    if (
      normalized === "altitude" ||
      normalized === "alt" ||
      normalized === "elevation" ||
      normalized === "enhancedaltitude" ||
      normalized === "enhanced_altitude"
    ) {
      return { unifiedField: "alt", value };
    }

    // Speed mappings
    if (
      normalized === "speed" ||
      normalized === "velocity" ||
      normalized === "enhancedspeed" ||
      normalized === "enhanced_speed"
    ) {
      return { unifiedField: "speed", value };
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

    // Distance mappings (usually handled during parsing, but keep for reference)
    if (
      normalized === "distance" ||
      normalized === "dist" ||
      normalized === "cumulativedistance" ||
      normalized === "cumulative_distance"
    ) {
      // Distance is typically calculated, not directly mapped
      return null;
    }

    // Ignore internal/timestamp fields
    if (
      normalized === "timestamp" ||
      normalized === "time" ||
      normalized === "timecreated" ||
      normalized === "time_created"
    ) {
      return null;
    }

    // Unknown field - return null (will be added to additionalFields with original name)
    return null;
  }

  getKnownFields(): string[] {
    return [
      "heart_rate",
      "heartRate",
      "hr",
      "cadence",
      "cad",
      "power",
      "pwr",
      "watts",
      "altitude",
      "alt",
      "elevation",
      "speed",
      "velocity",
      "temperature",
      "temp",
      "distance",
      "timestamp",
    ];
  }
}

/**
 * Default FIT field mapper instance
 */
export const fitFieldMapper = new FitFieldMapper();
