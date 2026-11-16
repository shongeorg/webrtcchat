import {ref, watch} from 'vue'
import ringtoneUrl from '../audio/freesound_community-8-bit-telemaphone-25217.mp3'
import whistleUrl from '../audio/freesound_community-samsung-whistle-soundalike-105086.mp3'
import notificationUrl from '../audio/soundsforyou-notifications-sound-127856.mp3'

const SOUND_KEY = 'webrtcchat.sound'

function readEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

function createAudio(url, {loop = false, volume = 0.6} = {}) {
  const audio = new Audio(url)
  audio.preload = 'auto'
  audio.loop = loop
  audio.volume = volume
  return audio
}

export function useSounds() {
  const enabled = ref(readEnabled())
  const ringtone = createAudio(ringtoneUrl, {loop: true, volume: 0.5})
  const whistle = createAudio(whistleUrl, {volume: 0.6})
  const notification = createAudio(notificationUrl, {volume: 0.6})

  function play(audio) {
    if (!enabled.value) {
      return
    }

    try {
      audio.currentTime = 0
      audio.play().catch(() => {})
    } catch {
      return
    }
  }

  function startRingtone() {
    if (!enabled.value) {
      return
    }

    try {
      ringtone.currentTime = 0
      ringtone.play().catch(() => {})
    } catch {
      return
    }
  }

  function stopRingtone() {
    ringtone.pause()
    ringtone.currentTime = 0
  }

  function playCue() {
    play(whistle)
  }

  function playMessage() {
    play(notification)
  }

  function toggleSound() {
    enabled.value = !enabled.value
  }

  watch(enabled, value => {
    if (!value) {
      stopRingtone()
    }

    try {
      localStorage.setItem(SOUND_KEY, value ? 'on' : 'off')
    } catch {
      return
    }
  }, {flush: 'sync'})

  return {enabled, startRingtone, stopRingtone, playCue, playMessage, toggleSound}
}
