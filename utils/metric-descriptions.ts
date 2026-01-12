/**
 * Human-readable descriptions for metrics displayed in the overview panel
 */

export const METRIC_DESCRIPTIONS: Record<string, string> = {
  Duration: "Total time elapsed from start to finish of the activity",
  Distance: "Total distance covered during the activity",
  Calories: "Estimated total calories burned during the activity",
  "Elevation gain": "Total elevation gained (sum of all upward elevation changes)",
  "Elevation lost": "Total elevation lost (sum of all downward elevation changes)",
  "Heart Rate": "Heart rate measured in beats per minute (bpm)",
  Altitude: "Elevation above sea level in meters",
  Power: "Cycling power output in watts (W)",
  Cadence: "Pedaling or running cadence in revolutions/steps per minute (rpm/spm)",
  Pace: "Pace calculated as minutes per kilometer (min/km)",
  Speed: "Speed measured in kilometers per hour (km/h)",
  Temperature: "Ambient temperature in degrees Celsius (°C)",
  Grade: "Gradient/slope calculated as percentage of elevation change over horizontal distance",
  "Vertical Speed": "Vertical ascent rate (VAM - Vertical Ascent Meters) in meters per hour",
  Laps: "Lap segments within the activity with individual statistics",
};
