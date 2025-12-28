import { ref, onUnmounted, watch, type Ref } from "vue";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

type EChartsInstance = ReturnType<typeof echarts.init>;

/**
 * Composable for managing ECharts instance lifecycle
 * Handles initialization, updates, resizing, and cleanup
 */
export function useECharts(container: Ref<HTMLDivElement | null>, option: Ref<EChartsOption>) {
  const chartInstance = ref<EChartsInstance | null>(null);

  const initChart = () => {
    if (!container.value) return;
    chartInstance.value = echarts.init(container.value);
    updateChart();
  };

  const updateChart = (replaceSeries = false) => {
    if (!chartInstance.value) return;
    // Always merge to preserve tooltip and other configurations
    // When series structure changes, use replaceMerge to only replace series
    if (replaceSeries) {
      chartInstance.value.setOption(option.value, { 
        notMerge: false,
        replaceMerge: ['series']
      });
    } else {
      chartInstance.value.setOption(option.value, { notMerge: false });
    }
  };

  const resizeChart = () => {
    if (chartInstance.value) {
      chartInstance.value.resize();
    }
  };

  // Auto-update chart when options change
  watch(
    option,
    () => {
      updateChart();
    },
    { deep: true },
  );

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
    // Cleanup: remove listeners and dispose chart instance
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
    updateChart,
    resizeChart,
    handleResize,
  };
}
