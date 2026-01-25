import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // Theme state
  const theme = ref<'light' | 'dark' | 'auto'>('auto')
  const isDark = ref(false)

  // Sidebar state
  const sidebarCollapsed = ref(false)

  // Loading state
  const loading = ref(false)

  // Set theme
  const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    theme.value = newTheme
    applyTheme()
  }

  // Apply theme to DOM
  const applyTheme = () => {
    const htmlElement = document.documentElement

    if (theme.value === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      isDark.value = mediaQuery.matches
    } else {
      isDark.value = theme.value === 'dark'
    }

    if (isDark.value) {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
  }

  // Toggle sidebar
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // Set loading state
  const setLoading = (value: boolean) => {
    loading.value = value
  }

  return {
    theme,
    isDark,
    sidebarCollapsed,
    loading,
    setTheme,
    applyTheme,
    toggleSidebar,
    setLoading
  }
})
