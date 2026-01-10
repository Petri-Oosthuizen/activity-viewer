<template>
  <div
    class="rounded-md border border-gray-200 p-3 transition-all sm:p-3"
    :class="isDisabled ? 'bg-gray-100' : 'bg-gray-50'"
  >
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-sm border border-gray-300 bg-white transition-all active:border-primary active:bg-gray-50 sm:h-5 sm:w-5 sm:hover:border-primary sm:hover:bg-gray-50"
          @click="$emit('toggle', activity.id)"
          :aria-label="isDisabled ? 'Enable activity' : 'Disable activity'"
          :aria-checked="!isDisabled"
          role="checkbox"
          :title="isDisabled ? 'Enable activity' : 'Disable activity'"
        >
          <svg
            v-if="!isDisabled"
            class="h-4 w-4 text-primary sm:h-3 sm:w-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <div
          class="h-4 w-4 shrink-0 rounded-full"
          :style="{ backgroundColor: activity.color, opacity: isDisabled ? 0.6 : 1 }"
          aria-hidden="true"
        ></div>
        <FileNameDisplay
          :filename="activity.name"
          :class="`flex-1 text-sm font-medium sm:text-[0.9375rem] ${isDisabled ? 'text-gray-400 opacity-60' : 'text-gray-800'}`"
        />
        <button
          type="button"
          class="ml-auto flex h-8 w-8 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full border-0 bg-red-100 text-red-600 transition-all active:scale-110 active:bg-red-200 sm:h-6 sm:w-6 sm:hover:scale-110 sm:hover:bg-red-200"
          @click.stop="$emit('remove', activity.id)"
          title="Remove activity"
          aria-label="Remove activity"
        >
          <svg
            class="h-5 w-5 sm:h-4 sm:w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div class="ml-[52px] text-[10px] text-gray-500 sm:ml-[44px] sm:text-xs" :class="{ 'opacity-60': isDisabled }">
        {{ activity.records.length }} data point{{ activity.records.length !== 1 ? "s" : "" }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Activity } from "~/types/activity";
import { useActivityStore } from "~/stores/activity";

interface Props {
  activity: Activity;
}

const props = defineProps<Props>();

const activityStore = useActivityStore();

const emit = defineEmits<{
  remove: [id: string];
  toggle: [id: string];
}>();

const isDisabled = computed(() => activityStore.isActivityDisabled(props.activity.id));
</script>
