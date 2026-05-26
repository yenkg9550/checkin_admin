import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'admin_token'
const USER_KEY  = 'admin_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) || '')
  const user  = ref(JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin    = computed(() => user.value?.role === 'admin')
  const displayName = computed(() => user.value?.display_name || '')
  const pictureUrl  = computed(() => user.value?.picture_url  || '')

  function setAuth(accessToken, userInfo) {
    token.value = accessToken
    user.value  = userInfo
    sessionStorage.setItem(TOKEN_KEY, accessToken)
    sessionStorage.setItem(USER_KEY, JSON.stringify(userInfo))
  }

  function logout() {
    token.value = ''
    user.value  = null
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  }

  return { token, user, isLoggedIn, isAdmin, displayName, pictureUrl, setAuth, logout }
})
