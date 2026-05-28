<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchDailyReport, fetchEmployees, clearAllAttendance } from '@/api/http.js'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter, useRoute } from 'vue-router'

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

// ── 系統設定子選單 ──────────────────────────────────────────
const settingsOpen   = ref(false)
const isSettingsRoute = computed(() => route.path.startsWith('/settings') || route.path === '/export')
watch(isSettingsRoute, v => { if (v) settingsOpen.value = true }, { immediate: true })
const rawRecords = ref([])
const employees  = ref([])
const loading    = ref(true)
const selectedDate = ref(new Date().toISOString().slice(0, 10))

onMounted(() => loadAll())

async function loadAll() {
  loading.value = true
  try {
    [rawRecords.value, employees.value] = await Promise.all([
      fetchDailyReport(selectedDate.value),
      fetchEmployees(),
    ])
  } finally { loading.value = false }
}

const rows = computed(() => {
  const map = {}
  for (const r of rawRecords.value) {
    if (!map[r.employee_id]) map[r.employee_id] = {
      employee_id: r.employee_id, display_name: r.display_name,
      picture_url: r.picture_url, clock_in: null, clock_out: null,
    }
    if (r.check_type === 'clock_in')  map[r.employee_id].clock_in  = r
    if (r.check_type === 'clock_out') map[r.employee_id].clock_out = r
  }
  return Object.values(map)
})

const presentCount = computed(() => rows.value.filter(r => r.clock_in).length)
const absentCount  = computed(() => employees.value.length - presentCount.value)

function fmt(dt) {
  if (!dt) return '—'
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z')
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function rowStatus(row) {
  if (row.clock_in && row.clock_out) return { label: '已完成', type: 'success' }
  if (row.clock_in)                  return { label: '上班中', type: 'warning' }
  return                                    { label: '未出勤', type: 'info' }
}

async function handleClear() {
  await ElMessageBox.confirm('確定要清除所有打卡記錄？此操作無法復原。', '警告', {
    confirmButtonText: '確定清除', cancelButtonText: '取消', type: 'warning',
  })
  try {
    await clearAllAttendance()
    ElMessage.success('已清除所有打卡記錄')
    await loadAll()
  } catch { ElMessage.error('清除失敗') }
}

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
        <el-button text @click="handleLogout"><el-icon><SwitchButton /></el-icon></el-button>
      </div>
    </aside>

    <!-- ── 主內容 ───────────────────────────────────────────────────────── -->
    <main class="content">

      <!-- 標題列 -->
      <div class="toolbar">
        <h1 class="page-title">出勤管理</h1>
        <div class="toolbar-actions">
          <!-- 日期 + 重新整理（同一行） -->
          <div class="toolbar-row">
            <el-date-picker
              v-model="selectedDate" type="date"
              format="YYYY/MM/DD" value-format="YYYY-MM-DD"
              size="default" @change="loadAll"
              class="date-picker"
            />
            <el-button type="primary" size="default" @click="loadAll">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
          <!-- 清除記錄 -->
          <div class="toolbar-row">
            <el-button type="danger" plain size="default" @click="handleClear" style="flex:1">
              <el-icon><Delete /></el-icon>
              <span style="margin-left:4px">清除記錄</span>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 統計卡 -->
      <div class="stat-row">
        <div class="stat-card" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)">
          <div class="stat-num">{{ employees.length }}</div>
          <div class="stat-label">總員工</div>
        </div>
        <div class="stat-card" style="background:linear-gradient(135deg,#10b981,#059669)">
          <div class="stat-num">{{ presentCount }}</div>
          <div class="stat-label">已出勤</div>
        </div>
        <div class="stat-card" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
          <div class="stat-num">{{ rows.filter(r=>r.clock_in&&!r.clock_out).length }}</div>
          <div class="stat-label">上班中</div>
        </div>
        <div class="stat-card" style="background:linear-gradient(135deg,#ef4444,#dc2626)">
          <div class="stat-num">{{ absentCount }}</div>
          <div class="stat-label">未出勤</div>
        </div>
      </div>

      <!-- 打卡記錄 -->
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-empty v-else-if="!rows.length" description="當日無打卡紀錄" />

      <div v-else class="record-list">
        <div v-for="row in rows" :key="row.employee_id" class="record-card">
          <!-- 員工資訊 -->
          <div class="rec-top">
            <div class="rec-left">
              <img v-if="row.picture_url" :src="row.picture_url" class="rec-avatar" referrerpolicy="no-referrer" />
              <div class="rec-ph" v-else>{{ row.display_name?.[0] }}</div>
              <div>
                <div class="rec-name">{{ row.display_name }}</div>
                <el-tag :type="rowStatus(row).type" size="small" style="margin-top:3px;">
                  {{ rowStatus(row).label }}
                </el-tag>
              </div>
            </div>
            <!-- 時間（桌機右側） -->
            <div class="record-times desktop-times">
              <div class="time-item">
                <span class="tl">上班</span>
                <span class="tv" :class="{ dim: !row.clock_in }">{{ fmt(row.clock_in?.checked_at) }}</span>
              </div>
              <div class="tdiv"></div>
              <div class="time-item">
                <span class="tl">下班</span>
                <span class="tv" :class="{ dim: !row.clock_out }">{{ fmt(row.clock_out?.checked_at) }}</span>
              </div>
            </div>
          </div>
          <!-- 時間（手機底部橫排） -->
          <div class="mobile-times">
            <div class="mobile-time-item">
              <span class="tl">上班</span>
              <span class="tv" :class="{ dim: !row.clock_in }">{{ fmt(row.clock_in?.checked_at) }}</span>
            </div>
            <div class="tdiv-v"></div>
            <div class="mobile-time-item">
              <span class="tl">下班</span>
              <span class="tv" :class="{ dim: !row.clock_out }">{{ fmt(row.clock_out?.checked_at) }}</span>
            </div>
          </div>
        </div>
      </div>
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
/* ── 版面 ───────────────────────────────────────────────────────────── */
.layout {
  display: flex;
  height: 100vh;
  background: #f8fafc;
  overflow: hidden;
}

