<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchDailyReport, fetchEmployees, clearAllAttendance } from '@/api/http.js'

const rawRecords   = ref([])
const employees    = ref([])
const loading      = ref(true)
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
</script>

<template>
  <div class="dashboard-home">
    <!-- 標題列 -->
    <div class="toolbar">
      <h1 class="page-title">出勤管理</h1>
      <div class="toolbar-actions">
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
          <div class="desktop-times">
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
  </div>
</template>

<style scoped>
.dashboard-home {
  flex: 1;
  padding: 28px;
  background: #f8fafc;
  box-sizing: border-box;
}

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

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px; margin-bottom: 20px;
}
.stat-card { border-radius: 14px; padding: 16px; color: #fff; }
.stat-num  { font-size: 28px; font-weight: 800; line-height: 1; }
.stat-label { font-size: 13px; opacity: .85; margin-top: 4px; }

.record-list { display: flex; flex-direction: column; gap: 10px; }
.record-card {
  background: #fff; border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.rec-top { display: flex; align-items: center; justify-content: space-between; }
.rec-left { display: flex; align-items: center; gap: 12px; }
.rec-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.rec-ph {
  width: 40px; height: 40px; border-radius: 50%;
  background: #e2e8f0; color: #64748b;
  display: grid; place-items: center;
  font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.rec-name { font-size: 14px; font-weight: 600; color: #1e293b; }

.desktop-times { display: flex; align-items: center; gap: 12px; }
.mobile-times  { display: none; }
.time-item { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 52px; }
.tl { font-size: 12px; color: #94a3b8; }
.tv { font-size: 15px; font-weight: 700; color: #1e293b; }
.tv.dim { color: #cbd5e1; }
.tdiv { width: 1px; height: 32px; background: #f1f5f9; }
.mobile-time-item { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center; }
.mobile-time-item .tl { font-size: 12px; color: #94a3b8; }
.mobile-time-item .tv { font-size: 15px; font-weight: 700; color: #1e293b; }
.tdiv-v { width: 1px; height: 24px; background: #f1f5f9; }

@media (max-width: 768px) {
  .dashboard-home { padding: 16px 12px; }
  .page-title { font-size: 17px; }
  .toolbar { gap: 8px; }
  .toolbar-actions, .toolbar-row { width: 100%; }
  .date-picker { flex: 1; width: auto !important; min-width: 0; }
  .stat-row { grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px; }
  .stat-card { padding: 12px; border-radius: 12px; }
  .stat-num  { font-size: 24px; }
  .record-card { padding: 12px; }
  .desktop-times { display: none; }
  .mobile-times { display: flex; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f1f5f9; }
}
@media (max-width: 375px) {
  .stat-num { font-size: 22px; }
  .rec-name { font-size: 13px; }
}
</style>
