import { computed } from "vue";
import { useWindowSize } from "@vueuse/core";
import { truncateMiddleSmart } from "~/utils/text-truncate";

/**
 * Composable for responsive text truncation
 * Returns a function that truncates text based on current screen size
 */
export function useResponsiveTruncate() {
  const { width: windowWidth } = useWindowSize();

  const truncate = (text: string, maxLength?: number): string => {
    if (!maxLength) {
      // Auto-determine max length based on screen size
      if (windowWidth.value < 640) {
        // Mobile: 20 chars
        maxLength = 20;
      } else if (windowWidth.value < 1024) {
        // Tablet: 35 chars
        maxLength = 35;
      } else {
        // Desktop: 50 chars
        maxLength = 50;
      }
    }

    return truncateMiddleSmart(text, maxLength);
  };

  return {
    truncate,
    windowWidth: computed(() => windowWidth.value),
  };
}
