<template>
  <div class="mb-3 flex flex-col gap-3 sm:mb-4">
    <p class="mt-0 text-xs text-gray-500 sm:text-sm">
      {{ descriptionText }}
    </p>
    <div
      v-if="isChartWindowActive"
      class="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-900 sm:text-xs"
    >
      <span class="font-semibold">Showing visible chart window</span>
      <span class="text-amber-800">
        {{ chartWindowDisplayText }}
      </span>
      <button
        type="button"
        class="ml-auto flex items-center justify-center rounded p-1 hover:bg-amber-100 focus:ring-1 focus:ring-amber-300 focus:outline-none"
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

    <div class="flex flex-wrap justify-between gap-3">
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-700 sm:text-sm">Display:</label>
        <div
          class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-0.5"
        >
          <button
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
            :class="
              overviewDisplayMode === 'light'
                ? 'bg-primary text-white'
                : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
            "
            @click="uiStore.setOverviewDisplayMode('light')"
            title="Show only key metrics with averages: heart rate, altitude, and power"
            aria-label="Light view"
            :aria-pressed="overviewDisplayMode === 'light'"
          >
            Light
          </button>
          <button
            type="button"
            class="rounded-sm px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:py-1.5 sm:text-sm"
            :class="
              overviewDisplayMode === 'full'
                ? 'bg-primary text-white'
                : 'text-gray-600 active:bg-gray-50 sm:hover:bg-gray-50'
            "
            @click="uiStore.setOverviewDisplayMode('full')"
            title="Show all available metrics and details"
            aria-label="Full details view"
            :aria-pressed="overviewDisplayMode === 'full'"
          >
            Full
          </button>
        </div>
      </div>
      <div v-if="showBaseline" class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          class="flex cursor-pointer items-center gap-1.5 whitespace-nowrap"
          title="Enable comparison with a baseline activity. Delta values show the difference between each activity and the selected baseline."
        >
          <input
            type="checkbox"
            :checked="overviewBaselineEnabled"
            class="text-primary focus:ring-primary h-4 w-4 cursor-pointer rounded-sm border-gray-300"
            @change="(e) => uiStore.setOverviewBaselineEnabled((e.target as HTMLInputElement).checked)"
          />
          <span class="text-[10px] font-medium text-gray-600 sm:text-xs"
            >Enable Baseline Comparison</span
          >
        </label>
        <select
          v-if="overviewBaselineEnabled"
          :value="overviewBaselineActivityId || ''"
          class="baseline-select focus:border-primary focus:ring-primary/10 w-full rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:ring-2 focus:outline-hidden sm:w-auto sm:min-w-[180px] sm:px-3 sm:text-sm"
          @change="(e) => uiStore.setOverviewBaselineActivityId((e.target as HTMLSelectElement).value || null)"
        >
          <option v-for="a in activeActivities" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </div>
    </div>
  </div>

  <div class="overflow-x-auto rounded-md border border-gray-200 bg-white">
    <table class="w-full table-auto border-collapse text-left text-xs sm:text-sm">
      <thead class="bg-gray-50 text-gray-700">
        <tr>
          <th
            class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2.5 font-semibold sm:w-24 sm:px-3 md:w-36 lg:w-44"
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
            class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
            class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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

        <tr v-if="overviewDisplayMode === 'full' && hasAnySport" class="bg-white">
          <td
            class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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

        <tr v-if="overviewDisplayMode === 'full' && hasAnyCalories" class="bg-white">
          <td
            class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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

        <template v-if="overviewDisplayMode === 'full' && hasAnyElevation">
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
                  formatNullableDelta('elevationGainMeters', a.id) === '—' ? 'Same as baseline' : ''
                "
              >
                {{ formatNullableDelta("elevationGainMeters", a.id) }}
              </div>
            </td>
          </tr>
          <tr class="bg-white">
            <td
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
                  formatNullableDelta('elevationLossMeters', a.id) === '—' ? 'Same as baseline' : ''
                "
              >
                {{ formatNullableDelta("elevationLossMeters", a.id) }}
              </div>
            </td>
          </tr>
        </template>

        <template v-if="overviewDisplayMode === 'light'" v-for="metric in metrics" :key="metric">
          <tr class="bg-white">
            <td
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
            >
              <span :title="getMetricDescription(getMetricName(metric))"
                >{{ getMetricName(metric) }} (ave)</span
              >
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
        </template>

        <template v-if="overviewDisplayMode === 'full'" v-for="metric in metrics" :key="metric">
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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

        <template v-if="overviewDisplayMode === 'full' && hasAnyLaps">
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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

        <template
          v-if="
            overviewDisplayMode === 'full' &&
            hasAnyAdditionalMetrics &&
            availableAdditionalMetrics.length > 0
          "
        >
          <template v-for="fieldName in availableAdditionalMetrics" :key="fieldName">
            <tr class="bg-gray-50">
              <td
                colspan="2"
                class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
              >
                <span :title="getMetricDescription(getAdditionalMetricDisplayName(fieldName))">{{
                  getAdditionalMetricDisplayName(fieldName)
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
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.min === null ||
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.min === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.min !== null &&
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.min !== undefined
                      ? formatAdditionalMetricValue(
                          fieldName,
                          statsById[a.id]!.additionalMetrics![fieldName]!.min!,
                        )
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="
                    formatAdditionalMetricDelta(a.id, fieldName, 'min') === '—'
                      ? 'Same as baseline'
                      : ''
                  "
                >
                  {{ formatAdditionalMetricDelta(a.id, fieldName, "min") }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.avg === null ||
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.avg === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.avg !== null &&
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.avg !== undefined
                      ? formatAdditionalMetricValue(
                          fieldName,
                          statsById[a.id]!.additionalMetrics![fieldName]!.avg!,
                        )
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="
                    formatAdditionalMetricDelta(a.id, fieldName, 'avg') === '—'
                      ? 'Same as baseline'
                      : ''
                  "
                >
                  {{ formatAdditionalMetricDelta(a.id, fieldName, "avg") }}
                </div>
              </td>
            </tr>
            <tr class="bg-white">
              <td
                class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.max === null ||
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.max === undefined
                      ? 'text-gray-400'
                      : ''
                  "
                >
                  {{
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.max !== null &&
                    statsById[a.id]?.additionalMetrics?.[fieldName]?.max !== undefined
                      ? formatAdditionalMetricValue(
                          fieldName,
                          statsById[a.id]!.additionalMetrics![fieldName]!.max!,
                        )
                      : "—"
                  }}
                </div>
                <div
                  v-if="isBaselineActive"
                  class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                  :title="
                    formatAdditionalMetricDelta(a.id, fieldName, 'max') === '—'
                      ? 'Same as baseline'
                      : ''
                  "
                >
                  {{ formatAdditionalMetricDelta(a.id, fieldName, "max") }}
                </div>
              </td>
            </tr>
          </template>
        </template>

        <template v-if="overviewDisplayMode === 'full' && hasAnyBestSplits">
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
              class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
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
              <div
                v-if="isBaselineActive"
                class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
                :title="formatBestSplitDelta(a.id, splitLabel) === '—' ? 'Same as baseline' : ''"
              >
                {{ formatBestSplitDelta(a.id, splitLabel) }}
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useActivityList } from "~/composables/useActivityList";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { useWindowActivityStore } from "~/stores/windowActivity";
import { useUIStore } from "~/stores/ui";
import { computeActivityStatsFromRecords, computeActivityStats } from "~/utils/activity-stats";
import {
  formatDistance,
  formatMetricValue,
  formatTime,
  formatSpeed,
  formatPower,
} from "~/utils/format";
import type { MetricType } from "~/utils/chart-config";
import { METRIC_LABELS, METRIC_ORDER } from "~/utils/chart-config";
import type { Activity } from "~/types/activity";
import { METRIC_DESCRIPTIONS } from "~/utils/metric-descriptions";
import { COMMON_SPLITS } from "~/utils/best-splits";
import {
  computeGlobalXExtent,
  filterRecordsByXRange,
  isPercentWindowActive,
  percentWindowToXRange,
} from "~/utils/windowing";
import { DEFAULT_CHART_TRANSFORM_SETTINGS } from "~/utils/chart-settings";
import { formatXAxisValue } from "~/utils/chart-config";

const { activeActivities } = useActivityList();
const settingsStore = useActivitySettingsStore();
const chartOptionsStore = useChartOptionsStore();
const chartSeriesStore = useChartSeriesStore();
const windowStore = useWindowActivityStore();
const uiStore = useUIStore();

const { disabledActivities } = storeToRefs(settingsStore);
const { xAxisType, viewMode } = storeToRefs(chartOptionsStore);
const { chartWindow } = storeToRefs(windowStore);
const {
  overviewDisplayMode,
  overviewBaselineEnabled,
  overviewBaselineActivityId,
} = storeToRefs(uiStore);

const showBaseline = computed(() => activeActivities.value.length >= 2);
const isBaselineActive = computed(() => showBaseline.value && overviewBaselineEnabled.value);
const descriptionText = computed(() =>
  isBaselineActive.value
    ? "Min, average, and max values per activity, compared to the baseline."
    : showBaseline.value
      ? "Min, average, and max values per activity."
      : "Min, average, and max values for this activity.",
);

watch(
  activeActivities,
  (next) => {
    if (next.length === 0) {
      uiStore.setOverviewBaselineActivityId(null);
      return;
    }
    if (!overviewBaselineActivityId.value || !next.some((a) => a.id === overviewBaselineActivityId.value)) {
      const first = next[0];
      if (first) {
        uiStore.setOverviewBaselineActivityId(first.id);
      }
    }
  },
  { immediate: true },
);

const clearChartWindow = () => {
  windowStore.setChartWindow({
    xStartPercent: 0,
    xEndPercent: 100,
    yStartPercent: 0,
    yEndPercent: 100,
  });
};

const metricLabels = METRIC_LABELS;

const lightModeMetrics: readonly MetricType[] = ["alt", "hr", "pwr"] as const;

const metrics = computed(() => {
  // Use canonical metric order, filter to only available metrics
  const available = METRIC_ORDER.filter((metric) => {
    return activeActivities.value.some((activity) => {
      const stats = statsById.value[activity.id];
      if (!stats) return false;
      const metricStats = stats.metrics[metric];
      return metricStats.avg !== null || metricStats.min !== null || metricStats.max !== null;
    });
  });

  if (overviewDisplayMode.value === "light") {
    // In light mode, show metrics in canonical order but only those in lightModeMetrics
    return available.filter((metric) => lightModeMetrics.includes(metric));
  }

  return available;
});

const getMetricName = (metric: MetricType): string => {
  const label = metricLabels[metric];
  const match = label.match(/^(.+?)\s*\(/);
  return match ? match[1]!.trim() : label;
};

const getMetricDescription = (metricName: string): string => {
  return METRIC_DESCRIPTIONS[metricName] || "";
};

const getMetricUnit = (metric: MetricType): string => {
  const label = metricLabels[metric];
  const match = label.match(/\(([^)]+)\)/);
  return match ? match[1]! : "";
};

const chartTransforms = computed(() => ({
  viewMode: viewMode.value,
  outliers: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.outliers },
  smoothing: chartSeriesStore.transformationSettings.smoothing,
  gpsSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.gpsSmoothing },
  paceSmoothing: { ...DEFAULT_CHART_TRANSFORM_SETTINGS.paceSmoothing },
  cumulative: chartSeriesStore.transformationSettings.cumulative,
  pivotZones: chartSeriesStore.transformationSettings.pivotZones,
}));

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

