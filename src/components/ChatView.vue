<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'

const props = defineProps({
  roomId: {type: String, required: true},
  myName: {type: String, required: true},
  peers: {type: Array, default: () => []},
  messages: {type: Array, default: () => []},
  typing: {type: String, default: ''},
  unread: {type: Number, default: 0}
})

const emit = defineEmits(['send', 'leave', 'typing', 'stop-typing', 'files', 'call'])

const EMOJI = [
  '😀', '😄', '😁', '😊', '🙂', '😉', '😍',
  '🤔', '😎', '😢', '😡', '👍', '👎', '👏',
  '🙏', '🔥', '🎉', '❤️', '💚', '✅', '❌',
  '👋', '🤝', '☕', '🍀', '💬', '📎', '📞',
  '⏰', '🌿', '⭐', '💡'
]

const STATUS_LABEL = {sent: 'Надіслано', delivered: 'Доставлено', read: 'Прочитано'}

const draft = ref('')
const listEl = ref(null)
const textareaEl = ref(null)
const fileInput = ref(null)
const emojiEl = ref(null)
const emojiOpen = ref(false)
const participantsOpen = ref(false)

const hasChatMessages = computed(() => props.messages.some(message => message.kind === 'chat' || message.kind === 'file'))

const contacts = computed(() => {
  const self = {id: 'self', name: props.myName, self: true}
  const others = props.peers
    .map(peer => ({id: peer.id, name: peer.name, self: false}))
    .sort((left, right) => left.name.localeCompare(right.name, 'uk'))

  return [self, ...others]
})

const contactGroups = computed(() => {
  const groups = new Map()

  for (const contact of contacts.value) {
    const letter = (contact.name.trim()[0] || '?').toUpperCase()

    if (!groups.has(letter)) {
      groups.set(letter, [])
    }

    groups.get(letter).push(contact)
  }

  return [...groups.entries()].map(([letter, items]) => ({letter, items}))
})

const feed = computed(() => {
  const items = []
  let currentDay = ''
  let lastAuthor = ''
  let lastTime = 0

  for (const message of props.messages) {
    if (message.kind === 'system') {
      items.push({type: 'system', id: message.id, text: message.text})
      lastAuthor = ''
      lastTime = 0
      continue
    }

    const time = Number(message.time) || Date.now()
    const key = dayKey(time)

    if (key !== currentDay) {
      items.push({type: 'date', id: `date-${key}`, label: dayLabel(time)})
      currentDay = key
      lastAuthor = ''
      lastTime = 0
    }

    const authorKey = message.own ? '__self__' : String(message.author || '')
    const grouped = authorKey === lastAuthor && time - lastTime < 300000

    items.push({type: 'message', id: message.id, message, grouped})
    lastAuthor = authorKey
    lastTime = time
  }

  return items
})

onMounted(() => {
  scrollToBottom()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

watch(() => props.messages.length, scrollToBottom)
watch(() => props.typing, scrollToBottom)

function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) {
      listEl.value.scrollTop = listEl.value.scrollHeight
    }
  })
}

