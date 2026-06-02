<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { postAdminLogin } from '@/api/http.js'

const router = useRouter()
const auth = useAuthStore()

const form = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = '請輸入帳號和密碼'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const data = await postAdminLogin(form.value.username, form.value.password)
    auth.setAuth(data.access_token, data.user)
    await router.replace({ name: 'dashboard' })
  } catch (e) {
    error.value = e?.response?.data?.detail || '帳號或密碼錯誤'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="bg-circle top"></div>
    <div class="bg-circle bottom"></div>

    <div class="login-card">
      <div class="logo-wrap">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 class="title">管理後台</h2>
      <p class="subtitle">員工出勤管理系統</p>

      <div class="divider"></div>

      <form class="form" @submit.prevent="handleLogin">
        <div class="field">
          <label>帳號</label>
          <input
            v-model="form.username"
            type="text"
            placeholder="請輸入帳號"
            autocomplete="username"
            :disabled="loading"
          />
        </div>
        <div class="field">
          <label>密碼</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="請輸入密碼"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>登入</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(59,130,246,0.07);
}
.bg-circle.top { width: 360px; height: 360px; top: -100px; right: -100px; }
.bg-circle.bottom { width: 260px; height: 260px; bottom: -80px; left: -80px; }

.login-card {
  position: relative;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 48px 36px 40px;
  width: 320px;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}
.logo-wrap {
  width: 72px; height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  box-shadow: 0 8px 24px rgba(59,130,246,0.3);
}
.title {
  font-size: 22px;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 6px;
}
.subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}
.divider {
  height: 1px;
  background: rgba(255,255,255,0.07);
  margin: 24px 0;
}
.form { text-align: left; }
.field { margin-bottom: 16px; }
.field label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.field input {
  width: 100%;
  box-sizing: border-box;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 10px 14px;
  color: #f1f5f9;
  font-size: 16px;
  outline: none;
  transition: border-color 0.15s;
}
.field input:focus { border-color: #3b82f6; }
.field input:disabled { opacity: 0.5; cursor: not-allowed; }
.field input::placeholder { color: #475569; }
.error-text {
  font-size: 16px;
  color: #f87171;
  margin: 0 0 14px;
  text-align: center;
}
.login-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 4px;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
}
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
</style>
