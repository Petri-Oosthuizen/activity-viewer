<template>
  <div
    :class="[
      'relative rounded-lg border-2 border-dashed bg-white text-center transition-all cursor-pointer',
      compact ? 'border p-3 sm:p-4' : 'border-2 p-8 sm:p-12',
      isDragover ? 'border-primary bg-blue-50' : 'border-gray-300',
    ]"
    @drop="handleDrop"
    @dragover.prevent="isDragover = true"
    @dragleave="isDragover = false"
    @dragenter.prevent
    @click="triggerFileInput"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".gpx,.fit,.tcx,application/gpx+xml,application/xml,text/xml,application/octet-stream"
      multiple
      class="absolute h-px w-px overflow-hidden opacity-0"
      @change="handleFileSelect"
    />
    <div class="pointer-events-none select-none">
      <svg
        v-if="!compact"
        class="mx-auto mb-3 h-10 w-10 text-gray-400 sm:mb-4 sm:h-12 sm:w-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p :class="['text-gray-600', compact ? 'mb-0 text-xs sm:text-sm' : 'mb-2 text-sm sm:text-base']">
        <span v-if="!compact">Drag and drop GPX, FIT, or TCX files here, or </span>
          <button
            type="button"
            :class="[
              'text-primary font-inherit pointer-events-auto touch-manipulation cursor-pointer border-0 bg-transparent text-inherit underline min-h-[44px]',
              compact && 'rounded-sm px-3 py-2 font-medium no-underline transition-all active:bg-blue-50 sm:px-2 sm:py-1 sm:hover:bg-blue-50',
            ]"
            @click.stop="triggerFileInput"
          >
          {{ compact ? "Add more files" : "browse" }}
        </button>
      </p>
      <p v-if="!compact" class="text-xs text-gray-400 sm:text-sm">
        Supports .gpx, .fit, and .tcx files • Hold Ctrl/Cmd to select multiple files
      </p>
      <p v-if="compact" class="mt-1 text-[10px] text-gray-400 sm:text-xs">
        Drop files here or click to add more • Hold Ctrl/Cmd for multiple files
      </p>
    </div>
    <div v-if="isProcessing" class="text-primary mt-4 flex items-center justify-center gap-2">
      <span
        class="border-t-primary h-4 w-4 animate-spin rounded-full border-2 border-gray-200"
      ></span>
      Processing file...
    </div>
    <div v-if="error" class="mt-4 rounded-sm bg-red-100 p-3 text-sm text-red-600">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useActivityStore } from "~/stores/activity";
import { detectFileType, isSupportedFileType } from "~/utils/file-detector";
import { parseGPX } from "~/utils/gpx-parser";
import { parseFIT } from "~/utils/fit-parser";
import { parseTCX } from "~/utils/tcx-parser";

interface Props {
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
});

const fileInput = ref<HTMLInputElement | null>(null);
const isDragover = ref(false);
const isProcessing = ref(false);
const error = ref<string | null>(null);

const activityStore = useActivityStore();

const triggerFileInput = () => {
  fileInput.value?.click();
};

const processFile = async (file: File) => {
  if (!isSupportedFileType(file)) {
    throw new Error(`Unsupported file type: ${file.name}. Please upload a .gpx, .fit, or .tcx file.`);
  }

  const fileType = detectFileType(file);

  if (fileType === "gpx") {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const result = parseGPX(text);
          activityStore.addActivity(result.records, file.name, result.startTime);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  } else if (fileType === "fit") {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await parseFIT(arrayBuffer);
          activityStore.addActivity(result.records, file.name, result.startTime);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  } else if (fileType === "tcx") {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const result = parseTCX(text);
          activityStore.addActivity(result.records, file.name, result.startTime);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  } else {
    throw new Error("Unknown file type");
  }
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  // Convert FileList to array before processing
  const fileArray = Array.from(files);

  await processFiles(fileArray);

  // Reset input to allow selecting the same files again if needed
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragover.value = false;

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  await processFiles(Array.from(files));
};

const processFiles = async (files: File[]) => {
  if (files.length === 0) return;

  isProcessing.value = true;
  error.value = null;

  const errors: string[] = [];

  try {
    // Process all files sequentially to avoid race conditions
    for (const file of files) {
      try {
        await processFile(file);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : `Failed to process ${file.name}`;
        errors.push(`${file.name}: ${errorMsg}`);
      }
    }

    // Show error message if any files failed
    if (errors.length > 0) {
      error.value = `${errors.length} file(s) failed:\n${errors.join("\n")}`;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to process files";
  } finally {
    isProcessing.value = false;
  }
};
</script>
