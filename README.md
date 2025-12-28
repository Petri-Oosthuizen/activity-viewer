# Activity Viewer

A zero-backend, privacy-focused web application for comparing GPX, FIT, and TCX activity files side by side. All processing occurs client-side in the browser—your data never leaves your device.

![Activity Viewer](https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxt.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss)

## Features

### Core Functionality

- **Format Support**: Parses GPX (XML), FIT (binary), and TCX (XML) files
- **Multi-Activity Comparison**: Overlay multiple activities on a single interactive chart
- **GPS Map Integration**: Interactive Leaflet map with synchronized hover highlighting
- **Real-time Offset Control**: Adjust time offsets to align activities temporally
- **Static Deployment**: Runs entirely client-side, deployable to any static host

### Chart Capabilities

- **Multiple Metrics**: Select multiple metrics (Heart Rate, Power, Altitude, Cadence) simultaneously, each on its own Y-axis
- **Three X-Axis Modes**: Elapsed Time, Distance, or Local Time (actual clock time from activity start)
- **Delta Comparison**: Visualize differences between two activities with overlay or delta-only display modes
- **Interactive Zoom & Pan**: Mouse wheel zoom, drag to pan, zoom buttons, and slider range selector
- **Smart Tooltips**: Shows values for all activities at the hovered position with color-coded indicators
- **Layout Toggle**: Switch between stacked (vertical) and side-by-side layouts for chart and map
- **Advanced Settings**: Collapsible section for X-axis type, delta mode, and activity selection

### Map Integration

- **Bidirectional Sync**: Hover on chart highlights corresponding point on map; hover on map highlights chart position
- **Adaptive Detection**: Hover snapping adjusts based on zoom level for accurate point detection
- **Multi-Track Display**: Each activity rendered with its assigned color and directional arrows
- **Multi-Activity Tooltips**: When routes overlap, shows data for all activities at the hovered location
- **Height Control**: Adjustable map height (300px-800px) with intuitive minimize/maximize buttons
- **Start/End Markers**: Visual indicators for activity start (play icon) and finish (stop icon) with tooltips

### Activity Management

- **Drag-and-Drop Upload**: Single or multiple files (hold Ctrl/Cmd for multiple selection); compact mode when activities loaded
- **Toggle Visibility**: Hide individual activities without removing them from the list
- **Smart Truncation**: Long filenames truncated with middle ellipsis, responsive to screen size
- **Data Point Count**: Shows total number of data points for each activity in the list
- **Consistent Colors**: Activities maintain consistent colors based on their position in the list
- **Metric Indicators**: Colored dots show which activities have data for each selected metric

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Framework | **Nuxt 3** (Vue.js SPA mode)            |
| State     | **Pinia** with shallow reactivity       |
| Charts    | **ECharts** (optimized for 50k+ points) |
| Maps      | **Leaflet.js** with OpenStreetMap       |
| Styling   | **Tailwind CSS**                        |
| Language  | **TypeScript**                          |
| Utilities | **VueUse**                              |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Generate static site
npm run generate

# Run tests
npm run test
```

## Usage

1. **Upload**: Drag and drop GPX/FIT/TCX files or click anywhere in the upload area to browse (hold Ctrl/Cmd to select multiple files)
2. **View**: Activities appear as colored lines on the chart with corresponding tracks on the map
3. **Select Metrics**: Use checkboxes to select which metrics to display (Heart Rate, Altitude, Power, Cadence)
4. **Configure Layout**: Toggle between stacked and side-by-side layouts using the button above the chart
5. **Align Activities**: Use time offset controls to align activities temporally (removed from individual items, now in Advanced Settings)
6. **Explore**: Hover over chart to see values; corresponding point highlights on map (and vice versa)
7. **Compare**: Enable delta mode in Advanced Settings to visualize differences between two activities
8. **Manage**: Toggle activity visibility or remove activities as needed
9. **Adjust Map**: Use height controls to resize the map for better viewing

## Architecture

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│ GPX/FIT/TCX │────▶│ Parser       │────▶│ Pinia Store │────▶│ ECharts +   │
│ File Input  │     │ (normalize)  │     │ (reactive)  │     │ Leaflet Map │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
```

### Normalized Data Structure

```typescript
interface ActivityRecord {
  t: number; // Elapsed time (seconds)
  d: number; // Cumulative distance (meters)
  lat?: number; // Latitude (degrees)
  lon?: number; // Longitude (degrees)
  hr?: number; // Heart rate (bpm)
  pwr?: number; // Power (watts)
  alt?: number; // Altitude (meters)
  cad?: number; // Cadence (rpm)
}
```

### Key Design Decisions

- **Shallow Reactivity**: `shallowRef` prevents deep observation of large arrays for performance
- **ECharts Large Mode**: `large: true` with `largeThreshold: 2000` for dense datasets (50k+ points)
- **Computed Transforms**: Offsets and axis conversions applied in computed properties
- **Event-Based Sync**: `updateAxisPointer` event for reliable chart-map bidirectional synchronization
- **ResizeObserver**: Automatic chart and map resizing when layout changes (side-by-side ↔ stacked)
- **Utility Extraction**: Chart configuration logic in `utils/chart-config.ts` for maintainability
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints and touch-friendly controls
- **Color Consistency**: Index-based color assignment ensures activities maintain colors across operations

## Project Structure

```
├── components/
│   ├── ActivityChart.vue         # ECharts chart with zoom controls and metric selector
│   ├── ActivityItem.vue          # Activity row with toggle, remove, and data point count
│   ├── ActivityList.vue          # Activity list container with uploader
│   ├── ActivityMap.vue           # Leaflet GPS map with hover sync and height controls
│   ├── AxisTypeSelector.vue      # X-axis mode toggle (Time/Distance/Local Time)
│   ├── ChartAdvancedSettings.vue # Collapsible advanced settings (X-axis, delta mode)
│   ├── MetricSelector.vue        # Y-axis metric checkboxes with activity indicators
│   ├── TimeOffsetControl.vue     # Time offset adjustment buttons (deprecated in items)
│   └── Uploader.vue              # Drag-and-drop file upload with compact mode
├── composables/
│   ├── useECharts.ts          # Chart lifecycle management
│   └── useResponsiveTruncate.ts
├── stores/
│   └── activity.ts            # Pinia store
├── utils/
│   ├── chart-config.ts        # Chart configuration utilities
│   ├── gpx-parser.ts          # GPX XML parser
│   ├── fit-parser.ts          # FIT binary parser
│   ├── tcx-parser.ts          # TCX XML parser
│   ├── file-detector.ts       # File type detection
│   └── text-truncate.ts       # Smart ellipsis truncation
├── types/
│   └── activity.ts            # TypeScript interfaces
└── tests/                     # Vitest test files
```

## Deployment

### GitHub Pages

```bash
npm run generate
# Deploy dist/ to gh-pages branch
```

Or use GitHub Actions (`.github/workflows/deploy.yml`) for automatic deployment.

### Configuration

Adjust `app.baseURL` in `nuxt.config.ts` for custom deployment paths.

## License

MIT
