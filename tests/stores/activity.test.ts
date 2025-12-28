import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useActivityStore } from '~/stores/activity'
import type { ActivityRecord } from '~/types/activity'

describe('useActivityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('addActivity', () => {
    it('should add a new activity', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [
        { t: 0, d: 0, hr: 120 },
        { t: 1, d: 10, hr: 125 }
      ]

      store.addActivity(records, 'Test Activity')

      expect(store.activities).toHaveLength(1)
      expect(store.activities[0].name).toBe('Test Activity')
      expect(store.activities[0].records).toEqual(records)
      expect(store.activities[0].offset).toBe(0)
      expect(store.activities[0].color).toBeDefined()
    })

    it('should assign different colors to multiple activities', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [{ t: 0, d: 0 }]

      store.addActivity(records, 'Activity 1')
      store.addActivity(records, 'Activity 2')

      expect(store.activities[0].color).not.toBe(store.activities[1].color)
    })
  })

  describe('removeActivity', () => {
    it('should remove an activity by id', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [{ t: 0, d: 0 }]

      store.addActivity(records, 'Activity 1')
      store.addActivity(records, 'Activity 2')

      const idToRemove = store.activities[0].id
      store.removeActivity(idToRemove)

      expect(store.activities).toHaveLength(1)
      expect(store.activities[0].name).toBe('Activity 2')
    })
  })

  describe('updateOffset', () => {
    it('should update the time offset for an activity', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [{ t: 0, d: 0 }]

      store.addActivity(records, 'Test Activity')
      const activityId = store.activities[0].id

      store.updateOffset(activityId, 10)

      expect(store.activities[0].offset).toBe(10)
    })
  })

  describe('clearAll', () => {
    it('should remove all activities and reset metric', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [{ t: 0, d: 0 }]

      store.addActivity(records, 'Activity 1')
      store.addActivity(records, 'Activity 2')
      store.setMetric('alt')

      store.clearAll()

      expect(store.activities).toHaveLength(0)
      expect(store.selectedMetric).toBe('hr')
    })
  })

  describe('availableMetrics', () => {
    it('should return empty array when no activities', () => {
      const store = useActivityStore()
      expect(store.availableMetrics).toEqual([])
    })

    it('should detect available metrics from activities', () => {
      const store = useActivityStore()
      const recordsWithHR: ActivityRecord[] = [
        { t: 0, d: 0, hr: 120 }
      ]
      const recordsWithAlt: ActivityRecord[] = [
        { t: 0, d: 0, alt: 100 }
      ]

      store.addActivity(recordsWithHR, 'HR Activity')
      store.addActivity(recordsWithAlt, 'Alt Activity')

      const metrics = store.availableMetrics
      expect(metrics).toContain('hr')
      expect(metrics).toContain('alt')
    })

    it('should auto-select first available metric if current is not available', () => {
      const store = useActivityStore()
      store.setMetric('pwr')

      const recordsWithHR: ActivityRecord[] = [
        { t: 0, d: 0, hr: 120 }
      ]
      store.addActivity(recordsWithHR, 'HR Activity')

      // Access availableMetrics to trigger the auto-selection logic
      // (the auto-selection is evaluated lazily in the computed property)
      const _ = store.availableMetrics
      
      expect(store.selectedMetric).toBe('hr')
    })
  })

  describe('chartSeries', () => {
    it('should generate series data with time offset applied', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [
        { t: 0, d: 0, hr: 120 },
        { t: 10, d: 100, hr: 125 }
      ]

      store.addActivity(records, 'Test Activity')
      store.updateOffset(store.activities[0].id, 5)
      store.setXAxisType('time')
      store.setMetric('hr')

      const series = store.chartSeries
      expect(series).toHaveLength(1)
      expect(series[0].data).toHaveLength(2)
      // First point should have offset applied
      expect((series[0].data[0] as [number, number])[0]).toBe(5) // t + offset
    })

    it('should return empty array when no active activities', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [
        { t: 0, d: 0, hr: 120 }
      ]

      store.addActivity(records, 'Test Activity')
      store.toggleActivity(store.activities[0].id) // Disable activity

      const series = store.chartSeries
      expect(series).toHaveLength(0)
    })

    it('should generate series for multiple metrics', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [
        { t: 0, d: 0, hr: 120, alt: 100 }
      ]

      store.addActivity(records, 'Test Activity')
      store.setMetricSelectionMode('multi')
      store.toggleMetric('hr')
      store.toggleMetric('alt')

      const series = store.chartSeries
      expect(series.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('metricSelectionMode', () => {
    it('should default to multi mode', () => {
      const store = useActivityStore()
      expect(store.metricSelectionMode).toBe('multi')
    })

    it('should switch to single mode', () => {
      const store = useActivityStore()
      store.setMetricSelectionMode('single')
      expect(store.metricSelectionMode).toBe('single')
    })

    it('should select only one metric when switching to single mode', () => {
      const store = useActivityStore()
      const records: ActivityRecord[] = [
        { t: 0, d: 0, hr: 120, alt: 100 }
      ]

      store.addActivity(records, 'Test Activity')
      store.setMetricSelectionMode('multi')
      store.toggleMetric('hr')
      store.toggleMetric('alt')

      expect(store.selectedMetrics.length).toBe(2)

      store.setMetricSelectionMode('single')
      expect(store.selectedMetrics.length).toBe(1)
    })
  })
})


