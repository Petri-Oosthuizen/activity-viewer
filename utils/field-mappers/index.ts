/**
 * Field mapper utilities
 * Provides convenient access to field mappers for different file formats
 */

import { fitFieldMapper } from "./fit-mapper";
import { garminFitFieldMapper } from "./garmin-fit-mapper";
import { gpxFieldMapper } from "./gpx-mapper";
import { tcxFieldMapper } from "./tcx-mapper";
import type { FieldMapper, FieldMappingContext } from "./types";

/**
 * Get the appropriate field mapper for a file format
 * @param sourceType File format type
 * @param provider Optional provider name (e.g., "garmin")
 * @returns Field mapper instance
 */
export function getFieldMapper(sourceType: "gpx" | "fit" | "tcx", provider?: string): FieldMapper {
  if (sourceType === "fit") {
    // Use Garmin mapper for FIT files (can be extended to detect provider)
    if (provider?.toLowerCase() === "garmin") {
      return garminFitFieldMapper;
    }
    // Default to Garmin mapper for FIT (most common provider)
    // In the future, we could detect provider from file metadata
    return garminFitFieldMapper;
  }

  if (sourceType === "gpx") {
    return gpxFieldMapper;
  }

  if (sourceType === "tcx") {
    return tcxFieldMapper;
  }

  // Fallback to FIT mapper (shouldn't happen with TypeScript, but for safety)
  return fitFieldMapper;
}

/**
 * Apply field mapping to a record's additional fields
 * Maps provider-specific field names to unified field names
 * @param mapper Field mapper to use
 * @param sourceFields Source fields from file
 * @param context Optional context
 * @returns Object with unified fields and remaining additional fields
 */
export function applyFieldMapping(
  mapper: FieldMapper,
  sourceFields: Record<string, number>,
  context?: FieldMappingContext,
): {
  unifiedFields: Partial<Record<keyof import("~/types/activity").ActivityRecord, number>>;
  additionalFields: Record<string, number>;
} {
  const unifiedFields: Partial<Record<keyof import("~/types/activity").ActivityRecord, number>> = {};
  const additionalFields: Record<string, number> = {};

  for (const [sourceFieldName, value] of Object.entries(sourceFields)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }

    const mapping = mapper.mapField(sourceFieldName, value, context);

    if (!mapping) {
      // Field not recognized - keep as additional field with original name
      additionalFields[sourceFieldName] = value;
      continue;
    }

    if (mapping.unifiedField) {
      // Map to unified field
      unifiedFields[mapping.unifiedField] = mapping.value;
    } else if (mapping.additionalField) {
      // Map to standardized additional field name
      additionalFields[mapping.additionalField] = mapping.value;
    } else {
      // Keep original name if no mapping specified
      additionalFields[sourceFieldName] = mapping.value;
    }
  }

  return { unifiedFields, additionalFields };
}
