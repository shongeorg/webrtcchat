import {beforeEach, describe, expect, it, vi} from 'vitest'
import {defineComponent, h} from 'vue'
import {mount} from '@vue/test-utils'
import {joinRoom} from '@trystero-p2p/mqtt'
import {useChatRoom} from '../../src/composables/useChatRoom'

vi.mock('@trystero-p2p/mqtt', () => ({joinRoom: vi.fn()}))

class SilentAudio {
  constructor(src) {
    this.src = src
    this.currentTime = 0
    this.volume = 1
    this.loop = false
  }

  play() {
    return Promise.resolve()
  }

  pause() {}
}

let fakeRoom
let fakeActions
let fakePeers

function createFakeRoom() {
  const actions = {}
  const peers = {}
  const room = {
    makeAction: vi.fn(name => {
      const action = {send: vi.fn(() => Promise.resolve()), onMessage: null}
      actions[name] = action
      return action
    }),
    getPeers: vi.fn(() => peers),
    leave: vi.fn(),
    addStream: vi.fn(),
    removeStream: vi.fn(),
    onPeerJoin: null,
    onPeerLeave: null,
    onPeerStream: null
  }

  joinRoom.mockReturnValue(room)
  fakeRoom = room
  fakeActions = actions
  fakePeers = peers

  return room
}

function mountRoom() {
  const Host = defineComponent({
    setup() {
      return useChatRoom()
    },
    render() {
      return h('div')
    }
  })

  return mount(Host)
}

describe('useChatRoom', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('Audio', SilentAudio)
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    createFakeRoom()
  })

  it('joins the room and announces the local user', () => {
    const wrapper = mountRoom()

    wrapper.vm.join('demo', 'Аліса')

    expect(joinRoom).toHaveBeenCalledWith({appId: expect.any(String)}, 'demo')
    expect(wrapper.vm.roomId).toBe('demo')
    expect(wrapper.vm.myName).toBe('Аліса')
    expect(wrapper.vm.messages[0].text).toContain('Ви приєдналися')

    fakeRoom.onPeerJoin('peer-1')

    expect(fakeActions.name.send).toHaveBeenCalledWith('Аліса', {target: 'peer-1'})

    wrapper.unmount()
  })

  it('sends a message and stores it as own', () => {
    const wrapper = mountRoom()
    wrapper.vm.join('demo', 'Аліса')

    wrapper.vm.sendMessage('  Привіт  ')

    const payload = fakeActions.chat.send.mock.calls[0][0]

    expect(payload).toMatchObject({name: 'Аліса', text: 'Привіт'})
    expect(wrapper.vm.messages.at(-1)).toMatchObject({text: 'Привіт', own: true, status: 'sent'})
    expect(localStorage.getItem('webrtcchat.history.demo')).toContain('Привіт')

    wrapper.unmount()
  })

  it('ignores blank messages', () => {
    const wrapper = mountRoom()
    wrapper.vm.join('demo', 'Аліса')

    wrapper.vm.sendMessage('   ')

    expect(fakeActions.chat.send).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('receives a message, remembers the peer and acknowledges it', () => {
    const wrapper = mountRoom()
    wrapper.vm.join('demo', 'Аліса')
    fakePeers['peer-1'] = {}

    fakeActions.chat.onMessage(
      {id: 'm1', name: 'Богдан', text: 'Йо', time: Date.now()},
      {peerId: 'peer-1'}
    )

    expect(wrapper.vm.messages.at(-1)).toMatchObject({author: 'Богдан', text: 'Йо', own: false})
    expect(wrapper.vm.peers).toEqual([{id: 'peer-1', name: 'Богдан'}])
    expect(fakeActions.ack.send).toHaveBeenCalledWith({id: 'm1', state: 'read'})

    wrapper.unmount()
  })

  it('upgrades delivery status without downgrading it', () => {
    const wrapper = mountRoom()
    wrapper.vm.join('demo', 'Аліса')
    wrapper.vm.sendMessage('Привіт')

    const id = fakeActions.chat.send.mock.calls[0][0].id

    fakeActions.ack.onMessage({id, state: 'delivered'}, {peerId: 'peer-1'})
    expect(wrapper.vm.messages.at(-1).status).toBe('delivered')

    fakeActions.ack.onMessage({id, state: 'read'}, {peerId: 'peer-1'})
    expect(wrapper.vm.messages.at(-1).status).toBe('read')

    fakeActions.ack.onMessage({id, state: 'delivered'}, {peerId: 'peer-1'})
    expect(wrapper.vm.messages.at(-1).status).toBe('read')

    wrapper.unmount()
  })

  it('broadcasts typing state once and shows incoming typing', () => {
    const wrapper = mountRoom()
    wrapper.vm.join('demo', 'Аліса')

    wrapper.vm.notifyTyping()
    wrapper.vm.notifyTyping()

    expect(fakeActions.typing.send).toHaveBeenCalledTimes(1)
    expect(fakeActions.typing.send).toHaveBeenCalledWith({name: 'Аліса', typing: true})

    fakeActions.typing.onMessage({name: 'Богдан', typing: true}, {peerId: 'peer-1'})
    expect(wrapper.vm.typingText).toContain('Богдан друкує')

    fakeActions.typing.onMessage({name: 'Богдан', typing: false}, {peerId: 'peer-1'})
    expect(wrapper.vm.typingText).toBe('')

    wrapper.vm.stopTyping()
    expect(fakeActions.typing.send).toHaveBeenLastCalledWith({name: 'Аліса', typing: false})

    wrapper.unmount()
  })

  it('rejects files larger than 25 MB', async () => {
    const wrapper = mountRoom()
    wrapper.vm.join('demo', 'Аліса')

    await wrapper.vm.sendFiles([{name: 'big.bin', size: 26 * 1024 * 1024, type: 'application/octet-stream'}])

    expect(fakeActions.file.send).not.toHaveBeenCalled()
    expect(wrapper.vm.notices.at(-1)).toMatchObject({tone: 'error'})

    wrapper.unmount()
  })

  it('sends a small file with metadata', async () => {
    const wrapper = mountRoom()
    wrapper.vm.join('demo', 'Аліса')

    await wrapper.vm.sendFiles([{name: 'note.txt', size: 12, type: 'text/plain'}])

    expect(fakeActions.file.send).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.messages.at(-1)).toMatchObject({kind: 'file', own: true})

    wrapper.unmount()
  })

  it('restores the local history after rejoining', () => {
    const first = mountRoom()
    first.vm.join('demo', 'Аліса')
    first.vm.sendMessage('Збережене повідомлення')
    first.unmount()

    const second = mountRoom()
    second.vm.join('demo', 'Аліса')

    expect(second.vm.messages.some(message => message.text === 'Збережене повідомлення')).toBe(true)

    second.unmount()
  })

  it('leaves the room and clears the state', () => {
    const wrapper = mountRoom()
    wrapper.vm.join('demo', 'Аліса')

    wrapper.vm.leave()

    expect(fakeRoom.leave).toHaveBeenCalled()
    expect(wrapper.vm.roomId).toBe('')
    expect(wrapper.vm.messages).toEqual([])
    expect(wrapper.vm.peers).toEqual([])

    wrapper.unmount()
  })
})
