export interface ActivityRecord {
  t: number;
  d: number;
  lat?: number; // Latitude
  lon?: number; // Longitude
  hr?: number;
  pwr?: number;
  alt?: number;
  cad?: number;
  speed?: number; // Speed in m/s
  temp?: number; // Temperature in Celsius
  grade?: number; // Grade/gradient as percentage
  verticalSpeed?: number; // Vertical speed (VAM) in m/h
  pace?: number; // Pace in min/km
  /** Additional numeric fields extracted from file formats (running dynamics, GPS accuracy, etc.) */
  additionalFields?: Record<string, number>;
}

export interface Lap {
  startTime: Date;
  startRecordIndex: number; // Index of first record in this lap
  endRecordIndex: number; // Index of last record in this lap (inclusive)
  totalTimeSeconds?: number;
  distanceMeters?: number;
  calories?: number;
  averageHeartRateBpm?: number;
  maximumHeartRateBpm?: number;
  averageCadence?: number;
  maximumCadence?: number;
  averageSpeed?: number; // m/s
  maximumSpeed?: number; // m/s
  intensity?: "Active" | "Resting";
  triggerMethod?: string;
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
  sport?: string; // Sport type (e.g., "Biking", "Running", "Swimming")
  laps?: Lap[]; // Lap data if available
}

export interface ParseResult {
  records: ActivityRecord[];
  startTime?: Date;
  calories?: number; // Total calories from the file
  sport?: string; // Sport type
  laps?: Lap[]; // Lap data if available
}

/**
 * Raw activity data before processing
 * Stores the original file content and parsed records
 */
export interface RawActivity {
  id: string;
  name: string;
  sourceType: "gpx" | "fit" | "tcx";
  fileContent?: Blob | string; // Raw file content for storage/reprocessing
  records: ActivityRecord[]; // Parsed, unprocessed records (with unified field names)
  metadata: {
    startTime?: Date;
    calories?: number;
    sport?: string;
    laps?: Lap[];
  };
  additionalFields?: Record<string, number>; // Fields we don't support yet (standardized names)
}