function dayKey(time) {
  const date = new Date(time)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function dayLabel(time) {
  const date = new Date(time)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (dayKey(time) === dayKey(today.getTime())) {
    return 'Сьогодні'
  }

  if (dayKey(time) === dayKey(yesterday.getTime())) {
    return 'Вчора'
  }

  return date.toLocaleDateString('uk-UA', {day: 'numeric', month: 'long'})
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('')
}

function formatTime(time) {
  return new Date(time).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatSize(bytes) {
  const size = Number(bytes) || 0

  if (size < 1024) {
    return `${size} Б`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} КБ`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}

function isImage(file) {
  return Boolean(file && typeof file.type === 'string' && file.type.startsWith('image/'))
}

function statusLabel(status) {
  return STATUS_LABEL[status] || STATUS_LABEL.sent
}

function resizeTextarea() {
  const element = textareaEl.value

  if (!element) {
    return
  }

  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 140)}px`
}

function onInput() {
  resizeTextarea()

  if (!draft.value.trim()) {
    emit('stop-typing')
    return
  }

  emit('typing')
}

function submit() {
  const text = draft.value.trim()

  if (!text) {
    return
  }

  emit('send', text)
  draft.value = ''
  emojiOpen.value = false
  resizeTextarea()
  emit('stop-typing')
}

function onKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}

function toggleEmoji() {
  emojiOpen.value = !emojiOpen.value
}

function addEmoji(emoji) {
  const element = textareaEl.value
  const start = element ? element.selectionStart : draft.value.length
  const end = element ? element.selectionEnd : draft.value.length

  draft.value = `${draft.value.slice(0, start)}${emoji}${draft.value.slice(end)}`
  emojiOpen.value = false

  nextTick(() => {
    if (element) {
      const position = start + emoji.length
      element.focus()
      element.selectionStart = position
      element.selectionEnd = position
    }

    resizeTextarea()
    emit('typing')
  })
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFilesSelected(event) {
  const selected = event.target.files

  if (selected && selected.length > 0) {
    emit('files', Array.from(selected))
  }

  event.target.value = ''
}

function onDocumentClick(event) {
  if (!emojiOpen.value) {
    return
  }

  if (emojiEl.value && emojiEl.value.contains(event.target)) {
    return
  }

  emojiOpen.value = false
}

function onDocumentKeydown(event) {
  if (event.key !== 'Escape') {
    return
  }

  emojiOpen.value = false
  participantsOpen.value = false
}

function handleLeave() {
  participantsOpen.value = false
  emit('leave')
}
</script>

<template>
  <section class="chat">
    <aside class="sidebar" :class="{'is-open': participantsOpen}">
      <div class="sidebar-profile">
        <span class="avatar avatar-lg avatar-self">{{ initials(myName) }}</span>
        <div class="profile-text">
          <strong>{{ myName }}</strong>
          <span class="presence is-online">
            <span class="presence-dot"></span>
            Ви онлайн
          </span>
        </div>
      </div>

      <div class="room-card">
        <span class="room-label">Кімната</span>
        <strong class="room-name" :title="roomId">{{ roomId }}</strong>
        <span class="room-meta">{{ peers.length + 1 }} учасників</span>
        <span v-if="unread" class="badge">{{ unread > 99 ? '99+' : unread }}</span>
      </div>

      <div class="participants-head">
        <h2>Учасники</h2>
        <span class="counter">{{ peers.length + 1 }}</span>
      </div>

      <div class="participants">
        <div v-for="group in contactGroups" :key="group.letter">
          <p class="group-letter">{{ group.letter }}</p>
          <ul class="contact-list">
            <li
              v-for="contact in group.items"
              :key="contact.id"
              class="contact"
              :class="{'is-self': contact.self}"
            >
              <span class="avatar" :class="{'avatar-self': contact.self}">{{ initials(contact.name) }}</span>
              <span class="contact-body">
                <span class="contact-name">
                  {{ contact.name }}
                  <span v-if="contact.self" class="contact-you">ви</span>
                </span>
                <span class="contact-state">
                  <span class="presence-dot"></span>
                  {{ contact.self ? 'Онлайн' : 'У кімнаті' }}
                </span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div class="sidebar-foot">
        <button class="btn btn-ghost btn-block" type="button" @click="handleLeave">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          Вийти з кімнати
        </button>
      </div>
    </aside>

    <button
      v-if="participantsOpen"
      class="drawer-backdrop"
      type="button"
      aria-label="Закрити список учасників"
      @click="participantsOpen = false"
    ></button>

    <div class="conversation">
      <header class="chat-header">
        <button class="icon-btn only-mobile" type="button" aria-label="Список учасників" @click="participantsOpen = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </button>

        <div class="chat-title">
          <strong># {{ roomId }}</strong>
          <span class="chat-sub">
            <span class="presence is-online">
              <span class="presence-dot"></span>
              {{ peers.length + 1 }} онлайн
            </span>
            <span v-if="unread" class="badge" :aria-label="`${unread} непрочитаних`">{{ unread > 99 ? '99+' : unread }}</span>
          </span>
        </div>

        <button
          class="icon-btn is-call"
          type="button"
          aria-label="Почати дзвінок"
          :title="peers.length === 0 ? 'У кімнаті немає інших учасників' : 'Почати дзвінок'"
          :disabled="peers.length === 0"
          @click="emit('call')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3h4l2 5-2.5 1.5a12 12 0 005 5L16 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z" />
          </svg>
        </button>
      </header>

      <ol ref="listEl" class="messages" aria-live="polite">
        <template v-for="item in feed" :key="item.id">
          <li v-if="item.type === 'date'" class="date-separator">
            <span>{{ item.label }}</span>
          </li>

          <li v-else-if="item.type === 'system'" class="system-note">
            {{ item.text }}
          </li>

          <li v-else class="message" :class="{'is-own': item.message.own, 'is-grouped': item.grouped}">
            <span v-if="!item.message.own && !item.grouped" class="message-author">{{ item.message.author }}</span>

            <div class="bubble">
              <template v-if="item.message.kind === 'file'">
                <a
                  v-if="isImage(item.message.file)"
                  class="file-image"
                  :href="item.message.file.url"
                  :download="item.message.file.name"
                  target="_blank"
                  rel="noopener"
                  :aria-label="`Відкрити ${item.message.file.name}`"
                >
                  <img :src="item.message.file.url" :alt="item.message.file.name">
                </a>

                <a
                  v-else
                  class="file-card"
                  :href="item.message.file.url"
                  :download="item.message.file.name"
                  target="_blank"
                  rel="noopener"
                  :aria-label="`Завантажити ${item.message.file.name}`"
                >
                  <span class="file-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </span>
                  <span class="file-body">
                    <strong>{{ item.message.file.name }}</strong>
                    <span>{{ formatSize(item.message.file.size) }}</span>
                  </span>
                  <span class="file-download">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <path d="M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  </span>
                </a>
              </template>

              <p v-else class="bubble-text">{{ item.message.text }}</p>

              <span class="bubble-meta">
                <time>{{ formatTime(item.message.time) }}</time>
                <span
                  v-if="item.message.own"
                  class="ticks"
                  :class="`is-${item.message.status || 'sent'}`"
                  :title="statusLabel(item.message.status)"
                >
                  <svg viewBox="0 0 18 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M1 6.5l3.5 3.5L11 3" />
                    <path v-if="(item.message.status || 'sent') !== 'sent'" d="M6.5 6.5L10 10 17 3" />
                  </svg>
                  <span class="visually-hidden">{{ statusLabel(item.message.status) }}</span>
                </span>
              </span>
            </div>
          </li>
        </template>

        <li v-if="!hasChatMessages" class="empty-state">
          <span class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.5 8.5 0 01-8.5 8.5H4l2.5-3.5A8.5 8.5 0 1121 11.5z" />
              <path d="M8 11h.01M12 11h.01M16 11h.01" />
            </svg>
          </span>
          <strong>Повідомлень ще немає</strong>
          <p>Напишіть перше повідомлення — його побачать усі в кімнаті.</p>
        </li>
      </ol>

      <div class="typing" aria-live="polite">
        <template v-if="typing">
          <span class="typing-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span>{{ typing }}</span>
        </template>
      </div>

      <div class="composer-wrap">
        <form class="composer" @submit.prevent="submit">
          <button class="composer-btn" type="button" aria-label="Прикріпити файл" title="Прикріпити файл" @click="openFilePicker">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21.4 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.2-9.19a4 4 0 015.65 5.66l-9.2 9.19a2 2 0 01-2.82-2.83l8.49-8.48" />
            </svg>
          </button>

          <input ref="fileInput" class="visually-hidden" type="file" multiple tabindex="-1" aria-hidden="true" @change="onFilesSelected">

          <div class="composer-input">
            <textarea
              id="message"
              name="message"
              ref="textareaEl"
              v-model="draft"
              rows="1"
              maxlength="2000"
              placeholder="Повідомлення…"
              aria-label="Повідомлення"
              @input="onInput"
              @blur="emit('stop-typing')"
              @keydown="onKeydown"
            ></textarea>

            <button
              class="composer-btn"
              type="button"
              aria-label="Емодзі"
              aria-haspopup="dialog"
              :aria-expanded="emojiOpen"
              @click.stop="toggleEmoji"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
            </button>

            <div v-if="emojiOpen" ref="emojiEl" class="emoji-popover" role="dialog" aria-label="Вибір емодзі">
              <button
                v-for="emoji in EMOJI"
                :key="emoji"
                class="emoji-item"
                type="button"
                @click="addEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <button class="send-btn" type="submit" aria-label="Надіслати" :disabled="!draft.trim()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4z" />
            </svg>
          </button>
        </form>

        <p class="composer-hint">
          <kbd>Enter</kbd> — надіслати · <kbd>Shift</kbd> + <kbd>Enter</kbd> — новий рядок
        </p>
      </div>
    </div>
  </section>
</template>
