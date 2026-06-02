import { ref, watch } from 'vue'

const STORAGE_KEY = 'admin_theme'
const isDark = ref(localStorage.getItem(STORAGE_KEY) === 'dark')

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark)
}

// 初始化
applyTheme(isDark.value)

watch(isDark, (val) => {
  applyTheme(val)
  localStorage.setItem(STORAGE_KEY, val ? 'dark' : 'light')
})

export function useTheme() {
  return {
    isDark,
    toggleTheme: () => { isDark.value = !isDark.value },
  }
}
