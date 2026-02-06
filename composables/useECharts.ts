import { onUnmounted, type Ref, shallowRef } from "vue";
import * as echarts from "echarts";

type EChartsInstance = ReturnType<typeof echarts.init>;

/**
 * Minimal ECharts composable - ONLY handles chart lifecycle
 * Does NOT manage options - caller is responsible for all setOption calls
 *
 * CRITICAL: Uses shallowRef instead of ref to avoid Vue's deep reactivity
 * which breaks ECharts internal state management
 */
export function useECharts(container: Ref<HTMLDivElement | null>) {
  const chartInstance = shallowRef<EChartsInstance | null>(null);

  const initChart = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!container.value) {
        resolve();
        return;
      }

      // Ensure container has dimensions before initializing
      const rect = container.value.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Wait for next frame if container has no dimensions
        requestAnimationFrame(() => {
          if (container.value && !chartInstance.value) {
            const checkRect = container.value.getBoundingClientRect();
            if (checkRect.width > 0 && checkRect.height > 0) {
              chartInstance.value = echarts.init(container.value);
            }
          }
          resolve();
        });
        return;
      }

      chartInstance.value = echarts.init(container.value);
      resolve();
    });
  };

  const resizeChart = () => {
    if (chartInstance.value) {
      chartInstance.value.resize();
    }
  };

  // Handle window resize with debouncing
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const handleResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(() => {
      resizeChart();
      resizeTimer = null;
    }, 150);
  };

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    if (chartInstance.value) {
      chartInstance.value.dispose();
      chartInstance.value = null;
    }
  });

  return {
    chartInstance,
    initChart,
    resizeChart,
    handleResize,
  };
}
