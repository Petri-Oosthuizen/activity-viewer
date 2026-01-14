import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUIStore } from "~/stores/ui";
import type { MapHoverPoint, ChartHoverPoint } from "~/stores/ui";

describe("useUIStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("mapHoveredPoint", () => {
    it("should have null by default", () => {
      const store = useUIStore();
      expect(store.mapHoveredPoint).toBeNull();
    });

    it("should set map hover point", () => {
      const store = useUIStore();
      const point: MapHoverPoint = {
        activityId: "test-1",
        recordIndex: 5,
        lat: 37.7749,
        lon: -122.4194,
      };

      store.setMapHoverPoint(point);

      expect(store.mapHoveredPoint).toEqual(point);
    });

    it("should clear map hover point", () => {
      const store = useUIStore();
      const point: MapHoverPoint = {
        activityId: "test-1",
        recordIndex: 5,
        lat: 37.7749,
        lon: -122.4194,
      };

      store.setMapHoverPoint(point);
      expect(store.mapHoveredPoint).toEqual(point);

      store.clearMapHoverPoint();
      expect(store.mapHoveredPoint).toBeNull();
    });

    it("should set map hover point to null explicitly", () => {
      const store = useUIStore();
      const point: MapHoverPoint = {
        activityId: "test-1",
        recordIndex: 5,
        lat: 37.7749,
        lon: -122.4194,
      };

      store.setMapHoverPoint(point);
      store.setMapHoverPoint(null);

      expect(store.mapHoveredPoint).toBeNull();
    });
  });

  describe("chartHoveredPoint", () => {
    it("should have null by default", () => {
      const store = useUIStore();
      expect(store.chartHoveredPoint).toBeNull();
    });

    it("should set chart hover point", () => {
      const store = useUIStore();
      const point: ChartHoverPoint = {
        activityId: "test-1",
        recordIndex: 10,
      };

      store.setChartHoverPoint(point);

      expect(store.chartHoveredPoint).toEqual(point);
    });

    it("should clear chart hover point", () => {
      const store = useUIStore();
      const point: ChartHoverPoint = {
        activityId: "test-1",
        recordIndex: 10,
      };

      store.setChartHoverPoint(point);
      expect(store.chartHoveredPoint).toEqual(point);

      store.clearChartHoverPoint();
      expect(store.chartHoveredPoint).toBeNull();
    });

    it("should set chart hover point to null explicitly", () => {
      const store = useUIStore();
      const point: ChartHoverPoint = {
        activityId: "test-1",
        recordIndex: 10,
      };

      store.setChartHoverPoint(point);
      store.setChartHoverPoint(null);

      expect(store.chartHoveredPoint).toBeNull();
    });
  });

  describe("zoom triggers", () => {
    it("should have resetZoomTrigger starting at 0", () => {
      const store = useUIStore();
      expect(store.resetZoomTrigger).toBe(0);
    });

    it("should increment resetZoomTrigger", () => {
      const store = useUIStore();
      store.resetZoom();
      expect(store.resetZoomTrigger).toBe(1);

      store.resetZoom();
      expect(store.resetZoomTrigger).toBe(2);
    });

    it("should have zoomInTrigger starting at 0", () => {
      const store = useUIStore();
      expect(store.zoomInTrigger).toBe(0);
    });

    it("should increment zoomInTrigger", () => {
      const store = useUIStore();
      store.zoomIn();
      expect(store.zoomInTrigger).toBe(1);

      store.zoomIn();
      expect(store.zoomInTrigger).toBe(2);
    });

    it("should have zoomOutTrigger starting at 0", () => {
      const store = useUIStore();
      expect(store.zoomOutTrigger).toBe(0);
    });

    it("should increment zoomOutTrigger", () => {
      const store = useUIStore();
      store.zoomOut();
      expect(store.zoomOutTrigger).toBe(1);

      store.zoomOut();
      expect(store.zoomOutTrigger).toBe(2);
    });

    it("should have independent zoom triggers", () => {
      const store = useUIStore();
      store.resetZoom();
      store.zoomIn();
      store.zoomOut();

      expect(store.resetZoomTrigger).toBe(1);
      expect(store.zoomInTrigger).toBe(1);
      expect(store.zoomOutTrigger).toBe(1);
    });
  });

  describe("chartMapSideBySide", () => {
    it("should have false by default", () => {
      const store = useUIStore();
      expect(store.chartMapSideBySide).toBe(false);
    });

    it("should set chartMapSideBySide to true", () => {
      const store = useUIStore();
      store.setChartMapSideBySide(true);
      expect(store.chartMapSideBySide).toBe(true);
    });

    it("should set chartMapSideBySide to false", () => {
      const store = useUIStore();
      store.setChartMapSideBySide(true);
      store.setChartMapSideBySide(false);
      expect(store.chartMapSideBySide).toBe(false);
    });

    it("should toggle chartMapSideBySide", () => {
      const store = useUIStore();
      store.setChartMapSideBySide(true);
      expect(store.chartMapSideBySide).toBe(true);

      store.setChartMapSideBySide(false);
      expect(store.chartMapSideBySide).toBe(false);
    });
  });
});
