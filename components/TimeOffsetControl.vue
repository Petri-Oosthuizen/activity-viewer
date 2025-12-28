<template>
  <label class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
    <span class="text-xs text-gray-600 sm:text-sm sm:shrink-0 sm:whitespace-nowrap">Offset (s):</span>
    <div class="flex gap-1 items-center sm:gap-1.5">
      <button
        type="button"
        class="flex items-center justify-center w-12 h-9 border border-gray-300 bg-white text-gray-600 rounded-sm text-xs touch-manipulation transition-all active:bg-gray-50 active:border-primary active:text-primary sm:w-10 sm:h-7 sm:text-xs sm:hover:bg-gray-50 sm:hover:border-primary sm:hover:text-primary"
        @click="updateOffset(props.offset - 10)"
        aria-label="Decrease by 10 seconds"
      >
        −10
      </button>
      <button
        type="button"
        class="flex items-center justify-center w-10 h-9 border border-gray-300 bg-white text-gray-600 rounded-sm text-xs touch-manipulation transition-all active:bg-gray-50 active:border-primary active:text-primary sm:w-9 sm:h-7 sm:text-xs sm:hover:bg-gray-50 sm:hover:border-primary sm:hover:text-primary"
        @click="updateOffset(props.offset - 1)"
        aria-label="Decrease by 1 second"
      >
        −1
      </button>
      <input
        type="number"
        class="w-14 h-9 px-2 border border-gray-300 rounded-sm text-xs text-center bg-white text-gray-900 font-medium focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-14 sm:h-7 sm:text-xs"
        :value="props.offset"
        @input="handleInput"
      />
      <button
        type="button"
        class="flex items-center justify-center w-10 h-9 border border-gray-300 bg-white text-gray-600 rounded-sm text-xs touch-manipulation transition-all active:bg-gray-50 active:border-primary active:text-primary sm:w-9 sm:h-7 sm:text-xs sm:hover:bg-gray-50 sm:hover:border-primary sm:hover:text-primary"
        @click="updateOffset(props.offset + 1)"
        aria-label="Increase by 1 second"
      >
        +1
      </button>
      <button
        type="button"
        class="flex items-center justify-center w-12 h-9 border border-gray-300 bg-white text-gray-600 rounded-sm text-xs touch-manipulation transition-all active:bg-gray-50 active:border-primary active:text-primary sm:w-10 sm:h-7 sm:text-xs sm:hover:bg-gray-50 sm:hover:border-primary sm:hover:text-primary"
        @click="updateOffset(props.offset + 10)"
        aria-label="Increase by 10 seconds"
      >
        +10
      </button>
      <button
        type="button"
        class="flex items-center justify-center w-10 h-9 border border-gray-300 bg-white text-gray-600 rounded-sm text-xs touch-manipulation transition-all active:bg-gray-50 active:border-primary active:text-primary sm:w-9 sm:h-7 sm:text-xs sm:hover:bg-gray-50 sm:hover:border-primary sm:hover:text-primary"
        @click="updateOffset(0)"
        title="Reset to 0"
        aria-label="Reset offset to 0"
      >
        ↺
      </button>
    </div>
  </label>
</template>

<script setup lang="ts">
interface Props {
  offset: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:offset': [offset: number]
}>()

const updateOffset = (newOffset: number) => {
  emit('update:offset', newOffset)
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value) || 0
  emit('update:offset', value)
}
</script>