/* ── 側欄（桌機）───────────────────────────────────────────────────── */
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
  margin-bottom: 32px; padding: 0 8px;
  flex-shrink: 0;
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

/* 展開子選單 */
.nav-toggle { justify-content: flex-start; }
.nav-toggle .chevron { margin-left: auto; transition: transform .2s; flex-shrink: 0; }
.nav-toggle .chevron.open { transform: rotate(90deg); }
.nav-sub {
  display: flex; flex-direction: column; gap: 2px;
  padding-left: 14px; margin-top: 2px;
}
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
  padding: 12px 8px; border-top: 1px solid #334155; margin-top: 16px;
  flex-shrink: 0;
}
.avatar, .avatar-ph {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
}
.avatar-ph {
  background: #3b82f6; color: #fff;
  display: grid; place-items: center;
  font-size: 14px; font-weight: 700;
}
.footer-info { flex: 1; min-width: 0; }
.footer-name { font-size: 14px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.footer-role { font-size: 12px; color: #64748b; }

/* ── 主內容 ─────────────────────────────────────────────────────────── */
.content {
  flex: 1;
  padding: 28px;
  overflow-y: auto;
  min-width: 0;
}

/* ── 標題列 ─────────────────────────────────────────────────────────── */
.toolbar {
  display: flex; align-items: center;
  justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
  margin-bottom: 20px;
}
.page-title { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; }
.toolbar-actions { display: flex; flex-direction: column; gap: 8px; }
.toolbar-row { display: flex; align-items: center; gap: 8px; }
.date-picker { width: 160px; }

/* ── 統計 ───────────────────────────────────────────────────────────── */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card { border-radius: 14px; padding: 16px; color: #fff; }
.stat-num  { font-size: 28px; font-weight: 800; line-height: 1; }
.stat-label { font-size: 13px; opacity: .85; margin-top: 4px; }

/* ── 打卡卡片 ───────────────────────────────────────────────────────── */
.record-list { display: flex; flex-direction: column; gap: 10px; }
.record-card {
  background: #fff; border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.rec-top {
  display: flex; align-items: center;
  justify-content: space-between;
}
.rec-left { display: flex; align-items: center; gap: 12px; }
.rec-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.rec-ph {
  width: 40px; height: 40px; border-radius: 50%;
  background: #e2e8f0; color: #64748b;
  display: grid; place-items: center;
  font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.rec-name { font-size: 14px; font-weight: 600; color: #1e293b; }

/* 桌機時間（右側） */
.desktop-times { display: flex; align-items: center; gap: 12px; }
.mobile-times  { display: none; }

.time-item {
  display: flex; flex-direction: column;
  align-items: center; gap: 2px; min-width: 52px;
}
.tl { font-size: 12px; color: #94a3b8; }
.tv { font-size: 15px; font-weight: 700; color: #1e293b; }
.tv.dim { color: #cbd5e1; }
.tdiv { width: 1px; height: 32px; background: #f1f5f9; }

/* 手機時間（底部橫排） */
.mobile-time-item {
  display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center;
}
.mobile-time-item .tl { font-size: 12px; color: #94a3b8; }
.mobile-time-item .tv { font-size: 15px; font-weight: 700; color: #1e293b; }
.tdiv-v { width: 1px; height: 24px; background: #f1f5f9; }

/* ── 底部導覽（手機）──────────────────────────────────────────────── */
.bottom-nav { display: none; }

/* ── RWD ────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .sidebar    { display: none; }
  .bottom-nav {
    display: flex;
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #1e293b;
    border-top: 1px solid #334155;
    z-index: 100;
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

  .content {
    padding: 16px 12px;
    padding-bottom: 80px; /* 避免被底部導覽蓋住 */
  }
  .page-title { font-size: 17px; }
  .toolbar { gap: 8px; }
  .toolbar-actions { width: 100%; }
  .toolbar-row { width: 100%; }
  .date-picker { flex: 1; width: auto !important; min-width: 0; }

  .stat-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .stat-card { padding: 12px; border-radius: 12px; }
  .stat-num  { font-size: 24px; }

  .record-card { padding: 12px; }
  .desktop-times { display: none; }
  .mobile-times {
    display: flex;
    align-items: center;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;
  }
}

@media (max-width: 375px) {
  .content { padding: 12px 10px; padding-bottom: 80px; }
  .stat-num { font-size: 22px; }
  .rec-name { font-size: 13px; }
}
</style>
