<template>
  <div class="att-page">
    <h2 class="page-title">出勤紀錄</h2>

    <!-- 工具列 -->
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
      <span class="record-count">共 {{ rows.length }} 筆</span>
    </div>

    <!-- 桌機表格 -->
    <div class="table-wrap desktop-table" v-loading="loading" element-loading-background="transparent">
      <table class="att-table">
        <thead>
          <tr>
            <th>員工</th>
            <th>日期</th>
            <th style="text-align:center">上班打卡</th>
            <th style="text-align:center">下班打卡</th>
            <th style="text-align:right">工時</th>
            <th style="text-align:center">狀態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.employee_id + row.work_date" :class="{ 'row-anomaly': !row.clock_in || !row.clock_out || !row.has_schedule }">
            <td>
              <div class="emp-cell">
                <img v-if="row.picture_url" :src="row.picture_url" class="mini-avatar" referrerpolicy="no-referrer" />
                <div v-else class="mini-ph">{{ row.employee_name?.[0] }}</div>
                {{ row.employee_name }}
              </div>
            </td>
            <td>{{ row.work_date }} {{ weekday(row.work_date) }}</td>
            <td style="text-align:center">
              <span v-if="row.clock_in" class="time-ok">{{ fmtTime(row.clock_in) }}</span>
              <span v-else class="time-miss">—</span>
            </td>
            <td style="text-align:center">
              <span v-if="row.clock_out" class="time-ok">{{ fmtTime(row.clock_out) }}</span>
              <span v-else class="time-miss">—</span>
            </td>
            <td style="text-align:right">
              <span v-if="row.worked_minutes != null">{{ (row.worked_minutes / 60).toFixed(1) }} h</span>
              <span v-else class="time-miss">—</span>
            </td>
            <td style="text-align:center">
              <el-tag :type="statusType(row)" size="small">{{ statusLabel(row) }}</el-tag>
            </td>
            <td>
              <div class="action-btns">
                <el-button size="small" type="primary" :icon="EditIcon" @click="openEdit(row)">編輯</el-button>
                <el-button size="small" type="danger" :icon="DeleteIcon" @click="confirmDelete(row)">刪除</el-button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !rows.length">
            <td colspan="7" class="empty-row">本月無出勤紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 手機卡片 -->
    <div class="mobile-cards" v-loading="loading" element-loading-background="transparent">
      <div v-if="!loading && !rows.length" class="empty-row">本月無出勤紀錄</div>
      <div
        v-for="row in rows"
        :key="row.employee_id + row.work_date"
        class="att-card"
        :class="{ 'card-anomaly': !row.clock_in || !row.clock_out || !row.has_schedule }"
      >
        <div class="card-top">
          <div class="emp-cell">
            <img v-if="row.picture_url" :src="row.picture_url" class="mini-avatar" referrerpolicy="no-referrer" />
            <div v-else class="mini-ph">{{ row.employee_name?.[0] }}</div>
            <span class="emp-name">{{ row.employee_name }}</span>
          </div>
          <el-tag :type="statusType(row)" size="small">{{ statusLabel(row) }}</el-tag>
        </div>
        <div class="card-row">
          <span class="card-label">日期</span>
          <span>{{ row.work_date }} {{ weekday(row.work_date) }}</span>
        </div>
        <div class="card-row">
          <span class="card-label">上班</span>
          <span v-if="row.clock_in" class="time-ok">{{ fmtTime(row.clock_in) }}</span>
          <span v-else class="time-miss">—</span>
          <span class="card-label" style="margin-left:12px">下班</span>
          <span v-if="row.clock_out" class="time-ok">{{ fmtTime(row.clock_out) }}</span>
          <span v-else class="time-miss">—</span>
          <span v-if="row.worked_minutes != null" class="card-hours">{{ (row.worked_minutes / 60).toFixed(1) }}h</span>
        </div>
        <div class="card-actions">
          <el-button size="small" type="primary" :icon="EditIcon" @click="openEdit(row)">編輯</el-button>
          <el-button size="small" type="danger" :icon="DeleteIcon" @click="confirmDelete(row)">刪除</el-button>
        </div>
      </div>
    </div>
  </div>

  <!-- 編輯打卡 Dialog -->
  <el-dialog v-model="editDialog" :title="`編輯打卡 — ${editForm.employee_name} ${editForm.work_date}`" width="360px" align-center>
    <el-form :model="editForm" label-position="top" style="margin-top:4px;">
      <el-form-item label="上班打卡時間">
        <div class="time-field">
          <el-time-picker v-model="editForm.clock_in_time" format="HH:mm" value-format="HH:mm" style="flex:1" clearable placeholder="留空表示無紀錄" />
          <el-tag v-if="editForm.clock_in_id === null && editForm.clock_in_time" type="warning" size="small">新增</el-tag>
        </div>
      </el-form-item>
      <el-form-item label="下班打卡時間">
        <div class="time-field">
          <el-time-picker v-model="editForm.clock_out_time" format="HH:mm" value-format="HH:mm" style="flex:1" clearable placeholder="留空表示無紀錄" />
          <el-tag v-if="editForm.clock_out_id === null && editForm.clock_out_time" type="warning" size="small">新增</el-tag>
        </div>
      </el-form-item>
      <el-form-item
        v-if="(editForm.clock_in_id === null && editForm.clock_in_time) || (editForm.clock_out_id === null && editForm.clock_out_time)"
        label="補打卡原因"
      >
        <el-input v-model="editForm.reason" placeholder="新增打卡紀錄時必填" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editDialog = false">取消</el-button>
      <el-button type="primary" @click="submitEdit">儲存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit as EditIcon, Delete as DeleteIcon } from '@element-plus/icons-vue'
