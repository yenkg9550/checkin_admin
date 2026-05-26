<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const navigating = ref(false)
let t = null
router.beforeEach(() => { t = setTimeout(() => { navigating.value = true }, 80) })
router.afterEach(() => { clearTimeout(t); navigating.value = false })
</script>

<template>
  <transition name="fade">
    <div v-if="navigating" class="nav-overlay">
      <div class="nav-spinner"></div>
    </div>
  </transition>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
html, body, #app { background: #0f172a; margin: 0; }
@keyframes spin { to { transform: rotate(360deg) } }
.fade-enter-active, .fade-leave-active { transition: opacity .15s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
.page-enter-active, .page-leave-active { transition: opacity .1s }
.page-enter-from, .page-leave-to { opacity: 0 }
</style>

<style scoped>
.nav-overlay {
  position: fixed;
  inset: 0;
  background: #1e293b;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>