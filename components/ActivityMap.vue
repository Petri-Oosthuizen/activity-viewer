<template>
  <div v-if="hasGpsData" class="flex w-full flex-col rounded-lg bg-white p-4 shadow-xs sm:p-6">
    <div class="shrink-0 mb-3 flex items-center justify-between sm:mb-4">
      <h3 class="m-0 text-base font-semibold text-gray-800 sm:text-lg">GPS Map</h3>
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          class="flex h-8 w-8 touch-manipulation items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-all active:bg-gray-50 active:border-primary active:text-primary disabled:opacity-50 disabled:cursor-not-allowed sm:h-7 sm:w-7 sm:hover:bg-gray-50 sm:hover:border-primary sm:hover:text-primary sm:disabled:hover:bg-white sm:disabled:hover:border-gray-300 sm:disabled:hover:text-gray-600"
          @click="decreaseHeight"
          :title="currentHeightIndex <= 0 ? 'Map is at minimum height' : 'Decrease map height'"
          aria-label="Decrease map height"
          :disabled="currentHeightIndex <= 0"
        >
          <svg class="h-4 w-4 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <!-- Minimize icon: two horizontal lines -->
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
        <button
          type="button"
          class="flex h-8 w-8 touch-manipulation items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-all active:bg-gray-50 active:border-primary active:text-primary disabled:opacity-50 disabled:cursor-not-allowed sm:h-7 sm:w-7 sm:hover:bg-gray-50 sm:hover:border-primary sm:hover:text-primary sm:disabled:hover:bg-white sm:disabled:hover:border-gray-300 sm:disabled:hover:text-gray-600"
          @click="increaseHeight"
          :title="currentHeightIndex >= heightSteps.length - 1 ? 'Map is at maximum height' : 'Increase map height'"
          aria-label="Increase map height"
          :disabled="currentHeightIndex >= heightSteps.length - 1"
        >
          <svg class="h-4 w-4 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <!-- Maximize/fullscreen icon: expanding box -->
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
          </svg>
        </button>
      </div>
    </div>
    <div
      ref="mapContainer"
      class="w-full rounded-sm border border-gray-200 transition-all"
      :style="{ height: mapHeight }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import { useActivityStore } from "~/stores/activity";
import type { Activity, ActivityRecord } from "~/types/activity";
import { buildPointTooltip, buildMultiActivityTooltip } from "~/utils/tooltip-builder";
import { formatTime, formatDistance } from "~/utils/format";

let L: typeof import("leaflet") | null = null;

// Map height control
const mapHeight = ref("400px");
const heightSteps = ["300px", "400px", "500px", "600px", "700px", "800px"];
const currentHeightIndex = ref(1); // Start at 400px

const increaseHeight = () => {
  if (currentHeightIndex.value < heightSteps.length - 1) {
    currentHeightIndex.value++;
    mapHeight.value = heightSteps[currentHeightIndex.value];
    nextTick(() => {
      if (map) {
        map.invalidateSize();
      }
    });
  }
};

const decreaseHeight = () => {
  if (currentHeightIndex.value > 0) {
    currentHeightIndex.value--;
    mapHeight.value = heightSteps[currentHeightIndex.value];
    nextTick(() => {
      if (map) {
        map.invalidateSize();
      }
    });
  }
};

const mapContainer = ref<HTMLDivElement | null>(null);
let map: any = null;
let layers: any[] = [];
let markers: any[] = [];
let hoverMarker: any = null;
let nearbyActivities: Array<{ activity: Activity; record: ActivityRecord }> = [];

const activityStore = useActivityStore();

const activities = computed(() => activityStore.activities);
const hoveredPoint = computed(() => activityStore.mapHoveredPoint);

// Flat list of all GPS points from all activities for efficient hover detection
let allTrackPoints: Array<{
  lat: number;
  lon: number;
  recordIndex: number;
  activityId: string;
}> = [];

