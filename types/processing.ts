/**
 * Processing and transformation settings types
 * Separated from activity types for better organization
 */

import type { GpsDistanceOptions } from "~/utils/gps-distance";
import type { GpsSmoothingSettings, OutlierSettings, SmoothingSettings, CumulativeSettings } from "~/utils/chart-settings";

/**
 * Settings for processing raw activities
 */
export interface ProcessingSettings {
  // Data Cleaning
  outliers: OutlierSettings;
  gpsDistance: GpsDistanceOptions; // GPS distance filtering options (minMove, maxSpeed, maxJump)
  
  // Smoothing
  gpsSmoothing: GpsSmoothingSettings;
  
  // Activity Display (applied in order: scale, then offset)
  scaling: Map<string, number>; // Y-axis scaling per activity
  offsets: Map<string, number>; // Time alignment offsets per activity (applied last)
}

/**
 * Settings for transforming processed activities
 */
export interface TransformationSettings {
  smoothing: SmoothingSettings; // Single smoothing setting for all metrics (pace, hr, alt, etc.)
  cumulative: CumulativeSettings;
}
