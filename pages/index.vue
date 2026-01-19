<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 md:p-8">
      <ClientOnly>
        <LoadingIndicator
          v-if="isLoadingFromStorage"
          message="Loading saved activities from storage..."
        />
        <div v-else class="flex flex-col gap-4 sm:gap-6 md:gap-8">
          <section class="w-full">
            <ActivityList />
          </section>
          <section v-if="hasActivities" class="w-full">
            <AdvancedSettings />
          </section>
          <section v-if="hasActivities" class="w-full">
            <OverviewPanel />
            <SideBySideLayoutToggle />
            <ChartMapLayout />
          </section>
        </div>
        <template #fallback>
          <div class="flex flex-col gap-4 sm:gap-6 md:gap-8">
            <section class="w-full">
              <ActivityList />
            </section>
          </div>
        </template>
      </ClientOnly>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { useLocalStoragePersistence } from "~/composables/useLocalStoragePersistence";
import { useSettingsPersistence } from "~/composables/useSettingsPersistence";
import { useActivityList } from "~/composables/useActivityList";
import { usePageMeta } from "~/composables/usePageMeta";
import AppHeader from "~/components/AppHeader.vue";
import AppFooter from "~/components/AppFooter.vue";
import LoadingIndicator from "~/components/LoadingIndicator.vue";
import ActivityList from "~/components/ActivityList.vue";
import SideBySideLayoutToggle from "~/components/SideBySideLayoutToggle.vue";
import ChartMapLayout from "~/components/ChartMapLayout.vue";
import OverviewPanel from "~/components/OverviewPanel.vue";
import AdvancedSettings from "~/components/AdvancedSettings.vue";

const { hasActivities } = useActivityList();

const { isLoading: isLoadingFromStorage } = useLocalStoragePersistence();
useSettingsPersistence();
usePageMeta();

</script>
