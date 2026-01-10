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

### Overview

- Window-aware summary (updates with the visible chart window)
- Baseline comparison (when 2+ activities are enabled)
- Duration, distance, elevation gain
- Min/avg/max for Altitude, Heart Rate, Power, Cadence
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
- Optional local storage persistence (activities saved in browser, persist across page refreshes)

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

## License

MIT
