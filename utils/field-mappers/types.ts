/**
 * Field mapper types and interfaces
 * Used to map provider-specific field names to unified field names
 */

import type { ActivityRecord } from "~/types/activity";

/**
 * Result of mapping a field
 */
export interface FieldMapping {
  /** Unified field name in ActivityRecord (e.g., 'cad', 'hr', 'pwr') */
  unifiedField?: keyof ActivityRecord;
  /** Or keep as additional field with standardized name */
  additionalField?: string;
  /** Transformed value (if needed) */
  value: number;
}

/**
 * Context passed to field mapper (optional metadata)
 */
export interface FieldMappingContext {
  /** Source file format */
  sourceType?: "gpx" | "fit" | "tcx";
  /** Provider name (e.g., "garmin", "strava") */
  provider?: string;
  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Interface for field mappers
 * Each file format/provider has its own mapper
 */
export interface FieldMapper {
  /**
   * Map a source field name to a unified field name
   * @param sourceFieldName Original field name from source file
   * @param value Field value
   * @param context Optional context (format, provider, etc.)
   * @returns FieldMapping if field should be mapped, null if field should be ignored
   */
  mapField(
    sourceFieldName: string,
    value: number,
    context?: FieldMappingContext,
  ): FieldMapping | null;

  /**
   * Get list of field names this mapper recognizes
   * Used for documentation and validation
   */
  getKnownFields(): string[];
}
