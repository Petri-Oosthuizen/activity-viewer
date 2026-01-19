<template>
  <div class="flex min-h-screen flex-col">
    <header class="relative border-b border-gray-200 bg-white p-2.5 sm:p-3 md:p-4">
      <div class="page-ear"></div>
      <a
        :href="githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="page-ear-link touch-manipulation"
        title="View on GitHub"
        aria-label="View on GitHub"
      >
        <svg
          class="h-4 w-4 text-white sm:h-5 sm:w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clip-rule="evenodd"
          />
        </svg>
      </a>
      <div class="text-center">
        <h1 class="m-0 text-lg font-bold text-gray-800 sm:text-xl md:text-2xl">Activity Viewer</h1>
        <p class="m-0 mt-0.5 text-xs text-gray-600 sm:text-sm md:text-base">
          Compare GPX, FIT, and TCX files
        </p>
      </div>
    </header>
    <main class="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 md:p-8">
      <div v-if="isLoadingFromStorage" class="flex min-h-[400px] items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <span
            class="border-t-primary h-8 w-8 animate-spin rounded-full border-2 border-gray-200"
          ></span>
          <p class="text-sm text-gray-600">Loading saved activities from storage...</p>
        </div>
      </div>
      <div v-else class="flex flex-col gap-4 sm:gap-6 md:gap-8">
        <section class="w-full">
          <ActivityList />
        </section>
        <section v-if="hasActivities" class="w-full">
          <AdvancedSettings />
        </section>
        <section v-if="hasActivities" class="w-full">
          <CollapsibleSection :default-open="true">
            <template #title>Overview</template>
            <template #description>Activity statistics and metrics summary</template>
            <OverviewPanel />
          </CollapsibleSection>
          <div
            v-if="shouldShowLayoutToggle"
            class="mt-4 mb-3 hidden items-center justify-end sm:mt-6 sm:mb-4 lg:flex"
          >
            <button
              type="button"
              class="flex touch-manipulation items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 sm:px-4 sm:py-2 sm:text-sm"
              @click="toggleSideBySide"
              :title="chartMapSideBySide ? 'View stacked' : 'View side by side'"
            >
              <svg
                v-if="chartMapSideBySide"
                class="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <!-- Stacked icon (vertical lines) -->
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                v-else
                class="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <!-- Side-by-side icon (grid) -->
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span class="hidden sm:inline">
                {{ chartMapSideBySide ? "View stacked" : "View side by side" }}
              </span>
            </button>
          </div>
          <div
            :class="[
              chartMapSideBySide
                ? 'mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 md:gap-8 lg:grid-cols-2 lg:items-start'
                : 'mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-6 md:gap-8',
            ]"
          >
            <div class="w-full">
              <ActivityChart />
            </div>
            <div class="w-full">
              <ActivityMap />
            </div>
          </div>
        </section>
      </div>
    </main>
    <footer
      class="mt-auto border-t border-gray-200 bg-white p-4 text-center text-xs text-gray-500 sm:p-6 sm:text-sm"
    >
      <p class="m-0">
        Petri
        <span v-if="buildNumber && buildNumber !== 'dev'" class="mx-2">•</span>
        <span v-if="buildNumber && buildNumber !== 'dev'" class="font-mono"
          >Build #{{ buildNumber }}</span
        >
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useUIStore } from "~/stores/ui";
import { useLocalStoragePersistence } from "~/composables/useLocalStoragePersistence";
import { useSettingsPersistence } from "~/composables/useSettingsPersistence";
import { useActivityList } from "~/composables/useActivityList";
import ActivityMap from "~/components/ActivityMap.vue";
import OverviewPanel from "~/components/OverviewPanel.vue";
import AdvancedSettings from "~/components/AdvancedSettings.vue";
import CollapsibleSection from "~/components/CollapsibleSection.vue";

const config = useRuntimeConfig();
const buildNumber = computed(() => config.public.buildNumber);
const githubUrl = computed(() => config.public.githubUrl);

const uiStore = useUIStore();
const { hasActivities } = useActivityList();

const { isLoading: isLoadingFromStorage } = useLocalStoragePersistence();
useSettingsPersistence();

// Only show layout toggle on large screens (lg breakpoint) where side-by-side actually works
// The layout is always stacked on smaller screens regardless of the setting
const shouldShowLayoutToggle = computed(() => {
  return hasActivities.value; // Only show if there are activities
});

const { chartMapSideBySide } = storeToRefs(uiStore);
const toggleSideBySide = () => {
  uiStore.setChartMapSideBySide(!chartMapSideBySide.value);
};

const baseURL = computed(() => {
  if (process.client) {
    const path = window.location.pathname;
    return path.endsWith("/") ? path.slice(0, -1) : path || "/";
  }
  // Fallback for build time
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "activity_viewer";
  return `/${repoName}`;
});
const fullURL = computed(() => {
  if (process.client) {
    return window.location.origin + baseURL.value;
  }
  // Fallback for build time
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "activity_viewer";
  return `https://petri.github.io/${repoName}`;
});

const structuredData = computed(() => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Activity Viewer",
  description:
    "Free web-based tool to visualize and compare GPX, FIT, and TCX activity files. View heart rate, power, cadence, altitude, and GPS tracks with interactive charts and maps.",
  url: fullURL.value,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "GPX, FIT, and TCX file parsing",
    "Multi-activity comparison",
    "Interactive charts and maps",
    "Heart rate, power, cadence, altitude visualization",
    "GPS track visualization",
  ],
}));

useHead({
  title: "Activity Viewer - Compare GPX, FIT, and TCX Files",
  htmlAttrs: {
    lang: "en",
  },
  link: [{ rel: "canonical", href: () => fullURL.value }],
  meta: [
    // Basic SEO
    {
      name: "description",
      content:
        "Free web-based tool to visualize and compare GPX, FIT, and TCX activity files. View heart rate, power, cadence, altitude, and GPS tracks with interactive charts and maps.",
    },
    {
      name: "keywords",
      content:
        "GPX viewer, FIT file viewer, TCX viewer, activity tracker, GPS visualization, cycling data, running data, heart rate analysis, power meter data, cadence analysis, activity comparison",
    },
    {
      name: "robots",
      content: "index, follow",
    },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes",
    },
    {
      name: "theme-color",
      content: "#5470c6",
    },
    // Open Graph / Facebook
    {
      property: "og:type",
      content: "website",
    },
    {
      property: "og:title",
      content: "Activity Viewer - Compare GPX, FIT, and TCX Files",
    },
    {
      property: "og:description",
      content:
        "Free web-based tool to visualize and compare GPX, FIT, and TCX activity files. View heart rate, power, cadence, altitude, and GPS tracks with interactive charts and maps.",
    },
    {
      property: "og:url",
      content: () => fullURL.value,
    },
    {
      property: "og:site_name",
      content: "Activity Viewer",
    },
    {
      property: "og:locale",
      content: "en_US",
    },
    // Twitter Card
    {
      name: "twitter:card",
      content: "summary",
    },
    {
      name: "twitter:title",
      content: "Activity Viewer - Compare GPX, FIT, and TCX Files",
    },
    {
      name: "twitter:description",
      content:
        "Free web-based tool to visualize and compare GPX, FIT, and TCX activity files. View heart rate, power, cadence, altitude, and GPS tracks.",
    },
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: () => JSON.stringify(structuredData.value),
    },
  ],
});
</script>
