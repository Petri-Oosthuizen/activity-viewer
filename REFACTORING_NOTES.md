# Code Refactoring Summary

## Overview
This document details the refactoring improvements made to enhance code quality, reduce duplication, and improve separation of concerns across the Activity Viewer project.

## Changes Made

### 1. Extracted Formatting Utilities (`utils/format.ts`)
**Problem:** Duplicated time and distance formatting logic in:
- `stores/activity.ts` (chart tooltips)
- `components/ActivityMap.vue` (map tooltips)

**Solution:** Created centralized formatting utilities:
- `formatTime()` - Format seconds as HH:MM:SS or MM:SS
- `formatDistance()` - Format meters as km or m
- `formatAltitude()`, `formatHeartRate()`, `formatPower()`, `formatCadence()`
- `formatMetricValue()` - Format any metric value based on type

**Benefits:**
- Single source of truth for formatting logic
- Consistent formatting across all components
- Easy to update format rules in one place
- Reduced code duplication by ~50 lines

### 2. Extracted Tooltip Builders (`utils/tooltip-builder.ts`)
**Problem:** Nearly identical tooltip building logic in:
- `stores/activity.ts` (chart tooltips - ~90 lines)
- `components/ActivityMap.vue` (map tooltips - ~120 lines)

**Solution:** Created reusable tooltip builders:
- `buildPointTooltip()` - Single activity point tooltip
- `buildMultiActivityTooltip()` - Multiple overlapping activities
- `buildChartTooltip()` - Chart-specific tooltip with custom items

**Benefits:**
- Eliminated ~180 lines of duplicated code
- Consistent tooltip styling and structure
- Single place to update tooltip appearance
- Better testability with isolated functions

### 3. Extracted Chart Options Builder (`utils/chart-options.ts`)
**Problem:** Large store file (767 lines) with mixed concerns:
- State management
- ECharts configuration building (~200 lines)
- Business logic

**Solution:** Extracted ECharts configuration builders:
- `buildTooltipConfig()` - Tooltip configuration
- `buildDataZoomConfig()` - Zoom and pan controls
- `buildXAxisConfig()` - X-axis configuration
- `buildYAxisConfig()` - Y-axis configuration (multi-metric support)
- `buildGridConfig()` - Grid layout
- `formatTooltipParams()` - Tooltip parameter formatting

**Benefits:**
- Store file reduced from 767 to ~520 lines
- Clear separation: state management vs configuration
- Easier to test chart configuration independently
- Better maintainability and readability

### 4. Created UI Constants (`constants/ui.ts`)
**Problem:** Repeated class strings and configuration across components:
- Button classes duplicated in 6+ components
- Input classes repeated
- Metric configuration scattered

**Solution:** Centralized UI constants:
- `BUTTON_CLASSES` - Primary, secondary, danger, icon, zoom buttons
- `INPUT_CLASSES` - Checkbox, radio, select
- `CONTAINER_CLASSES` - Card, section layouts
- `SIZES` - Button, icon, checkbox sizes
- `SPACING` - Gap and padding values
- `METRIC_CONFIG` - Metric icons and labels

**Benefits:**
- Design system in one place
- Easy to maintain consistent styling
- Quick to update theming
- Reduced string duplication

### 5. Created Activity List Composable (`composables/useActivityList.ts`)
**Problem:** Activity management logic repeated or accessed directly:
- Direct store access in multiple components
- Helper functions duplicated (getActivityColor, etc.)

**Solution:** Created `useActivityList` composable:
- Centralized activity operations
- Helper functions for common tasks
- Cleaner component code

**Benefits:**
- Components use composable instead of direct store access
- Reusable helper functions
- Better abstraction layer
- Easier to refactor store internals

### 6. Updated Components
**Updated components to use new utilities:**
- `ActivityMap.vue` - Now uses shared tooltip builders and formatters
- `ActivityList.vue` - Now uses `useActivityList` composable
- `MetricSelector.vue` - Now uses `METRIC_CONFIG` constants
- `stores/activity.ts` - Now uses extracted chart options builders

## Code Quality Metrics

### Before Refactoring
- Store file: 767 lines
- Duplicated formatting logic: ~50 lines × 2 = 100 lines
- Duplicated tooltip logic: ~210 lines
- Total lines of concern: ~310 lines duplicated

### After Refactoring
- Store file: ~520 lines (-247 lines, -32%)
- New utility files: 
  - `format.ts`: 73 lines
  - `tooltip-builder.ts`: 136 lines
  - `chart-options.ts`: 273 lines
  - `ui.ts`: 80 lines
  - `useActivityList.ts`: 63 lines
- Total new utility lines: 625 lines
- **Net reduction in duplicated code: ~310 lines**
- **Improved code organization and maintainability**

## Architecture Improvements

### Separation of Concerns
1. **Presentation Layer** (Components)
   - Only UI logic and user interactions
   - Use composables for shared logic
   - Use constants for styling

2. **Business Logic Layer** (Store + Composables)
   - State management in store
   - Shared logic in composables
   - No UI-specific code

3. **Utility Layer** (Utils + Constants)
   - Pure functions
   - No dependencies on Vue or store
   - Easily testable

### Dependency Flow
```
Components → Composables → Store
     ↓           ↓           ↓
  Constants ← Utils ←────────┘
```

## Testing Benefits
With the refactoring, we can now easily test:
- ✅ Formatting functions in isolation
- ✅ Tooltip builders with sample data
- ✅ Chart options builders with different configs
- ✅ Activity list operations
- ✅ Constants for consistency

## Future Improvements
1. Extract delta calculation logic from store
2. Create composable for chart interactions
3. Extract file parsing utilities to separate package
4. Add unit tests for new utilities
5. Consider creating a theme system using constants

## Migration Notes
No breaking changes were introduced:
- All components maintain the same external API
- Store public interface unchanged
- Only internal implementation refactored

