<template>
  <div class="rounded-lg bg-white p-4 shadow-xs sm:p-6">
    <div class="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="m-0 text-base font-semibold text-gray-800 sm:text-lg">Overview</h3>
        <p class="mt-1 text-xs text-gray-500 sm:text-sm">
          {{ descriptionText }}
        </p>
        <div
          v-if="isChartWindowActive"
          class="mt-2 inline-flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-900 sm:text-xs"
        >
          <span class="font-semibold">Showing visible chart window</span>
          <span class="text-amber-800">
            X: {{ chartWindow.xStartPercent.toFixed(0) }}–{{ chartWindow.xEndPercent.toFixed(0) }}%
          </span>
          <button
            type="button"
            class="ml-1 flex items-center justify-center rounded p-1 hover:bg-amber-100 focus:ring-1 focus:ring-amber-300 focus:outline-none"
            title="Clear chart window"
            aria-label="Clear chart window"
            @click="clearChartWindow"
          >
            <svg
              class="h-3 w-3 text-amber-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="showBaseline" class="flex flex-col gap-2 sm:items-end">
        <label
          class="flex cursor-pointer items-center gap-1.5"
          title="Enable comparison with a baseline activity. Delta values show the difference between each activity and the selected baseline."
        >
          <input
            type="checkbox"
            :checked="baselineEnabled"
            class="text-primary focus:ring-primary h-4 w-4 cursor-pointer rounded-sm border-gray-300"
            @change="toggleBaseline"
          />
          <span class="text-[10px] font-medium text-gray-600 sm:text-xs"
            >Enable Baseline Comparison</span
          >
        </label>
        <select
          v-if="baselineEnabled"
          :value="baselineActivityId || ''"
          class="baseline-select focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:outline-hidden sm:w-auto sm:max-w-[400px] sm:min-w-[200px] sm:px-3 sm:py-1.5 md:max-w-[500px]"
          @change="setBaselineActivityId"
        >
          <option v-for="a in activeActivities" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table class="w-full table-auto border-collapse text-left text-xs sm:text-sm">
        <thead class="bg-gray-50 text-gray-700">
          <tr>
            <th
              class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2.5 font-semibold sm:w-24 sm:px-3"
            >
              Metric
            </th>
            <th
              v-for="a in activeActivities"
              :key="a.id"
              class="max-w-[120px] border-b border-gray-200 px-2 py-2.5 text-right font-semibold sm:max-w-[160px] sm:px-3 md:max-w-[200px]"
            >
              <div class="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: a.color }"
                  aria-hidden="true"
                />
                <FileNameDisplay :filename="a.name" class="shrink" />
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="text-gray-800">
          <tr class="bg-white">
            <td
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
            >
              <span :title="getMetricDescription('Duration')">Duration</span>
            </td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
            >
              <div>{{ formatTime(statsById[a.id]?.durationSeconds ?? 0) }}</div>
              <div
                v-if="isBaselineActive"
                class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                :title="formatDelta('durationSeconds', a.id) === '—' ? 'Same as baseline' : ''"
              >
                {{ formatDelta("durationSeconds", a.id) }}
              </div>
            </td>
          </tr>

          <tr class="bg-white">
            <td
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
            >
              <span :title="getMetricDescription('Distance')">Distance</span>
            </td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
            >
              <div>{{ formatDistance(statsById[a.id]?.distanceMeters ?? 0) }}</div>
              <div
                v-if="isBaselineActive"
                class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                :title="formatDelta('distanceMeters', a.id) === '—' ? 'Same as baseline' : ''"
              >
                {{ formatDelta("distanceMeters", a.id) }}
              </div>
            </td>
          </tr>

          <tr class="bg-white" v-if="hasAnySport">
            <td
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
            >
              Type
            </td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
            >
              <div :class="a.sport ? '' : 'text-gray-400'">
                {{ a.sport ?? "—" }}
              </div>
            </td>
          </tr>

          <tr class="bg-white" v-if="hasAnyCalories">
            <td
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
            >
              <span :title="getMetricDescription('Calories')">Calories</span>
            </td>
            <td
              v-for="a in activeActivities"
              :key="a.id"
              class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
            >
              <div
                :class="
                  statsById[a.id]?.calories === null || statsById[a.id]?.calories === undefined
                    ? 'text-gray-400'
                    : ''
                "
              >
                {{
                  statsById[a.id]?.calories !== null && statsById[a.id]?.calories !== undefined
                    ? `${Math.round(statsById[a.id]!.calories!)} kcal`
                    : "—"
                }}
              </div>
              <div
                v-if="isBaselineActive"
                class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                :title="formatCaloriesDelta(a.id) === '—' ? 'Same as baseline' : ''"
              >
                {{ formatCaloriesDelta(a.id) }}
              </div>
            </td>
          </tr>

          <template v-if="hasAnyPace">
            <tr class="bg-gray-50">
              <td
                colspan="2"
                class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
              >
                <span :title="getMetricDescription('Pace')">Pace</span>
              </td>
              <td
                v-for="a in activeActivities.slice(1)"
                :key="a.id"
                class="border-b border-gray-200 bg-gray-50"
              ></td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">min</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div
                  :class="
                    statsById[a.id]?.metrics.pace?.min === null ||
                    statsById[a.id]?.metrics.pace?.min === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.metrics.pace?.min !== null &&
                    statsById[a.id]?.metrics.pace?.min !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics.pace.min!, "pace")
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricMinDelta('pace', a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricMinDelta("pace", a.id) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">average</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div
                  :class="
                    statsById[a.id]?.metrics.pace?.avg === null ||
                    statsById[a.id]?.metrics.pace?.avg === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.metrics.pace?.avg !== null &&
                    statsById[a.id]?.metrics.pace?.avg !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics.pace.avg!, "pace")
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricAvgDelta('pace', a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricAvgDelta("pace", a.id) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">max</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div
                  :class="
                    statsById[a.id]?.metrics.pace?.max === null ||
                    statsById[a.id]?.metrics.pace?.max === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.metrics.pace?.max !== null &&
                    statsById[a.id]?.metrics.pace?.max !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics.pace.max!, "pace")
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricMaxDelta('pace', a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricMaxDelta("pace", a.id) }}
                </div>
              </td>
            </tr>
          </template>

          <template v-if="hasAnyElevation">
            <tr class="bg-gray-50">
              <td
                colspan="2"
                class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
              >
                <span :title="getMetricDescription('Elevation gain')">Elevation</span>
              </td>
              <td
                v-for="a in activeActivities.slice(1)"
                :key="a.id"
                class="border-b border-gray-200 bg-gray-50"
              ></td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">gained</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div
                  :class="
                    statsById[a.id]?.elevationGainMeters === null ||
                    statsById[a.id]?.elevationGainMeters === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.elevationGainMeters === null ||
                    statsById[a.id]?.elevationGainMeters === undefined
                      ? "—"
                      : `${Math.round(statsById[a.id]!.elevationGainMeters!)} m`
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="
                    formatNullableDelta('elevationGainMeters', a.id) === '—'
                      ? 'Same as baseline'
                      : ''
                  "
                >
                  {{ formatNullableDelta("elevationGainMeters", a.id) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">lost</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div
                  :class="
                    statsById[a.id]?.elevationLossMeters === null ||
                    statsById[a.id]?.elevationLossMeters === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.elevationLossMeters === null ||
                    statsById[a.id]?.elevationLossMeters === undefined
                      ? "—"
                      : `${Math.round(statsById[a.id]!.elevationLossMeters!)} m`
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="
                    formatNullableDelta('elevationLossMeters', a.id) === '—'
                      ? 'Same as baseline'
                      : ''
                  "
                >
                  {{ formatNullableDelta("elevationLossMeters", a.id) }}
                </div>
              </td>
            </tr>
          </template>

          <template v-for="metric in metrics" :key="metric">
            <tr class="bg-gray-50">
              <td
                colspan="2"
                class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
              >
                <span :title="getMetricDescription(getMetricName(metric))">{{
                  getMetricName(metric)
                }}</span>
              </td>
              <td
                v-for="a in activeActivities.slice(1)"
                :key="a.id"
                class="border-b border-gray-200 bg-gray-50"
              ></td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">min</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div
                  :class="
                    statsById[a.id]?.metrics[metric]?.min === null ||
                    statsById[a.id]?.metrics[metric]?.min === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.metrics[metric]?.min !== null &&
                    statsById[a.id]?.metrics[metric]?.min !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics[metric].min!, metric)
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricMinDelta(metric, a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricMinDelta(metric, a.id) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">average</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div
                  :class="
                    statsById[a.id]?.metrics[metric]?.avg === null ||
                    statsById[a.id]?.metrics[metric]?.avg === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.metrics[metric]?.avg !== null &&
                    statsById[a.id]?.metrics[metric]?.avg !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics[metric].avg!, metric)
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricAvgDelta(metric, a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricAvgDelta(metric, a.id) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">max</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div
                  :class="
                    statsById[a.id]?.metrics[metric]?.max === null ||
                    statsById[a.id]?.metrics[metric]?.max === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.metrics[metric]?.max !== null &&
                    statsById[a.id]?.metrics[metric]?.max !== undefined
                      ? formatMetricValue(statsById[a.id]!.metrics[metric].max!, metric)
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="formatMetricMaxDelta(metric, a.id) === '—' ? 'Same as baseline' : ''"
                >
                  {{ formatMetricMaxDelta(metric, a.id) }}
                </div>
              </td>
            </tr>
          </template>

          <template v-if="hasAnyLaps">
            <tr class="bg-gray-50">
              <td
                colspan="2"
                class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
              >
                <span :title="getMetricDescription('Laps')">Laps</span>
              </td>
              <td
                v-for="a in activeActivities.slice(1)"
                :key="a.id"
                class="border-b border-gray-200 bg-gray-50"
              ></td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                Count
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div>
                  {{ a.laps && a.laps.length > 0 ? a.laps.length : "—" }}
                </div>
              </td>
            </tr>
            <tr class="bg-white" v-if="hasAnyLapTime">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">avg time</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div :class="formatLapAvgTime(a.laps) === '—' ? 'text-gray-400' : ''">
                  {{ formatLapAvgTime(a.laps) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white" v-if="hasAnyLapDistance">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">avg distance</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div :class="formatLapAvgDistance(a.laps) === '—' ? 'text-gray-400' : ''">
                  {{ formatLapAvgDistance(a.laps) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white" v-if="hasAnyLapHeartRate">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">avg HR</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div :class="formatLapAvgHeartRate(a.laps) === '—' ? 'text-gray-400' : ''">
                  {{ formatLapAvgHeartRate(a.laps) }}
                </div>
              </td>
            </tr>
            <tr class="bg-white" v-if="hasAnyLapSpeed">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                <span class="text-[10px] text-gray-500 sm:text-xs">avg speed</span>
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div :class="formatLapAvgSpeed(a.laps) === '—' ? 'text-gray-400' : ''">
                  {{ formatLapAvgSpeed(a.laps) }}
                </div>
              </td>
            </tr>
          </template>

          <template v-if="hasAnyBestSplits">
            <tr class="bg-gray-50">
              <td
                colspan="2"
                class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
              >
                <span :title="getMetricDescription('Best Splits')">Best Splits</span>
              </td>
              <td
                v-for="a in activeActivities.slice(1)"
                :key="a.id"
                class="border-b border-gray-200 bg-gray-50"
              ></td>
            </tr>
            <tr v-for="splitLabel in availableSplitLabels" :key="splitLabel" class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3"
              >
                {{ splitLabel }}
              </td>
              <td
                v-for="a in activeActivities"
                :key="a.id"
                class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
              >
                <div :class="formatBestSplit(a.id, splitLabel) === '—' ? 'text-gray-400' : ''">
                  {{ formatBestSplit(a.id, splitLabel) }}
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useActivityStore } from "~/stores/activity";
import { computeActivityStatsFromRecords, computeActivityStats } from "~/utils/activity-stats";
import {
  formatDistance,
  formatMetricValue,
  formatTime,
  formatSpeed,
  formatPower,
} from "~/utils/format";
import type { MetricType } from "~/utils/chart-config";
import type { Activity } from "~/types/activity";
import { METRIC_DESCRIPTIONS } from "~/utils/metric-descriptions";
import { COMMON_SPLITS } from "~/utils/best-splits";
import {
  computeGlobalXExtent,
  filterRecordsByXRange,
  isPercentWindowActive,
  percentWindowToXRange,
} from "~/utils/windowing";

const activityStore = useActivityStore();

const activeActivities = computed(() =>
  activityStore.activities.filter((a) => !activityStore.disabledActivities.has(a.id)),
);

const showBaseline = computed(() => activeActivities.value.length >= 2);
const isBaselineActive = computed(() => showBaseline.value && baselineEnabled.value);
const descriptionText = computed(() =>
  isBaselineActive.value
    ? "Min, average, and max values per activity, compared to the baseline."
    : showBaseline.value
      ? "Min, average, and max values per activity."
      : "Min, average, and max values for this activity.",
);

const baselineActivityId = ref<string | null>(null);
const baselineEnabled = ref<boolean>(true);

watch(
  activeActivities,
  (next) => {
    if (next.length === 0) {
      baselineActivityId.value = null;
      return;
    }
    if (!baselineActivityId.value || !next.some((a) => a.id === baselineActivityId.value)) {
      const first = next[0];
      if (first) {
        baselineActivityId.value = first.id;
      }
    }
  },
  { immediate: true },
);

function toggleBaseline(event: Event) {
  const target = event.target as HTMLInputElement;
  baselineEnabled.value = target.checked;
}

const setBaselineActivityId = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  baselineActivityId.value = target.value;
};

const clearChartWindow = () => {
  activityStore.resetZoom();
};

const allMetrics = [
  "hr",
  "pwr",
  "cad",
  "alt",
  "speed",
  "temp",
  "grade",
  "vSpeed",
] as const satisfies readonly MetricType[];
const metricLabels = computed(() => activityStore.metricLabels);

const metrics = computed(() => {
  return allMetrics.filter((metric) => {
    return activeActivities.value.some((activity) => {
      const stats = statsById.value[activity.id];
      if (!stats) return false;
      const metricStats = stats.metrics[metric];
      return metricStats.avg !== null || metricStats.min !== null || metricStats.max !== null;
    });
  });
});

const getMetricName = (metric: MetricType): string => {
  const label = metricLabels.value[metric];
  const match = label.match(/^(.+?)\s*\(/);
  return match ? match[1]!.trim() : label;
};

const getMetricDescription = (metricName: string): string => {
  return METRIC_DESCRIPTIONS[metricName] || "";
};

const getMetricUnit = (metric: MetricType): string => {
  const label = metricLabels.value[metric];
  const match = label.match(/\(([^)]+)\)/);
  return match ? match[1]! : "";
};

const xAxisType = computed(() => activityStore.xAxisType);
const chartTransforms = computed(() => activityStore.chartTransforms);

const statsById = computed(() => {
  const map: Record<string, ReturnType<typeof computeActivityStats>> = {};
  const acts = activeActivities.value;
  const viewMode = chartTransforms.value.viewMode;

  // For pivot view we don't have an X window; keep full-activity stats.
  if (viewMode !== "timeseries") {
    for (const a of acts) {
      map[a.id] = computeActivityStats(a);
    }
    return map;
  }

  // If window is full extent, keep full stats.
  const w = chartWindow.value;
  const isWindowActive = isPercentWindowActive({
    startPercent: w.xStartPercent,
    endPercent: w.xEndPercent,
  });
  if (!isWindowActive) {
    for (const a of acts) {
      map[a.id] = computeActivityStats(a);
    }
    return map;
  }

  // Convert % window → actual X range using the full data extent.
  const extent = computeGlobalXExtent(acts, xAxisType.value);
  if (!extent) {
    for (const a of acts) {
      map[a.id] = computeActivityStats(a);
    }
    return map;
  }

  const range = percentWindowToXRange(extent, {
    startPercent: w.xStartPercent,
    endPercent: w.xEndPercent,
  });

  for (const a of acts) {
    const subset = filterRecordsByXRange(a, xAxisType.value, range);
    const subsetStats = computeActivityStatsFromRecords(
      subset.length > 0 ? subset : a.records.slice(0, 1),
    );
    const fullStats = computeActivityStats(a);
    map[a.id] = {
      ...subsetStats,
      calories: fullStats.calories,
    };
  }
  return map;
});

const chartWindow = computed(() => activityStore.chartWindow);
const isChartWindowActive = computed(() => {
  const w = chartWindow.value;
  return w.xStartPercent > 0 || w.xEndPercent < 100;
});

const baselineStats = computed(() => {
  if (!showBaseline.value) return null;
  const id = baselineActivityId.value;
  if (!id) return null;
  return statsById.value[id] ?? null;
});

const hasAnyPace = computed(() =>
  activeActivities.value.some(
    (a) =>
      statsById.value[a.id]?.metrics.pace?.avg !== null ||
      statsById.value[a.id]?.metrics.pace?.min !== null ||
      statsById.value[a.id]?.metrics.pace?.max !== null,
  ),
);

const hasAnyCalories = computed(() =>
  activeActivities.value.some(
    (a) =>
      statsById.value[a.id]?.calories !== null && statsById.value[a.id]?.calories !== undefined,
  ),
);

const hasAnySport = computed(() => activeActivities.value.some((a) => a.sport));

const hasAnyElevation = computed(() =>
  activeActivities.value.some(
    (a) =>
      statsById.value[a.id]?.elevationGainMeters !== null ||
      statsById.value[a.id]?.elevationLossMeters !== null,
  ),
);

const hasAnyLaps = computed(() => activeActivities.value.some((a) => a.laps && a.laps.length > 1));

const hasAnyLapTime = computed(() =>
  activeActivities.value.some((a) =>
    a.laps?.some((lap) => lap.totalTimeSeconds !== undefined && lap.totalTimeSeconds !== null),
  ),
);

const hasAnyLapDistance = computed(() =>
  activeActivities.value.some((a) =>
    a.laps?.some((lap) => lap.distanceMeters !== undefined && lap.distanceMeters !== null),
  ),
);

const hasAnyLapHeartRate = computed(() =>
  activeActivities.value.some((a) =>
    a.laps?.some(
      (lap) => lap.averageHeartRateBpm !== undefined && lap.averageHeartRateBpm !== null,
    ),
  ),
);

const hasAnyLapSpeed = computed(() =>
  activeActivities.value.some((a) =>
    a.laps?.some((lap) => lap.averageSpeed !== undefined && lap.averageSpeed !== null),
  ),
);

function formatLapAvgTime(laps: Activity["laps"]): string {
  if (!laps || laps.length === 0) return "—";
  const validLaps = laps.filter(
    (lap) => lap.totalTimeSeconds !== undefined && lap.totalTimeSeconds !== null,
  );
  if (validLaps.length === 0) return "—";
  const totalTime = validLaps.reduce((sum, lap) => sum + (lap.totalTimeSeconds ?? 0), 0);
  const avgTime = totalTime / validLaps.length;
  return formatTime(avgTime);
}

function formatLapAvgDistance(laps: Activity["laps"]): string {
  if (!laps || laps.length === 0) return "—";
  const validLaps = laps.filter(
    (lap) => lap.distanceMeters !== undefined && lap.distanceMeters !== null,
  );
  if (validLaps.length === 0) return "—";
  const totalDistance = validLaps.reduce((sum, lap) => sum + (lap.distanceMeters ?? 0), 0);
  const avgDistance = totalDistance / validLaps.length;
  return formatDistance(avgDistance);
}

function formatLapAvgHeartRate(laps: Activity["laps"]): string {
  if (!laps || laps.length === 0) return "—";
  const validLaps = laps.filter(
    (lap) => lap.averageHeartRateBpm !== undefined && lap.averageHeartRateBpm !== null,
  );
  if (validLaps.length === 0) return "—";
  const totalHr = validLaps.reduce((sum, lap) => sum + (lap.averageHeartRateBpm ?? 0), 0);
  const avgHr = totalHr / validLaps.length;
  return `${Math.round(avgHr)} bpm`;
}

function formatLapAvgSpeed(laps: Activity["laps"]): string {
  if (!laps || laps.length === 0) return "—";
  const validLaps = laps.filter(
    (lap) => lap.averageSpeed !== undefined && lap.averageSpeed !== null,
  );
  if (validLaps.length === 0) return "—";
  const totalSpeed = validLaps.reduce((sum, lap) => sum + (lap.averageSpeed ?? 0), 0);
  const avgSpeed = totalSpeed / validLaps.length;
  return formatSpeed(avgSpeed);
}

const hasAnyBestSplits = computed(() => {
  return activeActivities.value.some((a) => {
    const stats = statsById.value[a.id];
    if (!stats || !stats.bestSplits) return false;
    return Object.keys(stats.bestSplits).length > 0;
  });
});

const availableSplitLabels = computed(() => {
  const allLabels = new Set<string>();
  for (const a of activeActivities.value) {
    const stats = statsById.value[a.id];
    if (stats?.bestSplits) {
      Object.keys(stats.bestSplits).forEach((label) => allLabels.add(label));
    }
  }
  // Return in the order defined in COMMON_SPLITS
  return COMMON_SPLITS.map((split) => split.label).filter((label) => allLabels.has(label));
});

function formatBestSplit(activityId: string, splitLabel: string): string {
  const stats = statsById.value[activityId];
  if (!stats?.bestSplits) return "—";
  const split = stats.bestSplits[splitLabel];
  if (!split || split.timeSeconds === null) return "—";
  return formatTime(split.timeSeconds);
}

const hasAnyPowerMetrics = computed(() => {
  return activeActivities.value.some((a) => {
    const stats = statsById.value[a.id];
    if (!stats?.powerMetrics) return false;
    return (
      stats.powerMetrics.normalizedPower !== null ||
      stats.powerMetrics.best12MinPower !== null ||
      stats.powerMetrics.best20MinPower !== null
    );
  });
});

const hasNormalizedPower = computed(() => {
  return activeActivities.value.some(
    (a) => statsById.value[a.id]?.powerMetrics?.normalizedPower !== null,
  );
});

const has12MinPower = computed(() => {
  return activeActivities.value.some(
    (a) => statsById.value[a.id]?.powerMetrics?.best12MinPower !== null,
  );
});

const has20MinPower = computed(() => {
  return activeActivities.value.some(
    (a) => statsById.value[a.id]?.powerMetrics?.best20MinPower !== null,
  );
});

function formatPowerMetric(
  activityId: string,
  metric: "normalizedPower" | "best12MinPower" | "best20MinPower",
): string {
  const stats = statsById.value[activityId];
  if (!stats?.powerMetrics) return "—";
  const value = stats.powerMetrics[metric];
  if (value === null || value === undefined) return "—";
  return formatPower(value);
}

function formatDelta(field: "durationSeconds" | "distanceMeters", activityId: string): string {
  if (!isBaselineActive.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current[field];
  const b = base[field];
  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.5 && absPct < 0.05) return "—";

  const diffLabel =
    field === "durationSeconds"
      ? `${diff >= 0 ? "+" : ""}${Math.round(diff)}s`
      : `${diff >= 0 ? "+" : ""}${Math.round(diff)}m`;
  const formattedPct = pct !== null ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel = pct !== null ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}

function formatCaloriesDelta(activityId: string): string {
  if (!isBaselineActive.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current.calories;
  const b = base.calories;
  if (a === null || b === null) return "—";
  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 1 && absPct < 0.05) return "—";

  const diffLabel = `${diff >= 0 ? "+" : ""}${Math.round(diff)} kcal`;
  const formattedPct = pct !== null ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel = pct !== null ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}

function formatNullableDelta(
  field: "elevationGainMeters" | "elevationLossMeters",
  activityId: string,
): string {
  if (!isBaselineActive.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current[field];
  const b = base[field];
  if (a === null || b === null) return "—";
  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.5 && absPct < 0.05) return "—";

  const diffLabel = `${diff >= 0 ? "+" : ""}${Math.round(diff)}m`;
  const formattedPct = pct !== null ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel = pct !== null ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}

function formatMetricAvgDelta(metric: MetricType, activityId: string): string {
  if (!isBaselineActive.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current.metrics[metric].avg;
  const b = base.metrics[metric].avg;
  if (a === null || b === null) return "—";

  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.05 && absPct < 0.05) return "—";

  const unit = getMetricUnit(metric);
  const formattedDiff = diff.toFixed(1).replace(/\.0$/, "");
  const diffLabel = `${diff >= 0 ? "+" : ""}${formattedDiff} ${unit}`;
  const formattedPct = pct !== null && absPct >= 0.05 ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel =
    pct !== null && absPct >= 0.05 ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}

function formatMetricMinDelta(metric: MetricType, activityId: string): string {
  if (!isBaselineActive.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current.metrics[metric].min;
  const b = base.metrics[metric].min;
  if (a === null || b === null) return "—";

  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.05 && absPct < 0.05) return "—";

  const unit = getMetricUnit(metric);
  const formattedDiff = diff.toFixed(1).replace(/\.0$/, "");
  const diffLabel = `${diff >= 0 ? "+" : ""}${formattedDiff} ${unit}`;
  const formattedPct = pct !== null && absPct >= 0.05 ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel =
    pct !== null && absPct >= 0.05 ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}

function formatMetricMaxDelta(metric: MetricType, activityId: string): string {
  if (!isBaselineActive.value) return "";
  const base = baselineStats.value;
  if (!base) return "—";
  const current = statsById.value[activityId];
  if (!current) return "—";

  const a = current.metrics[metric].max;
  const b = base.metrics[metric].max;
  if (a === null || b === null) return "—";

  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === baselineActivityId.value) return "baseline";
  if (absDiff < 0.05 && absPct < 0.05) return "—";

  const unit = getMetricUnit(metric);
  const formattedDiff = diff.toFixed(1).replace(/\.0$/, "");
  const diffLabel = `${diff >= 0 ? "+" : ""}${formattedDiff} ${unit}`;
  const formattedPct = pct !== null && absPct >= 0.05 ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel =
    pct !== null && absPct >= 0.05 ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
}
</script>
