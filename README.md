# Activity Viewer

Activity Viewer is a browser-based tool to **visualize and compare activity files** (GPX/FIT/TCX). Upload a few files and explore the same ride/run/hike side by side with a chart, a map, and a summary panel.

![Activity Viewer](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss)

## Quick start

1. Open the app
2. Drop GPX/FIT/TCX files onto the upload area (or browse)
3. Use the chart + map hover to inspect the same point in each activity

## Privacy

Everything is processed **locally in your browser**. Files are not uploaded to a server.

## Features

### Upload & formats

- GPX, FIT, TCX support
- Multiple file upload (drag & drop or file picker)
- Sensible distance handling (prefers device-provided distance where available, with GPS fallback)
- Extracts comprehensive metrics: GPS coordinates, elevation, heart rate, power, cadence, speed, temperature
- Calculated metrics: pace, grade (gradient), vertical speed (VAM)
- Lap extraction from TCX and FIT files (with lap statistics)
- Sport type detection (from TCX and FIT files)

### Overview

- Window-aware summary (updates with the visible chart window)
- Baseline comparison (when 2+ activities are enabled)
- Duration, distance, elevation gain/loss
- Min/avg/max for Altitude, Heart Rate, Power, Cadence, Speed, Temperature, Grade, Vertical Speed
- Pace statistics (min/avg/max)
- Lap information (count and details when available in TCX/FIT files)
- Sport type display (when available in TCX/FIT files)
- Sticky metric column for horizontal scrolling
- Only displays metrics with available data

### Chart

- **Default metric**: Altitude
- Single-metric view by default (optional multi-metric overlays with separate Y-axes)
- Views:
  - Time series (along distance/time/local time)
  - Distribution (percent-of-time curve over metric value; always at least 5 bins)
- Delta mode (overlay or delta-only, for 2+ activities)
- Data cleanup (per section):
  - outliers (drop/clamp)
  - smoothing (moving average / EMA)
  - cumulative (sum / positive-delta sum)
- Controls below the chart: zoom in/out/reset, pan left/right, optional auto-fit Y
- Axis labels are rounded to avoid floating-point noise

### Map

- Colored tracks with direction arrows
- Start/finish markers
- Hover sync with the chart (both directions)
- Overlap tooltips when routes share the same area
- Adjustable map height
- Advanced Settings below the map (GPS smoothing + window size)

### Activity management

- Hide/show activities without removing them
- Remove individual activities or clear all
- Consistent activity colors
- Optional local storage persistence (raw files saved in browser, persist across page refreshes, allows reprocessing with different settings)

### Performance

- Designed for large activities (efficient hover, memoized transforms, index-safe series)

## For developers

### Install & run

```bash
npm install
npm run dev
```

### Quality checks

```bash
npm run lint
npm run test
```

### Build / static export

```bash
npm run build
npm run generate
```

### Architecture

The application uses a modular store-based architecture with a clear data pipeline:

#### Data Pipeline

1. **Import** → Raw files are parsed and stored with original file content
2. **Process** → Data cleaning, smoothing, scaling, and derived metric calculation
3. **Transform** → Metric-specific transformations (smoothing, cumulative)
4. **Window** → Data trimming based on visible chart window
5. **Chart/Map** → Final rendering with ECharts and Leaflet

#### Store Architecture

The application uses 7 specialized Pinia stores:

- **`rawActivity`**: Stores raw file content and initially parsed records (pre-processing)
- **`activitySettings`**: Manages all user settings (outliers, GPS smoothing, scaling, offsets, comparison settings)
- **`processedActivity`**: Applies processing pipeline (outliers, GPS smoothing, scaling, derived metrics, offsets)
- **`transformedActivity`**: Applies chart transformations (currently passes through, transformations happen during chart rendering)
- **`windowActivity`**: Applies windowing/trimming based on visible chart range
- **`chartOptions`**: Manages chart display configuration (metric selection, view mode, X-axis type)
- **`chartSeries`**: Converts internal data model to ECharts-compatible format

#### Processing Pipeline Order

The processing pipeline follows a strict order:

1. **Outlier handling** (clean bad metric values)
2. **GPS distance filtering** (happens during parsing)
3. **Remove invalid records** (missing required fields, invalid GPS)
4. **GPS smoothing** (smooth GPS coordinates)
5. **Apply scaling** (Y-axis scaling per activity)
6. **Calculate derived metrics** (grade, vertical speed, pace)
7. **Apply offset** (time alignment) - LAST

#### Field Mapping System

A flexible field mapping system standardizes metric names from different file formats and providers:

- **Base mappers**: `fit-mapper`, `gpx-mapper`, `tcx-mapper`
- **Provider-specific**: `garmin-fit-mapper` (extends FIT mapper for Garmin-specific fields)
- Maps provider-specific field names (e.g., "runcadence" from Garmin) to unified field names (e.g., "cad")

#### Key Design Principles

- **Testability**: Processing logic is pure functions in `utils/`, fully unit tested
- **Separation of Concerns**: Each store has a single, clear responsibility
- **Reactivity**: Uses Vue 3 `computed` and `shallowRef` for optimal performance
- **Raw File Storage**: Raw files are saved to localStorage, not processed data, allowing reprocessing with different settings
- **Type Safety**: Full TypeScript coverage with strict types

## License

MIT
