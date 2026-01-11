export interface ActivityRecord {
  t: number;
  d: number;
  lat?: number; // Latitude
  lon?: number; // Longitude
  hr?: number;
  pwr?: number;
  alt?: number;
  cad?: number;
}

export interface Activity {
  id: string;
  name: string;
  records: ActivityRecord[];
  /** Source file format (used for format-specific processing/heuristics). */
  sourceType?: "gpx" | "fit" | "tcx";
  offset: number;
  /** Multiplicative Y scaling applied to all series for this activity. */
  scale: number;
  color: string;
  startTime?: Date; // Start time of the activity for local time display
  calories?: number; // Total calories burned during the activity
}

export interface ParseResult {
  records: ActivityRecord[];
  startTime?: Date;
  calories?: number; // Total calories from the file
}

