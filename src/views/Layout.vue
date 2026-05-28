<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

const settingsOpen    = ref(false)
const isSettingsRoute = computed(() => route.path === '/settings' || route.path === '/export')
watch(isSettingsRoute, v => { if (v) settingsOpen.value = true }, { immediate: true })

function handleLogout() {
  auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="layout">

    <!-- ── 側欄（桌機）────────────────────────────────────────────────── -->
    <aside class="sidebar">
      <div class="brand">
        <el-icon size="18" color="#3b82f6"><Setting /></el-icon>
        <span>管理後台</span>
      </div>
      <nav class="nav">
        <router-link to="/dashboard" class="nav-item" active-class="active">
          <el-icon><DataAnalysis /></el-icon> 出勤管理
        </router-link>
        <router-link to="/employees" class="nav-item" active-class="active">
          <el-icon><User /></el-icon> 員工管理
        </router-link>

        <!-- 系統設定（可展開） -->
        <div class="nav-item nav-toggle" :class="{ active: isSettingsRoute }" @click="settingsOpen = !settingsOpen">
          <el-icon><Setting /></el-icon>
          <span>系統設定</span>
          <el-icon class="chevron" :class="{ open: settingsOpen }"><ArrowRight /></el-icon>
        </div>
        <transition name="sub-fade">
          <div v-if="settingsOpen" class="nav-sub">
            <router-link to="/settings" class="nav-sub-item" active-class="sub-active">
              <el-icon><Location /></el-icon> GPS 設定
            </router-link>
            <router-link to="/export" class="nav-sub-item" active-class="sub-active">
              <el-icon><Download /></el-icon> 匯出記錄
            </router-link>
          </div>
        </transition>

        <router-link to="/admins" class="nav-item" active-class="active">
          <el-icon><Avatar /></el-icon> 管理設定
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <img v-if="auth.pictureUrl" :src="auth.pictureUrl" class="avatar" referrerpolicy="no-referrer" />
        <div v-else class="avatar-ph">{{ auth.displayName?.[0] }}</div>
        <div class="footer-info">
          <div class="footer-name">{{ auth.displayName }}</div>
          <div class="footer-role">管理員</div>
        </div>
        <el-button text @click="handleLogout"><el-icon size="18"><SwitchButton /></el-icon></el-button>
      </div>
    </aside>

    <!-- ── 主內容 ───────────────────────────────────────────────────────── -->
    <main class="content">
      <router-view />
    </main>

    <!-- ── 底部導覽（手機）──────────────────────────────────────────────── -->
    <nav class="bottom-nav">
      <router-link to="/dashboard" class="bn-item" active-class="bn-active">
        <el-icon size="20"><DataAnalysis /></el-icon>
        <span>出勤</span>
      </router-link>
      <router-link to="/employees" class="bn-item" active-class="bn-active">
        <el-icon size="20"><User /></el-icon>
        <span>員工</span>
      </router-link>
      <router-link to="/settings" class="bn-item" active-class="bn-active">
        <el-icon size="20"><Setting /></el-icon>
        <span>設定</span>
      </router-link>
      <button class="bn-item" @click="handleLogout">
        <el-icon size="20"><SwitchButton /></el-icon>
        <span>登出</span>
      </button>
    </nav>

  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── 側欄 ── */
.sidebar {
  width: 230px;
  background: #1e293b;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  flex-shrink: 0;
  overflow: hidden;
}
.brand {
  display: flex; align-items: center; gap: 10px;
  color: #f8fafc; font-size: 17px; font-weight: 700;
  margin-bottom: 32px; padding: 0 8px; flex-shrink: 0;
}
.nav { display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; overflow-x: hidden; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  color: #94a3b8; text-decoration: none;
  padding: 11px 12px; border-radius: 10px;
  font-size: 16px; transition: all .15s;
  cursor: pointer; user-select: none;
}
.nav-item:hover { background: #334155; color: #f8fafc; }
.nav-item.active { background: #3b82f6; color: #fff; }

.nav-toggle { justify-content: flex-start; }
.nav-toggle .chevron { margin-left: auto; transition: transform .2s; flex-shrink: 0; }
.nav-toggle .chevron.open { transform: rotate(90deg); }
.nav-sub { display: flex; flex-direction: column; gap: 2px; padding-left: 14px; margin-top: 2px; }
.nav-sub-item {
  display: flex; align-items: center; gap: 8px;
  color: #64748b; text-decoration: none;
  padding: 9px 12px; border-radius: 8px;
  font-size: 15px; transition: all .15s;
}
.nav-sub-item:hover { background: #334155; color: #cbd5e1; }
.nav-sub-item.sub-active { background: rgba(59,130,246,0.2); color: #60a5fa; font-weight: 600; }
.sub-fade-enter-active, .sub-fade-leave-active { transition: opacity .15s, transform .15s; }
.sub-fade-enter-from, .sub-fade-leave-to { opacity: 0; transform: translateY(-4px); }

.sidebar-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 8px; border-top: 1px solid #334155; margin-top: 16px; flex-shrink: 0;
}
.avatar, .avatar-ph { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; }
.avatar-ph {
  background: #3b82f6; color: #fff;
  display: grid; place-items: center;
  font-size: 14px; font-weight: 700;
}
.footer-info { flex: 1; min-width: 0; }
.footer-name { font-size: 14px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.footer-role { font-size: 12px; color: #64748b; }

/* ── 主內容 ── */
.content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── 底部導覽（手機）── */
.bottom-nav { display: none; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .bottom-nav {
    display: flex;
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #1e293b; border-top: 1px solid #334155; z-index: 100;
  }
  .bn-item {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 3px; padding: 10px 0;
    color: #64748b; text-decoration: none;
    font-size: 12px; background: none; border: none; cursor: pointer;
    transition: color .15s;
  }
  .bn-item:hover, .bn-item.bn-active { color: #3b82f6; }
  .content { padding-bottom: 64px; }
}
</style>
