/**
 * Formatting utilities for time, distance, and other display values
 * Centralized to avoid duplication across components
 */

/**
 * Format seconds as HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format distance as km or m
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format altitude in meters
 */
export function formatAltitude(meters: number): string {
  return `${Math.round(meters)} m`;
}

/**
 * Format heart rate
 */
export function formatHeartRate(bpm: number): string {
  return `${Math.round(bpm)} bpm`;
}

/**
 * Format power
 */
export function formatPower(watts: number): string {
  return `${Math.round(watts)} W`;
}

/**
 * Format cadence
 */
export function formatCadence(rpm: number): string {
  return `${Math.round(rpm)} rpm`;
}

/**
 * Format pace (min/km)
 */
export function formatPace(minPerKm: number): string {
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")} min/km`;
  }
  return `${seconds} min/km`;
}

/**
 * Format metric value based on type
 */
export function formatMetricValue(value: number, metricType: string): string {
  switch (metricType) {
    case "hr":
      return formatHeartRate(value);
    case "pwr":
      return formatPower(value);
    case "alt":
      return formatAltitude(value);
    case "cad":
      return formatCadence(value);
    case "pace":
      return formatPace(value);
    default:
      return value.toFixed(1);
  }
}

