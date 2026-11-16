import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useSounds} from '../../src/composables/useSounds'

const instances = []

class FakeAudio {
  constructor(src) {
    this.src = src
    this.currentTime = 0
    this.volume = 1
    this.loop = false
    this.playing = false
    instances.push(this)
  }

  play() {
    this.playing = true
    return Promise.resolve()
  }

  pause() {
    this.playing = false
  }
}

describe('useSounds', () => {
  beforeEach(() => {
    instances.length = 0
    localStorage.clear()
    vi.stubGlobal('Audio', FakeAudio)
  })

  it('plays the notification sound by default', () => {
    const {playMessage} = useSounds()

    playMessage()

    expect(instances).toHaveLength(3)
    expect(instances[2].playing).toBe(true)
  })

  it('disables sound and persists the choice', () => {
    const {enabled, toggleSound, playMessage} = useSounds()

    toggleSound()
    playMessage()

    expect(enabled.value).toBe(false)
    expect(localStorage.getItem('webrtcchat.sound')).toBe('off')
    expect(instances[2].playing).toBe(false)
  })

  it('restores the disabled state', () => {
    localStorage.setItem('webrtcchat.sound', 'off')

    const {enabled} = useSounds()

    expect(enabled.value).toBe(false)
  })

  it('stops the ringtone when sound is turned off', () => {
    const {toggleSound, startRingtone} = useSounds()

    startRingtone()
    expect(instances[0].playing).toBe(true)

    toggleSound()
    expect(instances[0].playing).toBe(false)
  })
})
