import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeOffsetControl from '~/components/TimeOffsetControl.vue'

describe('TimeOffsetControl', () => {
  it('should render with initial offset value', () => {
    const wrapper = mount(TimeOffsetControl, {
      props: {
        offset: 10
      }
    })

    const input = wrapper.find('input[type="number"]')
    expect((input.element as HTMLInputElement).value).toBe('10')
  })

  it('should emit update:offset when buttons are clicked', async () => {
    const wrapper = mount(TimeOffsetControl, {
      props: {
        offset: 0
      }
    })

    const plusOneButton = wrapper.findAll('button').find(btn => btn.text() === '+1')
    await plusOneButton?.trigger('click')

    expect(wrapper.emitted('update:offset')).toBeTruthy()
    expect(wrapper.emitted('update:offset')?.[0]).toEqual([1])
  })

  it('should emit update:offset when input value changes', async () => {
    const wrapper = mount(TimeOffsetControl, {
      props: {
        offset: 0
      }
    })

    const input = wrapper.find('input[type="number"]')
    await input.setValue('15')

    expect(wrapper.emitted('update:offset')).toBeTruthy()
    expect(wrapper.emitted('update:offset')?.[0]).toEqual([15])
  })

  it('should reset to 0 when reset button is clicked', async () => {
    const wrapper = mount(TimeOffsetControl, {
      props: {
        offset: 10
      }
    })

    const resetButton = wrapper.find('button[title="Reset to 0"]')
    await resetButton.trigger('click')

    expect(wrapper.emitted('update:offset')).toBeTruthy()
    expect(wrapper.emitted('update:offset')?.[0]).toEqual([0])
  })
})