const isChartWindowActive = computed(() => {
  const w = chartWindow.value;
  return w.xStartPercent > 0 || w.xEndPercent < 100;
});

const chartWindowDisplayText = computed(() => {
  if (!isChartWindowActive.value) return "";
  
  const w = chartWindow.value;
  const acts = activeActivities.value;
  const extent = computeGlobalXExtent(acts, xAxisType.value);
  
  if (!extent) return "";
  
  const range = percentWindowToXRange(extent, {
    startPercent: w.xStartPercent,
    endPercent: w.xEndPercent,
  });
  
  const startFormatted = formatXAxisValue(range.lo, xAxisType.value);
  const endFormatted = formatXAxisValue(range.hi, xAxisType.value);
  
  return `X: ${startFormatted}–${endFormatted}`;
});

const baselineStats = computed(() => {
  if (!showBaseline.value) return null;
  const id = overviewBaselineActivityId.value;
  if (!id) return null;
  return statsById.value[id] ?? null;
});


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

const hasAnyAdditionalMetrics = computed(() => {
  if (activeActivities.value.length === 0) return false;
  return activeActivities.value.some((a) => {
    const stats = statsById.value[a.id];
    if (!stats?.additionalMetrics) return false;
    return Object.keys(stats.additionalMetrics).length > 0;
  });
});