// Check if any active (non-disabled) activity has GPS data
const hasGpsData = computed(() => {
  if (!activities.value || activities.value.length === 0) return false;
  
  // Check each activity
  for (const activity of activities.value) {
    // Skip disabled activities
    if (activityStore.isActivityDisabled(activity.id)) continue;
    
    // Check if this activity has any GPS data
    const hasGps = activity.records.some(
      (record) => record.lat !== undefined && record.lon !== undefined
    );
    
    if (hasGps) return true;
  }
  
  return false;
});

/** Calculate bearing (direction) between two points in degrees */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360
  return bearing;
}

const initMap = async () => {
  if (!mapContainer.value || map || !process.client) return;

  if (!L) {
    L = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    
    // Fix Leaflet default icon issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }

  map = L.map(mapContainer.value, {
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  // Add map-wide hover handler to snap to nearest point
  map.on("mousemove", (e) => {
    handleMapHover(e.latlng);
  });

  map.on("mouseout", () => {
    activityStore.clearMapHoverPoint();
    nearbyActivities = [];
    updateHoverMarker();
  });

  updateMap();
};

const handleMapHover = (latlng: any) => {
  // Find all nearby GPS points within threshold for overlapping routes
  if (!map || allTrackPoints.length === 0) {
    nearbyActivities = [];
    updateHoverMarker();
    return;
  }

  // Adaptive threshold: tighter at higher zoom levels to avoid false matches
  const zoom = map.getZoom();
  const threshold = zoom > 15 ? 50 : zoom > 12 ? 200 : zoom > 10 ? 500 : 1000; // meters

  // Find all points within threshold (for overlapping routes)
  const nearbyPoints: Array<{
    point: typeof allTrackPoints[0];
    distance: number;
  }> = [];

  allTrackPoints.forEach((point) => {
    const distance = map?.distance(latlng, L?.latLng(point.lat, point.lon)) || Infinity;
    if (distance < threshold) {
      nearbyPoints.push({ point, distance });
    }
  });

  // Collect all nearby activities with their records
  nearbyActivities = [];
  const seenActivityIds = new Set<string>();

  nearbyPoints
    .sort((a, b) => a.distance - b.distance)
    .forEach(({ point }) => {
      // Only add each activity once (use closest point per activity)
      if (!seenActivityIds.has(point.activityId)) {
        const activity = activities.value.find((a) => a.id === point.activityId);
        if (activity && activity.records[point.recordIndex]) {
          const record = activity.records[point.recordIndex];
          if (record.lat !== undefined && record.lon !== undefined) {
            nearbyActivities.push({ activity, record });
            seenActivityIds.add(point.activityId);
          }
        }
      }
    });

  // Update store to trigger chart highlight (use nearest for chart sync)
  if (nearbyPoints.length > 0) {
    const nearestPoint = nearbyPoints[0].point;
    const activity = activities.value.find((a) => a.id === nearestPoint.activityId);
    if (activity && activity.records[nearestPoint.recordIndex]) {
      const record = activity.records[nearestPoint.recordIndex];
      activityStore.setMapHoverPoint({
        activityId: activity.id,
        recordIndex: nearestPoint.recordIndex,
        lat: record.lat!,
        lon: record.lon!,
      });
    }
  } else {
    activityStore.clearMapHoverPoint();
  }

  updateHoverMarker();
};

const updateMap = () => {
  if (!map || !L) return;

  // Clear existing layers
  layers.forEach((layer) => map?.removeLayer(layer));
  markers.forEach((marker) => map?.removeLayer(marker));
  layers = [];
  markers = [];
  allTrackPoints = [];

  const allBounds: any[] = [];

  activities.value.forEach((activity) => {
    // Skip disabled activities
    if (activityStore.isActivityDisabled(activity.id)) return;

    const points: any[] = [];
    const validPoints: Array<{ lat: number; lon: number; recordIndex: number }> = [];

    activity.records.forEach((record, index) => {
      if (record.lat !== undefined && record.lon !== undefined) {
        const latlng = L!.latLng(record.lat, record.lon);
        points.push(latlng);
        validPoints.push({ lat: record.lat, lon: record.lon, recordIndex: index });
      }
    });

    if (points.length > 0) {
      const polyline = L!.polyline(points, {
        color: activity.color,
        weight: 3,
        opacity: 0.8,
      });

      // Don't bind tooltip to polyline - use map-wide hover detection instead
      // This allows showing multiple activities when routes overlap
      // Add mouseover handler to trigger multi-activity detection even when hovering on polyline
      polyline.on("mouseover", (e) => {
        if (e.latlng) {
          handleMapHover(e.latlng);
        }
      });

      // Build flat list of all GPS points for efficient hover detection
      // This enables map-wide hover (not just on polylines) to sync with chart
      validPoints.forEach((point) => {
        allTrackPoints.push({
          lat: point.lat,
          lon: point.lon,
          recordIndex: point.recordIndex,
          activityId: activity.id,
        });
      });

      polyline.addTo(map!);
      layers.push(polyline);

      // Add directional arrows along the track to show direction of travel
      if (points.length > 1) {
        // Calculate interval: show ~3-8 arrows per track (fewer for cleaner look)
        const arrowCount = Math.min(8, Math.max(3, Math.floor(points.length / 50)));
        const arrowInterval = Math.max(1, Math.floor(points.length / arrowCount));

        for (let i = arrowInterval; i < points.length - 1; i += arrowInterval) {
          const currentPoint = points[i];
          const nextPoint = points[i + 1];

          // Calculate bearing (direction) from current to next point
          const bearing = calculateBearing(
            currentPoint.lat,
            currentPoint.lng,
            nextPoint.lat,
            nextPoint.lng
          );

          // Create directional arrow marker using SVG for proper rotation
          const arrowMarker = L!.marker(currentPoint, {
            icon: L!.divIcon({
              className: "direction-arrow",
              html: `
                <svg width="14" height="14" viewBox="0 0 14 14" style="transform: rotate(${bearing}deg); transform-origin: 7px 7px;">
                  <path
                    d="M 7 1 L 11 11 L 7 9 L 3 11 Z"
                    fill="${activity.color}"
                    stroke="white"
                    stroke-width="0.8"
                    opacity="0.9"
                  />
                </svg>
              `,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            }),
          });

          arrowMarker.addTo(map!);
          markers.push(arrowMarker);
        }
      }

      // Add start and end markers with tooltips
      if (points.length > 0) {
        // Start marker with play icon
        const startMarker = L!.marker(points[0], {
          icon: L!.divIcon({
            className: "custom-marker",
            html: `
              <div style="width: 14px; height: 14px; background-color: ${activity.color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
                <svg width="10" height="10" viewBox="0 0 10 10" style="display: block;">
                  <path d="M 3.5 2.5 L 3.5 7.5 L 7.5 5 Z" fill="white" />
                </svg>
              </div>
            `,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        });

        startMarker.bindTooltip(
          `<div style="font-family: system-ui; font-size: 11px; font-weight: 500; max-width: 200px; word-break: break-word; line-height: 1.4;">▶ Start: ${activity.name}</div>`,
          { direction: "top", offset: [0, -6], className: "activity-tooltip" }
        );

        startMarker.addTo(map!);
        markers.push(startMarker);

        // End marker with stop icon
        if (points.length > 1) {
          const lastRecord = activity.records[activity.records.length - 1];
          const endMarker = L!.marker(points[points.length - 1], {
            icon: L!.divIcon({
              className: "custom-marker",
              html: `
                <div style="width: 14px; height: 14px; background-color: ${activity.color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
                  <svg width="8" height="8" viewBox="0 0 8 8" style="display: block;">
                    <rect x="2" y="2" width="4" height="4" fill="white" />
                  </svg>
                </div>
              `,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            }),
          });

          endMarker.bindTooltip(
            `<div style="font-family: system-ui; font-size: 11px; max-width: 200px;">
              <div style="font-weight: 500; word-break: break-word; line-height: 1.4; max-height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">■ Finish: ${activity.name}</div>
              <div style="color: #666; margin-top: 2px;">${formatTime(lastRecord.t)} • ${formatDistance(lastRecord.d)}</div>
            </div>`,
            { direction: "top", offset: [0, -6], className: "activity-tooltip" }
          );

          endMarker.addTo(map!);
          markers.push(endMarker);
        }
      }

      // Calculate bounds
      const bounds = L!.latLngBounds(points);
      allBounds.push(bounds);
    }
  });

  // Fit map to show all activities
  if (allBounds.length > 0) {
    const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds));
    map.fitBounds(combinedBounds, { padding: [20, 20] });
  }
};

const updateHoverMarker = () => {
  if (!map || !L) return;

  if (hoverMarker) {
    map.removeLayer(hoverMarker);
    hoverMarker = null;
  }

  // If we have nearby activities from map hover, use those (shows multiple activities)
  let activitiesToShow = nearbyActivities;
  let lat: number;
  let lon: number;

  if (activitiesToShow.length > 0) {
    // Use the location from the nearest activity
    lat = activitiesToShow[0].record.lat!;
    lon = activitiesToShow[0].record.lon!;
  } else if (hoveredPoint.value) {
    // Fall back to hovered point (from chart hover)
    lat = hoveredPoint.value.lat;
    lon = hoveredPoint.value.lon;
    const activity = activities.value.find((a) => a.id === hoveredPoint.value!.activityId);
    if (activity && activity.records[hoveredPoint.value.recordIndex]) {
      const record = activity.records[hoveredPoint.value.recordIndex];
      activitiesToShow = [{ activity, record }];
    } else {
      return; // No valid activity found
    }
  } else {
    return; // No hover point or nearby activities
  }

  // Use the color of the nearest activity for the marker
  const nearestActivity = activitiesToShow[0];
  hoverMarker = L!.marker([lat, lon], {
    icon: L!.divIcon({
      className: "custom-hover-marker",
      html: `<div style="width: 16px; height: 16px; background-color: ${nearestActivity.activity.color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px ${nearestActivity.activity.color};"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    }),
  });

  // Build tooltip: show all activities if multiple, single if one
  const tooltipHtml =
    activitiesToShow.length > 1
      ? buildMultiActivityTooltip(activitiesToShow)
      : buildPointTooltip(activitiesToShow[0].activity, activitiesToShow[0].record);

  hoverMarker
    .bindTooltip(tooltipHtml, {
      permanent: true,
      direction: "top",
      offset: [0, -12],
      className: "activity-tooltip",
    })
    .openTooltip();

  hoverMarker.addTo(map);
};

watch(activities, async () => {
  await nextTick();
  if (hasGpsData.value) {
    // Ensure map is initialized if it hasn't been yet
    if (!map && mapContainer.value) {
      await nextTick();
      initMap();
      
      // Set up ResizeObserver after map is initialized
      if (mapContainer.value && map && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (layoutResizeTimer) {
            clearTimeout(layoutResizeTimer);
          }
          layoutResizeTimer = setTimeout(() => {
            if (map) {
              map.invalidateSize();
            }
            layoutResizeTimer = null;
          }, 100);
        });
        
        resizeObserver.observe(mapContainer.value);
      }
    } else if (map) {
      updateMap();
    }
  }
}, { deep: true });

// Watch hasGpsData to initialize map when GPS data becomes available
watch(hasGpsData, async (hasData) => {
  if (hasData) {
    await nextTick();
    if (!map && mapContainer.value) {
      initMap();
      
      // Set up ResizeObserver after map is initialized
      if (mapContainer.value && map && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (layoutResizeTimer) {
            clearTimeout(layoutResizeTimer);
          }
          layoutResizeTimer = setTimeout(() => {
            if (map) {
              map.invalidateSize();
            }
            layoutResizeTimer = null;
          }, 100);
        });
        
        resizeObserver.observe(mapContainer.value);
      }
    } else if (map) {
      // Map exists but may need to be updated with new GPS data
      updateMap();
    }
  }
});

watch(hoveredPoint, () => {
  updateHoverMarker();
});

// Watch for chart hover events to show marker and tooltip on map
const chartHoveredPoint = computed(() => activityStore.chartHoveredPoint);
watch(chartHoveredPoint, (point) => {
  if (!map) return;

  if (point) {
    const activity = activities.value.find((a) => a.id === point.activityId);
    if (activity && activity.records[point.recordIndex]) {
      const record = activity.records[point.recordIndex];
      if (record.lat !== undefined && record.lon !== undefined) {
        // Remove existing hover marker
        if (hoverMarker) {
          map.removeLayer(hoverMarker);
        }

        // Create hover marker with tooltip
        hoverMarker = L!.marker([record.lat, record.lon], {
          icon: L!.divIcon({
            className: "custom-hover-marker",
            html: `<div style="width: 16px; height: 16px; background-color: ${activity.color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px ${activity.color};"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        });

        // Add detailed tooltip showing all metrics
        hoverMarker
          .bindTooltip(buildPointTooltip(activity, record), {
            permanent: true,
            direction: "top",
            offset: [0, -12],
            className: "activity-tooltip",
          })
          .openTooltip();

        hoverMarker.addTo(map);

        // Pan map to show the point (only if point is outside current view)
        const currentBounds = map.getBounds();
        const pointLatLng = L!.latLng(record.lat, record.lon);
        if (!currentBounds.contains(pointLatLng)) {
          map.setView([record.lat, record.lon], map.getZoom(), { animate: true, duration: 0.3 });
        }
      }
    }
  } else {
    if (hoverMarker) {
      map.removeLayer(hoverMarker);
      hoverMarker = null;
    }
  }
});

// Watch for layout changes to trigger map resize (with multiple attempts to ensure it works)
let layoutResizeTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => activityStore.chartMapSideBySide,
  async () => {
    // Wait for DOM to update
    await nextTick();
    
    if (layoutResizeTimer) {
      clearTimeout(layoutResizeTimer);
    }
    
    // Call invalidateSize multiple times with delays to ensure it works
    // Sometimes Leaflet needs multiple attempts when container size changes
    const resizeMap = () => {
      if (map) {
        map.invalidateSize();
      }
    };
    
    // Immediate resize
    resizeMap();
    
    // Resize after a short delay
    layoutResizeTimer = setTimeout(() => {
      resizeMap();
      // Resize again after another delay to catch any late layout changes
      setTimeout(() => {
        resizeMap();
        layoutResizeTimer = null;
      }, 200);
    }, 150);
  },
);

