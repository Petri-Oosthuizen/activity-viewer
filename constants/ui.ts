/**
 * UI constants for consistent styling across components
 * Centralized to avoid duplication and maintain design system
 */

/**
 * Common button classes
 */
export const BUTTON_CLASSES = {
  // Primary action buttons
  primary:
    "rounded-sm border border-primary bg-primary px-3 py-2 text-sm text-white transition-all active:bg-primary/90 sm:py-1.5 sm:hover:bg-primary/90",
  
  // Secondary action buttons
  secondary:
    "rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-all active:bg-gray-50 sm:py-1.5 sm:hover:bg-gray-50",
  
  // Danger/destructive actions
  danger:
    "rounded-sm border border-red-500 bg-white px-3 py-2 text-sm text-red-500 transition-all active:bg-red-500 active:text-white sm:py-1.5 sm:hover:bg-red-500 sm:hover:text-white",
  
  // Icon buttons
  icon: "flex touch-manipulation items-center justify-center rounded-md border-2 border-gray-300 bg-white text-gray-600 transition-all active:bg-gray-50 active:border-primary active:text-primary sm:hover:bg-gray-50 sm:hover:border-primary sm:hover:text-primary",
  
  // Zoom control buttons
  zoom: "flex touch-manipulation items-center justify-center rounded-md border-2 border-primary bg-white text-primary shadow-md transition-all active:bg-primary active:text-white active:shadow-lg sm:hover:bg-primary sm:hover:text-white sm:hover:shadow-lg",
} as const;

/**
 * Common input/form classes
 */
export const INPUT_CLASSES = {
  checkbox:
    "cursor-pointer touch-manipulation rounded-sm border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0",
  
  radio:
    "cursor-pointer touch-manipulation border-gray-300 text-primary focus:ring-primary",
  
  select:
    "w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/10 sm:px-2 sm:py-1.5",
} as const;

/**
 * Common container classes
 */
export const CONTAINER_CLASSES = {
  card: "rounded-lg bg-white p-4 shadow-xs sm:p-6",
  cardCompact: "rounded-md border border-gray-200 p-3 sm:p-3",
  section: "rounded-lg border-2 border-gray-200 bg-gray-50 p-3 sm:p-4",
} as const;

/**
 * Common size values
 */
export const SIZES = {
  // Touch-friendly button sizes
  button: {
    mobile: "h-12 w-12",
    desktop: "h-10 w-10",
  },
  icon: {
    mobile: "h-8 w-8",
    desktop: "h-7 w-7",
  },
  checkbox: {
    mobile: "h-5 w-5",
    desktop: "h-4 w-4",
  },
} as const;

/**
 * Common gap/spacing values
 */
export const SPACING = {
  gap: {
    xs: "gap-1.5 sm:gap-2",
    sm: "gap-2 sm:gap-3",
    md: "gap-3 sm:gap-4",
    lg: "gap-4 sm:gap-6 md:gap-8",
  },
  padding: {
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
  },
} as const;

/**
 * Metric display configuration
 */
export const METRIC_CONFIG = {
  hr: { icon: "❤️", label: "Heart Rate", iconYOffset: 0 },
  alt: { icon: "⛰️", label: "Altitude", iconYOffset: -2 },
  pwr: { icon: "⚡", label: "Power", iconYOffset: 0 },
  cad: { icon: "🔄", label: "Cadence", iconYOffset: 0 },
  pace: { icon: "🏃", label: "Pace", iconYOffset: 0 },
} as const;

