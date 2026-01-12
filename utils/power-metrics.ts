/**
 * Calculate specialized power metrics for cycling activities
 */

import type { ActivityRecord } from "~/types/activity";

/**
 * Calculate best average power over a time window (sliding window)
 * @param records Activity records with power data
 * @param windowSeconds Time window in seconds
 * @returns Best average power in watts, or null if insufficient data
 */
export function calculateBestTimePower(
  records: ActivityRecord[],
  windowSeconds: number,
): number | null {
  if (records.length < 2 || windowSeconds <= 0) return null;

  const powerValues: Array<{ power: number; time: number }> = [];
  for (const record of records) {
    if (record.pwr !== undefined && record.pwr !== null && Number.isFinite(record.pwr)) {
      powerValues.push({ power: record.pwr, time: record.t });
    }
  }

  if (powerValues.length < 2) return null;

  let bestAvgPower: number | null = null;

  // Use sliding window to find best average power
  for (let startIdx = 0; startIdx < powerValues.length; startIdx++) {
    const startTime = powerValues[startIdx]!.time;
    const endTime = startTime + windowSeconds;

    let sum = 0;
    let count = 0;

    // Collect all power values within the time window
    for (let i = startIdx; i < powerValues.length; i++) {
      const point = powerValues[i];
      if (!point) break;
      if (point.time > endTime) break;

      sum += point.power;
      count++;
    }

    if (count > 0) {
      const avgPower = sum / count;
      if (bestAvgPower === null || avgPower > bestAvgPower) {
        bestAvgPower = avgPower;
      }
    }
  }

  return bestAvgPower;
}

/**
 * Calculate Normalized Power (NP) - a weighted average that gives more weight to higher power outputs
 * Algorithm: 30-second rolling averages, raise to 4th power, average, then take 4th root
 * @param records Activity records with power data
 * @returns Normalized Power in watts, or null if insufficient data
 */
export function calculateNormalizedPower(records: ActivityRecord[]): number | null {
  if (records.length < 2) return null;

  const powerValues: Array<{ power: number; time: number }> = [];
  for (const record of records) {
    if (record.pwr !== undefined && record.pwr !== null && Number.isFinite(record.pwr)) {
      powerValues.push({ power: record.pwr, time: record.t });
    }
  }

  if (powerValues.length < 2) return null;

  // Calculate 30-second rolling averages
  const rollingAverages: number[] = [];
  const windowSeconds = 30;

  for (let i = 0; i < powerValues.length; i++) {
    const startTime = powerValues[i]!.time;
    const endTime = startTime + windowSeconds;

    let sum = 0;
    let count = 0;

    for (let j = i; j < powerValues.length; j++) {
      const point = powerValues[j];
      if (!point) break;
      if (point.time > endTime) break;

      sum += point.power;
      count++;
    }

    if (count > 0) {
      rollingAverages.push(sum / count);
    }
  }

  if (rollingAverages.length === 0) return null;

  // Raise each rolling average to the 4th power
  const fourthPowers = rollingAverages.map((avg) => Math.pow(avg, 4));

  // Calculate average of fourth powers
  const sumFourthPowers = fourthPowers.reduce((sum, val) => sum + val, 0);
  const avgFourthPower = sumFourthPowers / fourthPowers.length;

  // Take the 4th root
  const normalizedPower = Math.pow(avgFourthPower, 1 / 4);

  return Number.isFinite(normalizedPower) && normalizedPower > 0 ? normalizedPower : null;
}
