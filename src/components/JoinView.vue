<script setup>
import {ref} from 'vue'

const props = defineProps({
  initialName: {type: String, default: ''},
  initialRoom: {type: String, default: ''}
})

const emit = defineEmits(['join'])

const name = ref(props.initialName)
const room = ref(props.initialRoom)

function submit() {
  const cleanName = name.value.trim()
  const cleanRoom = room.value.trim()

  if (!cleanName || !cleanRoom) {
    return
  }

  name.value = cleanName
  room.value = cleanRoom
  emit('join', cleanRoom, cleanName)
}
</script>

<template>
  <section class="join">
    <div class="join-card">
      <div class="join-head">
        <span class="join-logo" aria-hidden="true">
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
        <div>
          <h1>Вхід у чат</h1>
          <p>P2P-месенджер без сервера</p>
        </div>
      </div>

      <form class="join-form" @submit.prevent="submit">
        <label class="field" for="name">
          <span>Ваше ім'я</span>
          <input id="name" name="name" v-model="name" maxlength="32" required autocomplete="name" placeholder="Олег">
        </label>

        <label class="field" for="room">
          <span>Кімната</span>
          <input id="room" name="room" v-model="room" maxlength="64" required autocomplete="off" placeholder="demo">
        </label>

        <button class="btn btn-primary btn-block" type="submit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 3h6v6M21 3l-9 9" />
            <path d="M10 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" />
          </svg>
          Увійти в кімнату
        </button>

        <p class="join-hint">
          Відкрийте це посилання в іншому браузері та введіть ту саму кімнату.
        </p>
      </form>

      <div class="join-foot">
        <span class="presence is-online">
          <span class="presence-dot"></span>
          Готово до з'єднання
        </span>
        <span class="join-fine">Наскрізне P2P-з'єднання</span>
      </div>
    </div>
  </section>
</template>
