<template>
  <div class="anomaly-page">
    <h2 class="page-title">異常報告</h2>

    <!-- 篩選工具列 -->
    <div class="toolbar">
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        placeholder="選擇月份"
        format="YYYY/MM"
        value-format="YYYY-MM"
        style="width:160px"
        @change="load"
      />
      <el-select
        v-model="selectedEmpId"
        placeholder="全部員工"
        clearable
        style="width:160px"
        @change="load"
      >
        <el-option
          v-for="e in employees"
          :key="e.id"
          :label="e.display_name"
          :value="e.id"
        />
      </el-select>
      <el-button type="primary" :loading="loading" @click="load">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 載入中 -->
    <el-skeleton v-if="loading" :rows="6" animated />

    <!-- 無異常 -->
    <el-empty
      v-else-if="!loading && report.length === 0"
      description="本月無異常紀錄"
    />

    <!-- 異常列表 -->
    <div v-else class="report-list">
      <div
        v-for="emp in report"
        :key="emp.employee_id"
        class="emp-card"
      >
        <!-- 員工標題 -->
        <div class="emp-header">
          <span class="emp-name">{{ emp.employee_name }}</span>
          <div class="emp-badges">
            <el-tag v-if="emp.anomaly_days.length" type="danger" size="small">
              ⚠ {{ emp.anomaly_days.length }} 天缺打卡
            </el-tag>
            <el-tag v-if="emp.unscheduled_days.length" type="warning" size="small">
              ⚠ {{ emp.unscheduled_days.length }} 天未排班打卡
            </el-tag>
          </div>
        </div>

        <!-- 缺打卡明細 -->
        <template v-if="emp.anomaly_days.length">
          <div class="section-title">缺打卡（排班日但僅有單筆）</div>
          <el-table :data="emp.anomaly_days" size="small" class="detail-table">
            <el-table-column label="日期" prop="date" min-width="110">
              <template #default="{ row }">
                {{ row.date }} {{ weekday(row.date) }}
              </template>
            </el-table-column>
            <el-table-column label="上班打卡" align="center" min-width="110">
              <template #default="{ row }">
                <span v-if="row.clock_in" class="time-ok">{{ fmtTime(row.clock_in) }}</span>
                <span v-else class="time-miss">—</span>
              </template>
            </el-table-column>
            <el-table-column label="下班打卡" align="center" min-width="110">
              <template #default="{ row }">
                <span v-if="row.clock_out" class="time-ok">{{ fmtTime(row.clock_out) }}</span>
                <span v-else class="time-miss">—</span>
              </template>
            </el-table-column>
            <el-table-column label="狀態" align="center" min-width="120">
              <template #default="{ row }">
                <el-tag type="danger" size="small">
                  {{ row.clock_in && !row.clock_out ? '缺下班打卡' : '缺上班打卡' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </template>

        <!-- 未排班打卡明細 -->
        <template v-if="emp.unscheduled_days.length">
          <div class="section-title" style="margin-top:12px">未排班打卡（有打卡但無排班）</div>
          <el-table :data="emp.unscheduled_days" size="small" class="detail-table">
            <el-table-column label="日期" prop="date" min-width="110">
              <template #default="{ row }">
                {{ row.date }} {{ weekday(row.date) }}
              </template>
            </el-table-column>
            <el-table-column label="上班打卡" align="center" min-width="110">
              <template #default="{ row }">
                <span v-if="row.clock_in" class="time-ok">{{ fmtTime(row.clock_in) }}</span>
                <span v-else class="time-miss">—</span>
              </template>
            </el-table-column>
            <el-table-column label="下班打卡" align="center" min-width="110">
              <template #default="{ row }">
                <span v-if="row.clock_out" class="time-ok">{{ fmtTime(row.clock_out) }}</span>
                <span v-else class="time-miss">—</span>
              </template>
            </el-table-column>
            <el-table-column label="狀態" align="center" min-width="120">
              <template #default>
                <el-tag type="warning" size="small">未排班打卡</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchAnomalyReport, fetchEmployees } from '@/api/http'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function todayYM() {
  const now = new Date(Date.now() + 8 * 3600000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function weekday(dateStr) {
  return '（' + WEEKDAYS[new Date(dateStr + 'T00:00:00').getDay()] + '）'
}

function fmtTime(dt) {
  if (!dt) return '—'
  // backend returns TW naive datetime (no timezone suffix) → slice directly
  return dt.slice(11, 16)
}

const selectedMonth = ref(todayYM())
const selectedEmpId = ref(null)
const employees     = ref([])
const report        = ref([])
const loading       = ref(false)

onMounted(async () => {
  employees.value = await fetchEmployees()
  await load()
})

async function load() {
  if (!selectedMonth.value) return
  const [year, month] = selectedMonth.value.split('-').map(Number)
  loading.value = true
  try {
    report.value = await fetchAnomalyReport(year, month, selectedEmpId.value)
  } catch {
    ElMessage.error('載入失敗')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.anomaly-page {
  padding: 24px;
  background: var(--bg-app);
  min-height: 100%;
  transition: background .2s;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
  transition: color .2s;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.emp-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}

.emp-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.emp-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

.emp-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.detail-table { }

/* table theming */
.anomaly-page :deep(.el-table),
.anomaly-page :deep(.el-table tr),
.anomaly-page :deep(.el-table__inner-wrapper),
.anomaly-page :deep(.el-table__body-wrapper),
.anomaly-page :deep(.el-table__header-wrapper) {
  background: var(--bg-card) !important;
}
.anomaly-page :deep(th.el-table__cell) {
  background: var(--bg-inner) !important;
  color: var(--text-secondary) !important;
  border-color: var(--border-color) !important;
}
.anomaly-page :deep(td.el-table__cell) {
  background: var(--bg-card) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}
.anomaly-page :deep(.el-table__row:hover td.el-table__cell),
.anomaly-page :deep(.el-table__row.hover-row td.el-table__cell) {
  background: var(--bg-inner) !important;
}

.time-ok   { color: var(--text-primary); font-weight: 600; }
.time-miss { color: #ef4444; font-weight: 700; font-size: 16px; }
</style>
