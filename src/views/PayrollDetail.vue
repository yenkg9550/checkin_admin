<template>
  <div class="pd-page">
    <h2 class="page-title">個人薪資明細</h2>

    <div class="toolbar">
      <el-select
        v-model="selectedEmpId"
        placeholder="選擇員工"
        filterable
        clearable
        style="width:200px"
        @change="load"
      >
        <el-option v-for="e in employees" :key="e.id" :label="e.display_name" :value="e.id" />
      </el-select>
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        placeholder="選擇月份"
        format="YYYY/MM"
        value-format="YYYY-MM"
        style="width:160px"
        @change="load"
      />
    </div>

    <!-- 摘要卡片 -->
    <div v-if="summary" class="summary-cards">
      <div class="s-card">
        <span class="s-label">出勤</span>
        <span class="s-val">{{ ((summary.worked_minutes - summary.overtime_minutes) / 60).toFixed(1) }} h</span>
      </div>
      <div class="s-card">
        <span class="s-label">加班</span>
        <span class="s-val blue">{{ (summary.overtime_minutes / 60).toFixed(1) }} h</span>
      </div>
      <div class="s-card">
        <span class="s-label">遲到</span>
        <span class="s-val" :class="summary.late_minutes > 0 ? 'warn' : ''">{{ (summary.late_minutes / 60).toFixed(1) }} h</span>
      </div>
      <div class="s-card">
        <span class="s-label">早退</span>
        <span class="s-val" :class="summary.early_leave_minutes > 0 ? 'warn' : ''">{{ (summary.early_leave_minutes / 60).toFixed(1) }} h</span>
      </div>
      <div class="s-card">
        <span class="s-label">底薪</span>
        <span class="s-val">{{ summary.base_pay.toLocaleString() }}</span>
      </div>
      <div class="s-card">
        <span class="s-label">加班薪</span>
        <span class="s-val blue">{{ summary.overtime_pay.toLocaleString() }}</span>
      </div>
      <div class="s-card">
        <span class="s-label">扣款</span>
        <span class="s-val" :class="summary.deductions > 0 ? 'deduct' : ''">
          {{ summary.deductions > 0 ? '-' : '' }}{{ summary.deductions.toLocaleString() }}
        </span>
      </div>
      <div class="s-card highlight">
        <span class="s-label">合計</span>
        <span class="s-val blue">{{ summary.total_pay.toLocaleString() }}</span>
      </div>
    </div>

    <!-- 每日明細表 -->
    <div v-loading="loading" class="detail-wrap">
      <div v-if="!selectedEmpId" class="empty">請先選擇員工</div>
      <div v-else-if="!loading && !dailyDetails.length" class="empty">本月無薪資明細資料</div>
      <el-table v-else :data="dailyDetails" class="detail-table" size="default" :row-class-name="rowClass">
        <el-table-column label="日期" min-width="70">
          <template #default="{ row }">
            <span class="nowrap">{{ row.work_date?.slice(5) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="班別" prop="shift_name" min-width="80" />
        <el-table-column label="班別時間" min-width="110">
          <template #default="{ row }">
            <span class="nowrap">{{ row.start_time }}–{{ row.end_time }}</span>
          </template>
        </el-table-column>
        <el-table-column label="打卡上班" min-width="90">
          <template #default="{ row }">
            <span class="nowrap">{{ row.clock_in ? fmtTime(row.clock_in) : '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="打卡下班" min-width="90">
          <template #default="{ row }">
            <span class="nowrap">{{ row.clock_out ? fmtTime(row.clock_out) : '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="遲到(h)" min-width="80" align="right">
          <template #default="{ row }">
            <span class="nowrap" :class="row.late_minutes > 0 ? 'warn' : ''">
              {{ row.late_minutes > 0 ? (row.late_minutes / 60).toFixed(1) : '' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="早退(h)" min-width="80" align="right">
          <template #default="{ row }">
            <span class="nowrap" :class="row.early_leave_minutes > 0 ? 'warn' : ''">
              {{ row.early_leave_minutes > 0 ? (row.early_leave_minutes / 60).toFixed(1) : '' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="加班(h)" min-width="80" align="right">
          <template #default="{ row }">
            <span class="nowrap blue" v-if="row.overtime_minutes > 0">
              {{ (row.overtime_minutes / 60).toFixed(1) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="加班日" min-width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_overtime" type="warning" size="small" effect="plain">OT</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="特別假日" min-width="90" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.is_holiday" color="#f56c6c"><CircleCheck /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="當日薪資" align="right" min-width="90">
          <template #default="{ row }">
            <span :class="row.has_override ? 'override-mark' : ''">{{ row.daily_pay.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="" width="44" align="center" class-name="edit-col">
          <template #default="{ row }">
            <span class="edit-icon-btn" :class="row.has_override ? 'is-override' : ''" @click="openEdit(row)">
              <el-icon size="15"><EditPen /></el-icon>
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 編輯 Dialog -->
    <el-dialog
      v-model="editVisible"
      :title="`編輯 ${editForm.work_date} 明細`"
      width="420px"
      align-center
      class="edit-dialog"
    >
      <el-form :model="editForm" label-width="100px" size="default" style="margin-top:4px">
        <el-form-item label="打卡上班">
          <span class="readonly-time">{{ editForm.clock_in_time || '—' }}</span>
          <span class="readonly-hint">請至出勤紀錄頁面修改</span>
        </el-form-item>
        <el-form-item label="打卡下班">
          <span class="readonly-time">{{ editForm.clock_out_time || '—' }}</span>
          <span class="readonly-hint">請至出勤紀錄頁面修改</span>
        </el-form-item>
        <el-form-item label="遲到 (分)">
          <el-input-number v-model="editForm.late_minutes" :min="0" :step="1" style="width:150px" clearable />
        </el-form-item>
        <el-form-item label="早退 (分)">
          <el-input-number v-model="editForm.early_leave_minutes" :min="0" :step="1" style="width:150px" clearable />
        </el-form-item>
        <el-form-item label="加班 (分)">
          <el-input-number v-model="editForm.overtime_minutes" :min="0" :step="1" style="width:150px" clearable />
        </el-form-item>
        <el-form-item label="當日薪資">
          <el-input-number v-model="editForm.daily_pay" :min="0" :step="1" :precision="0" style="width:150px" clearable />
          <span style="margin-left:8px;font-size:13px;color:var(--text-muted)">留空自動計算</span>
        </el-form-item>
        <el-form-item label="備註">
          <el-input v-model="editForm.note" placeholder="選填" style="width:220px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="editForm.has_override" type="danger" text :loading="saving" @click="clearOverride">清除覆寫</el-button>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, EditPen } from '@element-plus/icons-vue'
import { fetchEmployees, fetchPayroll, fetchPayrollDetail, upsertDayOverride, deleteDayOverride } from '@/api/http'

const employees     = ref([])
const selectedEmpId = ref(null)
const selectedMonth = ref(todayYM())
const summary       = ref(null)
const summaryRecId  = ref(null)
const dailyDetails  = ref([])
const loading       = ref(false)

const editVisible = ref(false)
const saving      = ref(false)
const editForm    = reactive({
  work_date: '',
  clock_in_time: null,
  clock_out_time: null,
  late_minutes: null,
  early_leave_minutes: null,
  overtime_minutes: null,
  daily_pay: null,
  note: '',
  has_override: false,
})

function todayYM() {
  const now = new Date(Date.now() + 8 * 3600000)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

onMounted(async () => {
  try { employees.value = await fetchEmployees() }
  catch { ElMessage.error('載入員工失敗') }
})

async function load() {
  if (!selectedEmpId.value || !selectedMonth.value) return
  loading.value = true
  summary.value = null
  summaryRecId.value = null
  dailyDetails.value = []
  try {
    const [y, m] = selectedMonth.value.split('-').map(Number)
    const records = await fetchPayroll(y, m)
    const rec = records.find(r => r.employee_id === selectedEmpId.value)
    if (!rec) { loading.value = false; return }
    summary.value = rec
    summaryRecId.value = rec.id
    dailyDetails.value = await fetchPayrollDetail(rec.id)
  } catch { ElMessage.error('載入失敗') }
  finally { loading.value = false }
}

function rowClass({ row }) {
  const hasIn  = !!row.clock_in
  const hasOut = !!row.clock_out
  if ((hasIn && !hasOut) || (!hasIn && hasOut)) return 'row-anomaly'
  return ''
}

function fmtTime(dt) {
  if (!dt) return '—'
  // backend returns TW naive datetime (no timezone suffix) → slice directly
  return dt.slice(11, 16)
}

function openEdit(row) {
  editForm.work_date           = row.work_date
  editForm.clock_in_time       = row.clock_in ? fmtTime(row.clock_in) : null
  editForm.clock_out_time      = row.clock_out ? fmtTime(row.clock_out) : null
  editForm.late_minutes        = null  // 永遠留空，由打卡時間自動計算
  editForm.early_leave_minutes = null  // 同上
  editForm.overtime_minutes    = row.has_override ? row.overtime_minutes    : null
  editForm.daily_pay           = (row.has_override && row.daily_pay > 0) ? row.daily_pay : null
  editForm.note                = ''
  editForm.has_override        = row.has_override
  editVisible.value = true
}

function timeToDatetime(date_str, time_str, ref_time_str = null) {
  if (!time_str) return null
  let dt = new Date(`${date_str}T${time_str}:00`)
  // 如果有參照時間（上班），且下班比上班早 → 跨日，+1 天
  if (ref_time_str) {
    const ref = new Date(`${date_str}T${ref_time_str}:00`)
    if (dt <= ref) dt = new Date(dt.getTime() + 86400000)
  }
  const y = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const d  = String(dt.getDate()).padStart(2, '0')
  const h  = String(dt.getHours()).padStart(2, '0')
  const mi = String(dt.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${d}T${h}:${mi}:00`
}

async function saveEdit() {
  saving.value = true
  try {
    await upsertDayOverride(summaryRecId.value, {
      work_date:           editForm.work_date,
      clock_in:            timeToDatetime(editForm.work_date, editForm.clock_in_time),
      clock_out:           timeToDatetime(editForm.work_date, editForm.clock_out_time, editForm.clock_in_time),
      late_minutes:        editForm.late_minutes        ?? null,
      early_leave_minutes: editForm.early_leave_minutes ?? null,
      overtime_minutes:    editForm.overtime_minutes    ?? null,
      daily_pay:           editForm.daily_pay           ?? null,
      note:                editForm.note || null,
    })
    ElMessage.success('已儲存覆寫')
    editVisible.value = false
    await load()
  } catch { ElMessage.error('儲存失敗') }
  finally { saving.value = false }
}

async function clearOverride() {
  saving.value = true
  try {
    await deleteDayOverride(summaryRecId.value, editForm.work_date)
    ElMessage.success('已清除覆寫，恢復自動計算')
    editVisible.value = false
    await load()
  } catch { ElMessage.error('清除失敗') }
  finally { saving.value = false }
}
</script>

<style scoped>
.pd-page {
  padding: 24px;
  background: var(--bg-app);
  transition: background .2s;
  min-height: 100%;
}
.page-title {
  font-size: 20px; font-weight: 600;
  color: var(--text-primary); margin: 0 0 20px;
}
.toolbar {
  display: flex; align-items: center; gap: 12px;
  flex-wrap: wrap; margin-bottom: 20px;
}

/* 摘要卡片 */
.summary-cards { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.s-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 12px 18px;
  display: flex; flex-direction: column; gap: 4px; min-width: 90px;
}
.s-card.highlight { border-color: #3b82f6; }
.s-label { font-size: 14px; color: var(--text-muted); }
.s-val { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.s-val.blue   { color: #3b82f6; }
.s-val.warn   { color: #e6a23c; }
.s-val.deduct { color: #f56c6c; }

/* 明細表 */
.detail-wrap { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); overflow: hidden; }
.empty { padding: 48px; text-align: center; color: var(--text-muted); font-size: 16px; }
.detail-table { width: 100%; }
.nowrap { white-space: nowrap; }
.override-mark { color: #f59e0b; font-weight: 700; }
.readonly-time { font-weight: 600; color: var(--text-primary); font-size: 14px; }
.readonly-hint { margin-left: 8px; font-size: 12px; color: var(--text-muted); }
.pd-page :deep(.edit-col .cell) {
  padding: 0;
  overflow: visible;
  text-overflow: unset;
  display: flex;
  justify-content: center;
}
.edit-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
  color: var(--text-muted); transition: color .15s, background .15s;
}
.edit-icon-btn:hover { color: #3b82f6; background: rgba(59,130,246,.1); }
.edit-icon-btn.is-override { color: #f59e0b; }
.edit-icon-btn.is-override:hover { background: rgba(245,158,11,.1); }

.pd-page :deep(.el-table),
.pd-page :deep(.el-table tr),
.pd-page :deep(.el-table__inner-wrapper),
.pd-page :deep(.el-table__body-wrapper),
.pd-page :deep(.el-table__header-wrapper) { background: var(--bg-card) !important; }
.pd-page :deep(th.el-table__cell) {
  background: var(--bg-inner) !important; color: var(--text-secondary) !important;
  border-color: var(--border-color) !important; white-space: nowrap;
}
.pd-page :deep(td.el-table__cell) {
  background: var(--bg-card) !important; color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}
.pd-page :deep(.el-table__row:hover td.el-table__cell),
.pd-page :deep(.el-table__row.hover-row td.el-table__cell) { background: var(--bg-inner) !important; }
.pd-page :deep(.row-anomaly td.el-table__cell) { background: rgba(239,68,68,.08) !important; }
.pd-page :deep(.row-anomaly:hover td.el-table__cell),
.pd-page :deep(.row-anomaly.hover-row td.el-table__cell) { background: rgba(239,68,68,.14) !important; }
.pd-page :deep(.el-table__empty-block) { background: var(--bg-card) !important; }

.blue   { color: #3b82f6; font-weight: 600; }
.warn   { color: #e6a23c; font-weight: 600; }
.deduct { color: #f56c6c; }

:deep(.el-date-editor .el-input__wrapper) {
  background: var(--bg-card) !important;
  box-shadow: 0 0 0 1px var(--border-color) !important;
}
:deep(.el-date-editor .el-input__inner) { color: var(--text-primary) !important; }
:deep(.edit-dialog .el-dialog) { background: var(--bg-card); border: 1px solid var(--border-color); }
:deep(.el-dialog__title)    { color: var(--text-primary); }
:deep(.el-form-item__label) { color: var(--text-primary); }
:deep(.el-input__wrapper) { background: var(--bg-inner) !important; box-shadow: 0 0 0 1px var(--border-color) !important; }
:deep(.el-input__inner)   { color: var(--text-primary) !important; }

@media (max-width: 768px) {
  .pd-page { padding: 16px 14px 100px; }
  .summary-cards { gap: 8px; }
  .s-card { min-width: 80px; padding: 10px 12px; }
  .s-val { font-size: 16px; }
}
</style>
