import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import ChatView from '../../src/components/ChatView.vue'

const NOW = new Date('2026-11-16T10:42:00').getTime()

function mountChat(overrides = {}) {
  return mount(ChatView, {
    props: {
      roomId: 'demo',
      myName: 'Аліса',
      peers: [{id: 'peer-1', name: 'Богдан'}],
      messages: [],
      typing: '',
      unread: 0,
      ...overrides
    },
    attachTo: document.body
  })
}

describe('ChatView', () => {
  it('lists the current user and peers', () => {
    const wrapper = mountChat()

    const contacts = wrapper.findAll('.contact-name').map(item => item.text())

    expect(contacts[0]).toContain('Аліса')
    expect(contacts[1]).toContain('Богдан')
    expect(wrapper.find('.room-name').text()).toBe('demo')
    expect(wrapper.find('.chat-sub').text()).toContain('2 онлайн')

    wrapper.unmount()
  })

  it('shows the empty state when there are no chat messages', () => {
    const wrapper = mountChat()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state').text()).toContain('Повідомлень ще немає')

    wrapper.unmount()
  })

  it('renders own and incoming messages with a date separator', () => {
    const wrapper = mountChat({
      messages: [
        {id: 'm1', kind: 'chat', author: 'Богдан', text: 'Привіт', time: NOW, own: false},
        {id: 'm2', kind: 'chat', author: 'Аліса', text: 'Привіт у відповідь', time: NOW + 1000, own: true, status: 'read'}
      ]
    })

    const bubbles = wrapper.findAll('.message')

    expect(wrapper.find('.date-separator').text()).toBe('Сьогодні')
    expect(bubbles).toHaveLength(2)
    expect(bubbles[0].classes()).not.toContain('is-own')
    expect(bubbles[1].classes()).toContain('is-own')
    expect(bubbles[1].find('.ticks').classes()).toContain('is-read')
    expect(wrapper.findAll('.bubble-text').map(item => item.text())).toEqual(['Привіт', 'Привіт у відповідь'])

    wrapper.unmount()
  })

  it('renders system notes and file messages', () => {
    const wrapper = mountChat({
      messages: [
        {id: 's1', kind: 'system', text: 'Богдан тепер у кімнаті'},
        {
          id: 'f1',
          kind: 'file',
          author: 'Богдан',
          time: NOW,
          own: false,
          file: {name: 'report.pdf', type: 'application/pdf', size: 2048, url: 'blob:test'}
        }
      ]
    })

    expect(wrapper.find('.system-note').text()).toBe('Богдан тепер у кімнаті')
    expect(wrapper.find('.file-card').text()).toContain('report.pdf')
    expect(wrapper.find('.file-card').text()).toContain('2.0 КБ')

    wrapper.unmount()
  })

  it('shows the typing indicator', () => {
    const wrapper = mountChat({typing: 'Богдан друкує…'})

    expect(wrapper.find('.typing').text()).toContain('Богдан друкує…')

    wrapper.unmount()
  })

  it('emits send on submit and clears the draft', async () => {
    const wrapper = mountChat()
    const textarea = wrapper.find('#message')

    await textarea.setValue('Привіт з тесту')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('send')).toEqual([['Привіт з тесту']])
    expect(textarea.element.value).toBe('')

    wrapper.unmount()
  })

  it('emits typing while the draft is not empty', async () => {
    const wrapper = mountChat()

    await wrapper.find('#message').setValue('щось')

    expect(wrapper.emitted('typing')).toHaveLength(1)

    wrapper.unmount()
  })

  it('inserts an emoji into the draft', async () => {
    const wrapper = mountChat()

    await wrapper.find('button[aria-label="Емодзі"]').trigger('click')
    expect(wrapper.find('.emoji-popover').exists()).toBe(true)

    await wrapper.findAll('.emoji-item')[0].trigger('click')

    expect(wrapper.find('#message').element.value).toBe('😀')
    expect(wrapper.find('.emoji-popover').exists()).toBe(false)

    wrapper.unmount()
  })

  it('emits leave from the sidebar button', async () => {
    const wrapper = mountChat()

    await wrapper.find('.sidebar-foot button').trigger('click')

    expect(wrapper.emitted('leave')).toHaveLength(1)

    wrapper.unmount()
  })
})
