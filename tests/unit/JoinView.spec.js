import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import JoinView from '../../src/components/JoinView.vue'

describe('JoinView', () => {
  it('renders the prefilled profile values', () => {
    const wrapper = mount(JoinView, {
      props: {initialName: 'Олег', initialRoom: 'demo'}
    })

    expect(wrapper.find('#name').element.value).toBe('Олег')
    expect(wrapper.find('#room').element.value).toBe('demo')
  })

  it('emits join with trimmed room and name', async () => {
    const wrapper = mount(JoinView)

    await wrapper.find('#name').setValue('  Олег  ')
    await wrapper.find('#room').setValue('  demo  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('join')).toEqual([['demo', 'Олег']])
  })

  it('does not emit join when a field is blank', async () => {
    const wrapper = mount(JoinView)

    await wrapper.find('#name').setValue('Олег')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('join')).toBeUndefined()
  })
})