const availableAdditionalMetrics = computed(() => {
  const allFields = new Set<string>();
  for (const a of activeActivities.value) {
    const stats = statsById.value[a.id];
    if (stats?.additionalMetrics) {
      Object.keys(stats.additionalMetrics).forEach((key) => allFields.add(key));
    }
  }
  return Array.from(allFields).sort();
});

function formatAdditionalMetricValue(fieldName: string, value: number): string {
  if (fieldName.includes("stance_time_ms")) {
    return `${Math.round(value)} ms`;
  }
  if (fieldName.includes("vertical_oscillation_mm")) {
    return `${Math.round(value)} mm`;
  }
  if (fieldName.includes("step_length_cm")) {
    return `${value.toFixed(1)} cm`;
  }
  if (fieldName.includes("gct_balance")) {
    return `${value.toFixed(1)}%`;
  }
  if (fieldName.includes("atemp_c")) {
    return `${Math.round(value)}°C`;
  }
  if (fieldName === "satellites") {
    return `${Math.round(value)}`;
  }
  if (fieldName === "hdop" || fieldName === "vdop") {
    return value.toFixed(2);
  }
  return value.toFixed(1);
}

function getAdditionalMetricDisplayName(fieldName: string): string {
  const knownNames: Record<string, string> = {
    stance_time_ms: "Stance Time",
    vertical_oscillation_mm: "Vertical Oscillation",
    step_length_cm: "Step Length",
    gct_balance: "GCT Balance",
    atemp_c: "Ambient Temperature",
    satellites: "Satellites",
    hdop: "HDOP",
    vdop: "VDOP",
  };

  if (knownNames[fieldName]) {
    return knownNames[fieldName]!;
  }

  let displayName = fieldName;

  const unitSuffixes: Record<string, string> = {
    _ms: " (ms)",
    _mm: " (mm)",
    _cm: " (cm)",
    _m: " (m)",
    _s: " (s)",
    _c: " (°C)",
    _f: " (°F)",
    _bpm: " (bpm)",
    _rpm: " (rpm)",
    _w: " (W)",
    _watts: " (W)",
  };

  let unit = "";
  for (const [suffix, unitLabel] of Object.entries(unitSuffixes)) {
    if (fieldName.endsWith(suffix)) {
      displayName = fieldName.slice(0, -suffix.length);
      unit = unitLabel;
      break;
    }
  }

  displayName = displayName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\b(Gps|Gps|Hr|Cad|Pwr|Temp|Alt|Sat|Hdop|Vdop|Gct|Atemp)\b/gi, (match) => {
      const upper = match.toUpperCase();
      if (
        upper === "GPS" ||
        upper === "HR" ||
        upper === "CAD" ||
        upper === "PWR" ||
        upper === "TEMP" ||
        upper === "ALT" ||
        upper === "SAT" ||
        upper === "HDOP" ||
        upper === "VDOP" ||
        upper === "GCT" ||
        upper === "ATEMP"
      ) {
        return upper;
      }
      return match;
    });

  return displayName + unit;
}

