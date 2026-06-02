import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'admin_token'
const USER_KEY  = 'admin_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) || '')
  const user  = ref(JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'))

  const isLoggedIn   = computed(() => !!token.value)
  const isAdmin      = computed(() => ['admin', 'super_admin'].includes(user.value?.role))
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const displayName  = computed(() => user.value?.display_name || '')
  const pictureUrl   = computed(() => user.value?.picture_url  || '')

  // super_admin 擁有全部權限；一般 admin 依 permissions 陣列判斷
  function hasPermission(key) {
    if (!user.value) return false
    if (user.value.role === 'super_admin') return true
    return (user.value.permissions ?? []).includes(key)
  }

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

  return { token, user, isLoggedIn, isAdmin, isSuperAdmin, displayName, pictureUrl, hasPermission, setAuth, logout }
})
