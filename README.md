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
- Sampling gaps per sensor (mean, min/max, p95) from the raw file, in the Full view

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

### Alignment

- Per-activity time offset
- Align by GPS: shifts each enabled activity to match the first one along the shared route
- Reset all offsets to zero

### Activity management

- Hide/show activities without removing them
- Remove individual activities or clear all
- Consistent activity colors
- Optional local storage persistence (raw files saved in browser, persist across page refreshes, allows reprocessing with different settings)
- Graceful handling when browser storage is too small for large activity sets (persistence is turned off with a user-facing message, but the current session keeps working)

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
npm run type-check
npm run test
npm run test:coverage
```

### Build / static export

```bash
npm run build
npm run generate
```

### Architecture

The application is a Nuxt 4 single-page app with a modular, store-driven data pipeline:

- `pages/index.vue` is the only route and acts as a thin composition surface
- Pinia stores hold the application state and derived data pipeline
- Parsing and metric computation live in `utils/`
- ECharts renders the chart and Leaflet renders the map
- Browser `localStorage` persists both app settings and, optionally, raw uploaded activities

#### Data Pipeline

1. **Import** → Raw files are parsed and stored with original file content
2. **Process** → Data cleaning, GPS smoothing, pace calculation, metric smoothing, scaling, and derived metric calculation
3. **Window** → Data trimming based on visible chart window
4. **Chart/Map** → Final rendering with ECharts and Leaflet

#### Store Architecture

The application uses 7 specialized Pinia stores:

- **`rawActivity`**: Stores raw file content and initially parsed records (pre-processing)
- **`activitySettings`**: Manages all user settings (outliers, GPS smoothing, scaling, offsets, comparison settings)
- **`processedActivity`**: Applies processing pipeline (outliers, GPS smoothing, scaling, derived metrics, offsets)
- **`windowActivity`**: Applies windowing/trimming based on visible chart range
- **`chartOptions`**: Manages chart display configuration (metric selection, view mode, X-axis type)
- **`chartSeries`**: Applies chart transforms such as cumulative/pivot-zone behavior and converts data to ECharts-compatible format
- **`ui`**: Holds UI-only state such as hover sync, zoom triggers, layout mode, and overview display settings

#### Processing Pipeline Order

The processing pipeline follows a strict order:

1. **Outlier handling** (clean bad metric values)
2. **GPS distance filtering** (happens during parsing)
3. **Remove invalid records** (missing required fields, invalid GPS)
4. **GPS smoothing** (smooth GPS coordinates)
5. **Calculate pace** (using smoothed GPS data when needed)
6. **Apply pace outlier handling**
7. **Apply metric smoothing** (including pace)
8. **Apply scaling** (Y-axis scaling per activity)
9. **Calculate derived metrics** (grade, vertical speed)
10. **Apply offset** (time alignment) - LAST

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

### Persistence model

- **Settings persistence** is always on and stores chart/view/processing preferences in `localStorage`
- **Activity persistence** is optional and stores uploaded raw activities in `localStorage`
- Activity persistence may be disabled automatically if the current activity set exceeds browser storage limits
- File-specific view state such as offsets, scales, disabled activities, and delta selections is cleared when activities are cleared

### Project layout

```text
components/   UI building blocks for upload, chart, map, overview, and settings
composables/  Persistence helpers and shared UI logic
stores/       Pinia stores for pipeline stages and UI state
utils/        Parsers, metrics, chart builders, formatting, and transforms
types/        Shared TypeScript types for activities and processing
tests/        Unit, store, composable, and integration coverage
public/demo/  Demo sample files and parser reference data
server/routes/ Small server endpoints such as sitemap generation
```

## License

MIT