// ResizeObserver to watch for container size changes
let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  await nextTick();
  
  // Only initialize map if GPS data is available
  if (hasGpsData.value && mapContainer.value) {
    initMap();
  }
  
  // Set up ResizeObserver to watch for container size changes
  if (mapContainer.value && map) {
    resizeObserver = new ResizeObserver(() => {
      // Debounce resize calls
      if (layoutResizeTimer) {
        clearTimeout(layoutResizeTimer);
      }
      layoutResizeTimer = setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
        layoutResizeTimer = null;
      }, 100);
    });
    
    resizeObserver.observe(mapContainer.value);
  }
});

onUnmounted(() => {
  if (layoutResizeTimer) {
    clearTimeout(layoutResizeTimer);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style>
/* Leaflet marker styles */
.custom-marker,
.custom-hover-marker {
  background: transparent !important;
  border: none !important;
}

/* Direction arrow markers */
.direction-arrow {
  background: transparent !important;
  border: none !important;
}

.direction-arrow svg {
  pointer-events: none;
}

/* Custom tooltip styling */
.activity-tooltip {
  background: white !important;
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  padding: 8px 10px !important;
}

.activity-tooltip::before {
  border-top-color: white !important;
}

.leaflet-tooltip-left.activity-tooltip::before {
  border-left-color: white !important;
}

.leaflet-tooltip-right.activity-tooltip::before {
  border-right-color: white !important;
}
</style>