function formatAdditionalMetricDelta(
  activityId: string,
  fieldName: string,
  statType: "min" | "avg" | "max",
): string {
  if (!isBaselineActive.value) return "";
  const base = baselineStats.value;
  if (!base?.additionalMetrics?.[fieldName]) return "—";
  const current = statsById.value[activityId];
  if (!current?.additionalMetrics?.[fieldName]) return "—";

  const baseStat = base.additionalMetrics[fieldName]?.[statType];
  const currentStat = current.additionalMetrics[fieldName]?.[statType];
  if (baseStat === null || baseStat === undefined) return "—";
  if (currentStat === null || currentStat === undefined) return "—";

  if (activityId === overviewBaselineActivityId.value) return "baseline";

  const diff = currentStat - baseStat;
  const pct = baseStat === 0 ? null : (diff / baseStat) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (absDiff < 0.01 && absPct < 0.05) return "—";

  const formattedDiff = formatAdditionalMetricValue(fieldName, diff);
  const formattedPct = pct !== null ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel = pct !== null ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diff >= 0 ? "+" : ""}${formattedDiff}${pctLabel}`;
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

function formatBestSplitDelta(activityId: string, splitLabel: string): string {
  if (!isBaselineActive.value) return "";
  const base = baselineStats.value;
  if (!base?.bestSplits) return "—";
  const current = statsById.value[activityId];
  if (!current?.bestSplits) return "—";

  const baseSplit = base.bestSplits[splitLabel];
  const currentSplit = current.bestSplits[splitLabel];
  if (!baseSplit || baseSplit.timeSeconds === null) return "—";
  if (!currentSplit || currentSplit.timeSeconds === null) return "—";

  const a = currentSplit.timeSeconds;
  const b = baseSplit.timeSeconds;
  const diff = a - b;
  const pct = b === 0 ? null : (diff / b) * 100;
  const absDiff = Math.abs(diff);
  const absPct = pct !== null ? Math.abs(pct) : 0;

  if (activityId === overviewBaselineActivityId.value) return "baseline";
  if (absDiff < 0.5 && absPct < 0.05) return "—";

  const diffLabel = `${diff >= 0 ? "+" : ""}${Math.round(diff)}s`;
  const formattedPct = pct !== null ? pct.toFixed(1).replace(/\.0$/, "") : "";
  const pctLabel = pct !== null ? ` (${diff >= 0 ? "+" : ""}${formattedPct}%)` : "";
  return `${diffLabel}${pctLabel}`;
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

  if (activityId === overviewBaselineActivityId.value) return "baseline";
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

  if (activityId === overviewBaselineActivityId.value) return "baseline";
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

  if (activityId === overviewBaselineActivityId.value) return "baseline";
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

  if (activityId === overviewBaselineActivityId.value) return "baseline";
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

  if (activityId === overviewBaselineActivityId.value) return "baseline";
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

  if (activityId === overviewBaselineActivityId.value) return "baseline";
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
