import { computed } from "vue";

export function usePageMeta() {
  const baseURL = computed(() => {
    if (process.client) {
      const path = window.location.pathname;
      return path.endsWith("/") ? path.slice(0, -1) : path || "/";
    }
    const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "activity_viewer";
    return `/${repoName}`;
  });

  const fullURL = computed(() => {
    if (process.client) {
      return window.location.origin + baseURL.value;
    }
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
}
