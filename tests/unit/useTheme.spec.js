import {beforeEach, describe, expect, it} from 'vitest'
import {useTheme} from '../../src/composables/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('defaults to the light theme', () => {
    const {theme} = useTheme()

    expect(theme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('toggles the theme and persists it', () => {
    const {theme, toggleTheme} = useTheme()

    toggleTheme()

    expect(theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('webrtcchat.theme')).toBe('dark')
  })

  it('restores the stored theme', () => {
    localStorage.setItem('webrtcchat.theme', 'dark')

    const {theme} = useTheme()

    expect(theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
