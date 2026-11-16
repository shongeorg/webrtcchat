<script setup>
import RemoteVideo from './RemoteVideo.vue'

defineProps({
  call: {type: Object, required: true},
  localStream: {type: Object, default: null},
  remoteStreams: {type: Array, default: () => []},
  micEnabled: {type: Boolean, default: true},
  cameraEnabled: {type: Boolean, default: true},
  screenSharing: {type: Boolean, default: false},
  screenPeers: {type: Object, default: () => ({})}
})

const emit = defineEmits(['accept', 'decline', 'end', 'toggle-mic', 'toggle-camera', 'toggle-screen'])

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('')
}
</script>

<template>
  <transition name="fade">
    <div v-if="call.phase !== 'idle'" class="call-overlay">
      <div v-if="call.phase === 'active'" class="call-stage">
        <div class="call-grid">
          <div
            v-for="remote in remoteStreams"
            :key="remote.peerId"
            class="call-video"
            :class="{'is-screen': screenPeers[remote.peerId]}"
          >
            <RemoteVideo :stream="remote.stream" />
            <span class="call-name">
              {{ remote.name }}
              <template v-if="screenPeers[remote.peerId]"> · екран</template>
            </span>
          </div>
          <div v-if="remoteStreams.length === 0" class="call-waiting">
            <p>З’єднання…</p>
          </div>
        </div>
      </div>

      <div v-else class="call-stage">
        <div class="call-waiting">
          <span class="call-avatar">{{ initials(call.peerName) }}</span>
          <strong class="call-peer">{{ call.peerName || 'Кімната' }}</strong>
          <p class="call-status">
            {{ call.phase === 'incoming' ? 'Вхідний дзвінок' : 'Дзвонимо…' }}
          </p>
        </div>
      </div>

      <div v-if="localStream" class="call-local" :class="{'is-screen': screenSharing}">
        <RemoteVideo :stream="localStream" muted />
      </div>

      <div class="call-bar">
        <div class="call-actions">
          <template v-if="call.phase === 'incoming'">
            <button class="call-action is-decline" type="button" aria-label="Відхилити" @click="emit('decline')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 4l16 16M20 4L4 20" />
              </svg>
            </button>
            <button class="call-action is-accept" type="button" aria-label="Прийняти" @click="emit('accept')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3h4l2 5-2.5 1.5a12 12 0 005 5L16 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z" />
              </svg>
            </button>
          </template>

          <template v-else>
            <button class="call-action" :class="{'is-off': !micEnabled}" type="button" aria-label="Мікрофон" @click="emit('toggle-mic')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0014 0M12 18v3M8 21h8" />
              </svg>
            </button>
            <button class="call-action" :class="{'is-off': !cameraEnabled}" type="button" aria-label="Камера" :title="screenSharing ? 'Камера недоступна під час трансляції екрана' : 'Камера'" :disabled="screenSharing" @click="emit('toggle-camera')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="6" width="12" height="12" rx="3" />
                <path d="M15 10l6-3v10l-6-3" />
              </svg>
            </button>
            <button
              v-if="call.phase === 'active'"
              class="call-action"
              :class="{'is-screen': screenSharing}"
              type="button"
              :aria-label="screenSharing ? 'Зупинити трансляцію екрана' : 'Транслювати екран'"
              :title="screenSharing ? 'Зупинити трансляцію екрана' : 'Транслювати екран'"
              :aria-pressed="screenSharing"
              @click="emit('toggle-screen')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </button>
            <button class="call-action is-decline" type="button" aria-label="Завершити" @click="emit('end')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 16.5c4-3 10-3 14 0l-2 3c-3-1.5-7-1.5-10 0z" />
              </svg>
            </button>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>
