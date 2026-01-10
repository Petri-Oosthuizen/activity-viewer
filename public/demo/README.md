# Demo Activity Files

This directory contains demo/test files for testing the activity parsers and calculations.

## Available Files

- **demo-activity.gpx** - GPX format demo file with comprehensive test data
- **demo-activity.tcx** - TCX format demo file with comprehensive test data

## File Contents

Both files contain equivalent data with:
- **10 track points** from San Francisco area (37.77°N, -122.42°W)
- **Time range**: 45 seconds (8:00:00 to 8:00:45 UTC)
- **Metrics included**:
  - Heart Rate (HR): 120-165 bpm (increasing)
  - Power: 200-290 W (increasing)
  - Cadence: 85-108 rpm (increasing)
  - Altitude: 10-32 m (increasing)
  - Distance: Calculated/GPS-based (GPX) or device-provided (TCX)

## Expected Stats

When parsed, these files should produce:
- **Duration**: ~45 seconds
- **Distance**: ~1.26 km (for TCX) or GPS-calculated (for GPX)
- **Elevation gain**: ~22 m
- **HR**: min 120 / avg ~142.5 / max 165 bpm
- **Power**: min 200 / avg ~245 / max 290 W
- **Cadence**: min 85 / avg ~96.2 / max 108 rpm
- **Altitude**: min 10 / avg ~21 / max 32 m

## FIT Files

FIT files are binary format and require a FIT file writer library to generate programmatically. For testing FIT file parsing, you can:
1. Use any existing FIT file from a Garmin/Wahoo device
2. Generate a FIT file using tools like `gpsbabel` or FIT file libraries
3. Convert GPX/TCX to FIT using conversion tools

The parsers expect FIT files to contain similar data fields: timestamp, position (lat/lon), altitude, heart_rate, power, cadence, and distance.
