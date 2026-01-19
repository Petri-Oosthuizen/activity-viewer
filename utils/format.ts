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
 * Shows meters precision when the distance is less than 10km
 */
export function formatDistance(meters: number): string {
  if (meters >= 10000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(3)} km`;
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
 * Format speed (m/s to km/h)
 */
export function formatSpeed(metersPerSecond: number): string {
  const kmh = metersPerSecond * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Format temperature
 */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

/**
 * Format grade (gradient percentage)
 */
export function formatGrade(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

/**
 * Format vertical speed (m/h)
 */
export function formatVerticalSpeed(metersPerHour: number): string {
  return `${Math.round(metersPerHour)} m/h`;
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
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
    case "speed":
      return formatSpeed(value);
    case "temp":
      return formatTemperature(value);
    case "grade":
      return formatGrade(value);
    case "verticalSpeed":
      return formatVerticalSpeed(value);
    default:
      return value.toFixed(1);
  }
}

