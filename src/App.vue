<script setup>
import {computed, watch} from 'vue'
import JoinView from './components/JoinView.vue'
import ChatView from './components/ChatView.vue'
import CallOverlay from './components/CallOverlay.vue'
import {useChatRoom} from './composables/useChatRoom'
import {useTheme} from './composables/useTheme'

const {
  joined,
  roomId,
  myName,
  profile,
  peers,
  messages,
  typingText,
  unread,
  notices,
  call,
  localStream,
  remoteStreams,
  micEnabled,
  cameraEnabled,
  screenEnabled,
  screenPeers,
  soundEnabled,
  join,
  leave,
  sendMessage,
  sendFiles,
  notifyTyping,
  stopTyping,
  startCall,
  acceptCall,
  declineCall,
  endCall,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
  toggleSound
} = useChatRoom()

const {theme, toggleTheme} = useTheme()

const onlineCount = computed(() => peers.value.length + 1)

watch([unread, joined], ([count, isJoined]) => {
  document.title = isJoined && count > 0 ? `(${count}) WebRTC чат` : 'WebRTC чат'
})
</script>

<template>
  <main class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand-logo" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <g fill="var(--color-primary)">
              <circle cx="16" cy="9" r="6" />
              <circle cx="9" cy="16" r="6" />
              <circle cx="23" cy="16" r="6" />
              <circle cx="16" cy="23" r="6" />
            </g>
            <circle cx="16" cy="16" r="5" fill="var(--color-accent)" />
          </svg>
        </span>
        <span class="brand-text">
          <strong>WebRTC чат</strong>
          <small>P2P месенджер</small>
        </span>
      </div>

      <div class="topbar-status">
        <button
          class="topbar-btn"
          type="button"
          :aria-label="soundEnabled ? 'Вимкнути звук' : 'Увімкнути звук'"
          :title="soundEnabled ? 'Звук увімкнено' : 'Звук вимкнено'"
          :aria-pressed="soundEnabled"
          @click="toggleSound"
        >
          <svg v-if="soundEnabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M23 9l-6 6M17 9l6 6" />
          </svg>
        </button>

        <button
          class="topbar-btn"
          type="button"
          :aria-label="theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'"
          :title="theme === 'dark' ? 'Світла тема' : 'Темна тема'"
          :aria-pressed="theme === 'dark'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
          </svg>
        </button>

        <span v-if="unread" class="badge" :aria-label="`${unread} непрочитаних повідомлень`">
          {{ unread > 99 ? '99+' : unread }}
        </span>
        <span class="presence" :class="joined ? 'is-online' : 'is-offline'">
          <span class="presence-dot"></span>
          <span>{{ joined ? `${onlineCount} онлайн` : 'Немає з’єднання' }}</span>
        </span>
      </div>
    </header>

    <JoinView
      v-if="!joined"
      :initial-name="profile.name"
      :initial-room="profile.room"
      @join="join"
    />

    <ChatView
      v-else
      :room-id="roomId"
      :my-name="myName"
      :peers="peers"
      :messages="messages"
      :typing="typingText"
      :unread="unread"
      @send="sendMessage"
      @files="sendFiles"
      @leave="leave"
      @typing="notifyTyping"
      @stop-typing="stopTyping"
      @call="startCall"
    />

    <CallOverlay
      :call="call"
      :local-stream="localStream"
      :remote-streams="remoteStreams"
      :mic-enabled="micEnabled"
      :camera-enabled="cameraEnabled"
      :screen-sharing="screenEnabled"
      :screen-peers="screenPeers"
      @accept="acceptCall"
      @decline="declineCall"
      @end="endCall"
      @toggle-mic="toggleMic"
      @toggle-camera="toggleCamera"
      @toggle-screen="toggleScreenShare"
    />

    <div class="toasts" aria-live="polite">
      <transition-group name="toast">
        <div v-for="notice in notices" :key="notice.id" class="toast" :class="`is-${notice.tone}`">
          {{ notice.text }}
        </div>
      </transition-group>
    </div>
  </main>
</template>
