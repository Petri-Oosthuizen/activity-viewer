import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  app: {
    baseURL: process.env.GITHUB_REPOSITORY
      ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}/`
      : "/",
  },
  runtimeConfig: {
    public: {
      buildNumber:
        process.env.GITHUB_RUN_NUMBER ||
        (process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : "dev"),
    },
  },
  routeRules: {
    "/": { prerender: true, ssr: true },
  },
  nitro: {
    prerender: {
      routes: ["/", "/sitemap.xml"],
    },
  },
  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
});
