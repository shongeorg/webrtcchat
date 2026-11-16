import {ref, watch} from 'vue'

const STORAGE_KEY = 'webrtcchat.theme'
const THEME_COLORS = {light: '#00a859', dark: '#0d1711'}

function readTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme() {
  const theme = ref(readTheme())

  function applyTheme() {
    document.documentElement.dataset.theme = theme.value

    const meta = document.querySelector('meta[name="theme-color"]')

    if (meta) {
      meta.setAttribute('content', THEME_COLORS[theme.value])
    }
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  watch(theme, value => {
    applyTheme()

    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      return
    }
  }, {immediate: true, flush: 'sync'})

  return {theme, toggleTheme}
}
