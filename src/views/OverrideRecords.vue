<script setup>
import { ref, onMounted } from 'vue'
import { fetchEmployees, fetchOverrides } from '@/api/http.js'
import { ElMessage } from 'element-plus'

const employees   = ref([])
const records     = ref([])
const loading     = ref(false)
const filterEmp   = ref(null)
const filterYear  = ref(null)
const filterMonth = ref(null)

const yearOptions  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

onMounted(async () => {
  try {
    employees.value = await fetchEmployees()
  } catch {
    ElMessage.error('載入員工列表失敗')
  }
  await loadRecords()
})

async function loadRecords() {
  loading.value = true
  try {
    const params = {}
    if (filterEmp.value)   params.employee_id = filterEmp.value
    if (filterYear.value)  params.year        = filterYear.value
    if (filterMonth.value) params.month       = filterMonth.value
    records.value = await fetchOverrides(params)
  } catch {
    ElMessage.error('載入補打卡紀錄失敗')
  } finally {
    loading.value = false
  }
}

const checkTypeLabel = (t) => t === 'clock_in' ? '上班' : '下班'
const checkTypeTag   = (t) => t === 'clock_in' ? 'success' : 'warning'

function formatDt(iso) {
  if (!iso) return '—'
  // backend returns +08:00 format; slice to get TW time without browser timezone dependency
  // e.g. "2026-05-02T09:00:00+08:00" → "2026-05-02 09:00"
  return iso.slice(0, 16).replace('T', ' ')
}
</script>

<template>
  <div class="override-page">
    <div class="page-header">
      <h2 class="page-title">補打卡紀錄</h2>
    </div>

    <!-- 篩選 -->
    <div class="filter-bar">
      <el-select v-model="filterEmp" placeholder="全部員工" clearable style="width:160px" @change="loadRecords">
        <el-option v-for="e in employees" :key="e.id" :label="e.display_name" :value="e.id" />
      </el-select>
      <el-select v-model="filterYear" placeholder="年份" clearable style="width:110px" @change="loadRecords">
        <el-option v-for="y in yearOptions" :key="y" :label="`${y} 年`" :value="y" />
      </el-select>
      <el-select v-model="filterMonth" placeholder="月份" clearable style="width:100px" @change="loadRecords">
        <el-option v-for="m in monthOptions" :key="m" :label="`${m} 月`" :value="m" />
      </el-select>
      <span class="record-hint" v-if="records.length">共 {{ records.length }} 筆</span>
    </div>

    <!-- 桌機表格 -->
    <div class="table-wrap desktop-view" v-loading="loading" element-loading-background="transparent">
      <table class="rec-table">
        <thead>
          <tr>
            <th>員工</th>
            <th>類型</th>
            <th>補打時間</th>
            <th>原因</th>
            <th>建立時間</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td>
              <div class="emp-info">
                <img v-if="r.picture_url" :src="r.picture_url" class="avatar" referrerpolicy="no-referrer" />
                <div v-else class="avatar-ph">{{ r.display_name?.[0] }}</div>
                <span class="emp-name">{{ r.display_name }}</span>
              </div>
            </td>
            <td>
              <el-tag :type="checkTypeTag(r.check_type)" size="small" effect="dark">
                {{ checkTypeLabel(r.check_type) }}
              </el-tag>
            </td>
            <td class="mono">{{ formatDt(r.override_at) }}</td>
            <td class="reason">{{ r.reason }}</td>
            <td class="mono muted">{{ formatDt(r.created_at) }}</td>
          </tr>
          <tr v-if="!loading && records.length === 0">
            <td colspan="5" class="empty">尚無補打卡紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 手機卡片 -->
    <div class="mobile-view" v-loading="loading" element-loading-background="transparent">
      <div v-if="!loading && records.length === 0" class="empty">尚無補打卡紀錄</div>
      <div v-for="r in records" :key="r.id" class="rec-card">
        <div class="card-top">
          <div class="emp-info">
            <img v-if="r.picture_url" :src="r.picture_url" class="avatar" referrerpolicy="no-referrer" />
            <div v-else class="avatar-ph">{{ r.display_name?.[0] }}</div>
            <span class="emp-name">{{ r.display_name }}</span>
          </div>
          <el-tag :type="checkTypeTag(r.check_type)" size="small" effect="dark">
            {{ checkTypeLabel(r.check_type) }}
          </el-tag>
        </div>
        <div class="card-row"><span class="label">補打時間</span><span class="mono">{{ formatDt(r.override_at) }}</span></div>
        <div class="card-row"><span class="label">原因</span><span>{{ r.reason }}</span></div>
        <div class="card-row muted"><span class="label">建立</span><span>{{ formatDt(r.created_at) }}</span></div>
      </div>
    </div>
  </div>

</template>

<style scoped>
.override-page {
  flex: 1;
  padding: 28px 32px;
  background: var(--bg-app);
  transition: background .2s;
}
.page-header { margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

.filter-bar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px;
}
.record-hint { font-size: 16px; color: var(--text-muted); }

/* 桌機表格 */
.table-wrap {
  background: var(--bg-card); border-radius: 12px;
  border: 1px solid var(--border-color); overflow: hidden;
  min-height: 200px; transition: background .2s, border-color .2s;
}
.rec-table { width: 100%; border-collapse: collapse; font-size: 16px; }
.rec-table thead tr { background: var(--bg-inner); }
.rec-table th {
  padding: 13px 16px; text-align: left;
  font-weight: 700; font-size: 16px; color: var(--text-muted);
  border-bottom: 1px solid var(--border-color);
}
.rec-table tbody tr { border-bottom: 1px solid var(--divider); transition: background .15s; }
.rec-table tbody tr:last-child { border-bottom: none; }
.rec-table tbody tr:hover { background: var(--bg-inner); }
.rec-table td { padding: 12px 16px; color: var(--text-secondary); vertical-align: middle; }

.emp-info { display: flex; align-items: center; gap: 10px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.avatar-ph {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg,#3b82f6,#1d4ed8);
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.emp-name { font-weight: 600; color: var(--text-primary); }
.mono { font-family: monospace; font-size: 16px; }
.muted { color: var(--text-muted); }
.reason { max-width: 300px; }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

/* 手機卡片 */
.mobile-view { display: none; flex-direction: column; gap: 10px; }
.rec-card {
  background: var(--bg-card); border-radius: 12px;
  border: 1px solid var(--border-color);
  padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
  transition: background .2s, border-color .2s;
}
.card-top { display: flex; align-items: center; justify-content: space-between; }
.card-row { display: flex; gap: 10px; font-size: 16px; color: var(--text-secondary); }
.card-row .label { color: var(--text-muted); font-weight: 600; min-width: 60px; }
.card-row.muted { color: var(--text-muted); font-size: 16px; }

@media (max-width: 768px) {
  .override-page { padding: 20px 14px 100px; }
  .desktop-view { display: none; }
  .mobile-view { display: flex; }
}
</style>