import { fetchMonthlyAttendance, fetchEmployees, postOverride, patchAttendance, deleteAttendance } from '@/api/http'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function todayYM() {
  const now = new Date(Date.now() + 8 * 3600000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function weekday(dateStr) {
  return '（' + WEEKDAYS[new Date(dateStr + 'T00:00:00').getDay()] + '）'
}

function fmtTime(dtStr) {
  if (!dtStr) return '—'
  // 後端已回傳台灣時間字串（無時區標記），直接取 HH:MM
  return dtStr.slice(11, 16)
}

function statusLabel(row) {
  if (!row.has_schedule)             return '異常'
  if (row.clock_in && row.clock_out) return '正常'
  if (row.clock_in)                  return '缺下班打卡'
  if (row.clock_out)                 return '缺上班打卡'
  return '無紀錄'
}

function statusType(row) {
  if (!row.has_schedule)             return 'danger'
  if (row.clock_in && row.clock_out) return 'success'
  if (row.clock_in || row.clock_out) return 'danger'
  return 'info'
}

function rowClass({ row }) {
  if (!row.clock_in || !row.clock_out) return 'row-anomaly'
  return ''
}

const selectedMonth = ref(todayYM())
const selectedEmpId = ref(null)
const employees     = ref([])
const rows          = ref([])
const loading       = ref(false)

onMounted(async () => {
  employees.value = await fetchEmployees()
  await load()
})

// ── 編輯打卡 ──────────────────────────────────────────────
const editDialog = ref(false)
const editForm = reactive({
  work_date: '',
  employee_id: null,
  employee_name: '',
  clock_in_id: null,
  clock_out_id: null,
  clock_in_time: '',
  clock_out_time: '',
  reason: '',
})

function openEdit(row) {
  editForm.work_date      = row.work_date
  editForm.employee_id    = row.employee_id
  editForm.employee_name  = row.employee_name
  editForm.clock_in_id    = row.clock_in_id  ?? null
  editForm.clock_out_id   = row.clock_out_id ?? null
  editForm.clock_in_time  = row.clock_in  ? fmtTime(row.clock_in)  : ''
  editForm.clock_out_time = row.clock_out ? fmtTime(row.clock_out) : ''
  editForm.reason         = ''
  editDialog.value = true
}

async function submitEdit() {
  const needNew = (editForm.clock_in_id === null && editForm.clock_in_time) ||
                  (editForm.clock_out_id === null && editForm.clock_out_time)
  if (needNew && !editForm.reason.trim()) {
    ElMessage.warning('請填寫補打卡原因')
    return
  }
  try {
    const ops = []
    // 上班打卡
    if (editForm.clock_in_id !== null && editForm.clock_in_time) {
      ops.push(patchAttendance(editForm.clock_in_id, { date: editForm.work_date, time: editForm.clock_in_time }))
    } else if (editForm.clock_in_id === null && editForm.clock_in_time) {
      ops.push(postOverride({
        employee_id: editForm.employee_id,
        check_type:  'clock_in',
        override_at: new Date(`${editForm.work_date}T${editForm.clock_in_time}:00+08:00`).toISOString(),
        reason:      editForm.reason,
      }))
    }
    // 下班打卡
    if (editForm.clock_out_id !== null && editForm.clock_out_time) {
      ops.push(patchAttendance(editForm.clock_out_id, { date: editForm.work_date, time: editForm.clock_out_time }))
    } else if (editForm.clock_out_id === null && editForm.clock_out_time) {
      ops.push(postOverride({
        employee_id: editForm.employee_id,
        check_type:  'clock_out',
        override_at: new Date(`${editForm.work_date}T${editForm.clock_out_time}:00+08:00`).toISOString(),
        reason:      editForm.reason,
      }))
    }
    if (!ops.length) { ElMessage.info('未做任何修改'); return }
    await Promise.all(ops)
    ElMessage.success('已更新')
    editDialog.value = false
    await load()
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '更新失敗')
  }
}

async function confirmDelete(row) {
  const parts = []
  if (row.clock_in_id)  parts.push('上班打卡')
  if (row.clock_out_id) parts.push('下班打卡')
  if (!parts.length) { ElMessage.warning('此日無打卡紀錄'); return }
  try {
    await ElMessageBox.confirm(
      `確定要刪除 ${row.employee_name} ${row.work_date} 的${parts.join('與')}紀錄？此操作無法復原。`,
      '刪除打卡紀錄',
      { confirmButtonText: '確定刪除', cancelButtonText: '取消', type: 'warning' }
    )
    const promises = []
    if (row.clock_in_id)  promises.push(deleteAttendance(row.clock_in_id))
    if (row.clock_out_id) promises.push(deleteAttendance(row.clock_out_id))
    await Promise.all(promises)
    ElMessage.success('已刪除')
    await load()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('刪除失敗')
  }
}

async function load() {
  if (!selectedMonth.value) return
  const [year, month] = selectedMonth.value.split('-').map(Number)
  loading.value = true
  try {
    rows.value = await fetchMonthlyAttendance(year, month, selectedEmpId.value)
  } catch {
    ElMessage.error('載入失敗')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.att-page {
  padding: 24px;
  height: 100%;
  background: var(--bg-app);
  transition: background .2s;
  display: flex;
  flex-direction: column;
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
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.record-count {
  font-size: 14px;
  color: var(--text-secondary);
}

/* ── 桌機表格 ── */
.table-wrap {
  background: var(--bg-card); border-radius: 12px;
  overflow: hidden; border: 1px solid var(--border-color); min-height: 120px;
  transition: background .2s, border-color .2s;
}
.att-table { width: 100%; border-collapse: collapse; font-size: 16px; }
.att-table thead tr { background: var(--bg-inner); }
.att-table th {
  padding: 13px 16px; text-align: left; color: var(--text-muted);
  font-weight: 700; font-size: 16px;
  border-bottom: 1px solid var(--border-color);
}
.att-table tbody tr { border-bottom: 1px solid var(--divider); transition: background .15s; }
.att-table tbody tr:last-child { border-bottom: none; }
.att-table tbody tr:hover { background: var(--bg-inner); }
.att-table td { padding: 12px 16px; color: var(--text-secondary); vertical-align: middle; font-size: 16px; white-space: nowrap; }
.att-table tr.row-anomaly td { background: rgba(239,68,68,.06); }
.att-table tr.row-anomaly:hover td { background: rgba(239,68,68,.12); }

.emp-cell { display: flex; align-items: center; gap: 10px; }
.mini-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.mini-ph {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg,#3b82f6,#1d4ed8);
  color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.emp-name { font-weight: 600; color: var(--text-primary); }
.time-ok   { font-weight: 600; color: var(--text-primary); }
.time-miss { font-weight: 700; color: #ef4444; }
.empty-row { text-align: center; color: var(--text-muted); padding: 40px; }
.action-btns { display: flex; gap: 6px; flex-wrap: nowrap; align-items: center; }
.time-field  { display: flex; align-items: center; gap: 8px; width: 100%; }

/* ── 手機卡片 ── */
.mobile-cards { display: none; flex-direction: column; gap: 10px; }
.att-card {
  background: var(--bg-card); border-radius: 12px;
  padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
  border: 1px solid var(--border-color);
  transition: background .2s, border-color .2s;
}
.att-card.card-anomaly { border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.04); }
.card-top { display: flex; align-items: center; justify-content: space-between; }
.card-row { display: flex; align-items: center; gap: 6px; font-size: 15px; color: var(--text-secondary); flex-wrap: wrap; }
.card-label { color: var(--text-muted); font-weight: 600; min-width: 28px; }
.card-hours { margin-left: auto; color: var(--text-muted); font-size: 14px; }
.card-actions { display: flex; gap: 8px; padding-top: 4px; }

/* ── RWD ── */
@media (max-width: 768px) {
  .att-page { padding: 20px 14px 100px; }
  .desktop-table { display: none; }
  .mobile-cards { display: flex; }
}
</style>
