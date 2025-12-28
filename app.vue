<template>
  <NuxtPage />
</template>

<script setup lang="ts">
const nuxtApp = useNuxtApp();
const baseURL = nuxtApp.$config.app.baseURL || "/";

useHead({
  link: [
    { rel: "icon", type: "image/svg+xml", href: `${baseURL}favicon.svg` },
    { rel: "alternate icon", href: `${baseURL}favicon.svg` },
  ],
});
</script>
