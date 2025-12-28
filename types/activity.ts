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
  offset: number;
  color: string;
  startTime?: Date; // Start time of the activity for local time display
}

export interface ParseResult {
  records: ActivityRecord[];
  startTime?: Date;
}

