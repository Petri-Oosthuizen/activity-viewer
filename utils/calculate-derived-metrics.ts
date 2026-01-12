import type { ActivityRecord } from "~/types/activity";

/**
 * Calculate grade (gradient) and vertical speed (VAM) for activity records
 * Grade is calculated as (elevation change / horizontal distance) * 100
 * Vertical speed (VAM) is calculated as elevation change per hour
 */
export function calculateDerivedMetrics(records: ActivityRecord[]): ActivityRecord[] {
  if (records.length === 0) return records;

  const result: ActivityRecord[] = [];
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    const newRecord = { ...record };

    if (i > 0) {
      const prev = records[i - 1]!;
      
      // Calculate grade if we have altitude and distance
      if (
        record.alt !== undefined &&
        record.alt !== null &&
        prev.alt !== undefined &&
        prev.alt !== null &&
        record.d !== undefined &&
        prev.d !== undefined
      ) {
        const elevationChange = record.alt - prev.alt;
        const horizontalDistance = record.d - prev.d;
        
        if (horizontalDistance > 0 && Number.isFinite(elevationChange) && Number.isFinite(horizontalDistance)) {
          const gradePercent = (elevationChange / horizontalDistance) * 100;
          if (Number.isFinite(gradePercent)) {
            newRecord.grade = gradePercent;
          }
        }
      }

      // Calculate vertical speed (VAM) if we have altitude and time
      if (
        record.alt !== undefined &&
        record.alt !== null &&
        prev.alt !== undefined &&
        prev.alt !== null &&
        record.t !== undefined &&
        prev.t !== undefined
      ) {
        const elevationChange = record.alt - prev.alt;
        const timeDeltaHours = (record.t - prev.t) / 3600;
        
        if (timeDeltaHours > 0 && Number.isFinite(elevationChange) && Number.isFinite(timeDeltaHours)) {
          const vam = elevationChange / timeDeltaHours;
          if (Number.isFinite(vam)) {
            newRecord.vSpeed = vam;
          }
        }
      }
    }

    result.push(newRecord);
  }

  return result;
}
