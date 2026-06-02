<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchShifts, createShift, updateShift, deleteShift,
  fetchSchedules, createSchedule, deleteSchedule, toggleScheduleOT,
  fetchEmployees, exportSchedule, exportSchedulePdf, exportSchedulePdfList,
  fetchHolidays,
} from '@/api/http.js'

// ── 狀態 ──────────────────────────────────────────────────────────────────────
const shifts    = ref([])
const schedules = ref([])
const employees = ref([])
const holidays  = ref([])
const loading   = ref(false)

const now          = new Date(Date.now() + 8 * 3600000)
const currentYear  = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)

// ── 班別管理 Dialog ───────────────────────────────────────────────────────────
const shiftDialog  = ref(false)
const shiftForm    = ref({ name: '', start_time: '09:00', end_time: '18:00', color: '#3b82f6', break_minutes: 0 })
const shiftColors  = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

// ── 排班 Dialog ───────────────────────────────────────────────────────────────
const assignDialog = ref(false)
const assignForm   = ref({ employee_id: null, shift_id: null, work_date: '', note: '', is_overtime: false })

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    [shifts.value, schedules.value, employees.value, holidays.value] = await Promise.all([
      fetchShifts(),
      fetchSchedules(currentYear.value, currentMonth.value),
      fetchEmployees(),
      fetchHolidays(currentYear.value, currentMonth.value).catch(() => []),
    ])
  } catch { ElMessage.error('載入失敗') }
  finally { loading.value = false }
}

async function changeMonth(delta) {
  currentMonth.value += delta
  if (currentMonth.value > 12) { currentMonth.value = 1;  currentYear.value++ }
  if (currentMonth.value < 1)  { currentMonth.value = 12; currentYear.value-- }
  await loadSchedules()
}

async function loadSchedules() {
  try {
    [schedules.value, holidays.value] = await Promise.all([
      fetchSchedules(currentYear.value, currentMonth.value),
      fetchHolidays(currentYear.value, currentMonth.value).catch(() => []),
    ])
  } catch { ElMessage.error('載入排班失敗') }
}

// ── 搜尋條件 ──────────────────────────────────────────────────────────────────
const filterEmployee = ref('')
const filterShift    = ref('')

const filteredSchedules = computed(() => {
  return schedules.value.filter(s => {
    const empOk   = !filterEmployee.value || s.employee_id === filterEmployee.value
    const shiftOk = !filterShift.value    || s.shift_id    === filterShift.value
    return empOk && shiftOk
  })
})

function clearFilter() {
  filterEmployee.value = ''
  filterShift.value    = ''
}

// ── 月曆計算 ──────────────────────────────────────────────────────────────────
const calendarDays = computed(() => {
  const y = currentYear.value, m = currentMonth.value
  const firstDay = new Date(y, m - 1, 1).getDay()  // 0=日
  const daysInMonth = new Date(y, m, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  return days
})

function schedulesForDay(day) {
  if (!day) return []
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  return filteredSchedules.value.filter(s => s.work_date === dateStr)
}

function isToday(day) {
  const t = new Date(Date.now() + 8 * 3600000)
  return day === t.getDate() && currentMonth.value === t.getMonth() + 1 && currentYear.value === t.getFullYear()
}

function holidayName(day) {
  if (!day) return null
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  const h = holidays.value.find(h => h.date === dateStr)
  return h ? h.name : null
}

// ── 班別編輯 ──────────────────────────────────────────────────────────────────
const editShiftDialog = ref(false)
const editShiftForm   = ref({ id: null, name: '', start_time: '', end_time: '', color: '#3b82f6', break_minutes: 0 })

function openEditShift(shift) {
  editShiftForm.value = { id: shift.id, name: shift.name, start_time: shift.start_time, end_time: shift.end_time, color: shift.color, break_minutes: shift.break_minutes ?? 0 }
  editShiftDialog.value = true
}

async function submitEditShift() {
  if (!editShiftForm.value.name.trim()) { ElMessage.warning('請填寫班別名稱'); return }
  try {
    const updated = await updateShift(editShiftForm.value.id, {
      name: editShiftForm.value.name,
      start_time: editShiftForm.value.start_time,
      end_time: editShiftForm.value.end_time,
      color: editShiftForm.value.color,
      break_minutes: editShiftForm.value.break_minutes,
    })
    const idx = shifts.value.findIndex(s => s.id === updated.id)
    if (idx !== -1) shifts.value[idx] = updated
    await loadSchedules()
    editShiftDialog.value = false
    ElMessage.success('班別已更新')
  } catch (e) { ElMessage.error(e?.response?.data?.detail || '更新失敗') }
}

// ── 班別 CRUD ─────────────────────────────────────────────────────────────────
async function submitShift() {
  if (!shiftForm.value.name.trim()) { ElMessage.warning('請填寫班別名稱'); return }
  try {
    const s = await createShift(shiftForm.value)
    shifts.value.push(s)
    shiftDialog.value = false
    ElMessage.success('班別已新增')
  } catch { ElMessage.error('新增失敗') }
}

async function confirmDeleteShift(shift) {
  try {
    await ElMessageBox.confirm(`確定刪除「${shift.name}」？相關排班也會一併刪除。`, '刪除班別', {
      confirmButtonText: '確定刪除', cancelButtonText: '取消', type: 'warning',
    })
    await deleteShift(shift.id)
    shifts.value = shifts.value.filter(s => s.id !== shift.id)
    schedules.value = schedules.value.filter(s => s.shift_id !== shift.id)
    ElMessage.success('班別已刪除')
  } catch (e) { if (e !== 'cancel') ElMessage.error('刪除失敗') }
}

// ── 排班 CRUD ─────────────────────────────────────────────────────────────────
function openAssign(day) {
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  assignForm.value = { employee_id: null, shift_id: null, work_date: dateStr, note: '', is_overtime: false }
  assignDialog.value = true
}

async function submitAssign() {
  if (!assignForm.value.employee_id || !assignForm.value.shift_id) {
    ElMessage.warning('請選擇員工和班別'); return
  }
  try {
    const s = await createSchedule(assignForm.value)
    schedules.value.push(s)
    assignDialog.value = false
    ElMessage.success('排班已建立')
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '排班失敗')
  }
}

// ── Badge 操作 ────────────────────────────────────────────────────────────────
const badgeMenuVisible = ref(false)
const badgeMenuTarget  = ref(null)

function openBadgeMenu(s, event) {
  badgeMenuTarget.value  = s
  badgeMenuVisible.value = true
}

async function removeSchedule(s) {
  try {
    await deleteSchedule(s.id)
    schedules.value = schedules.value.filter(x => x.id !== s.id)
    ElMessage.success('已移除')
  } catch { ElMessage.error('移除失敗') }
}

async function handleBadgeRemove() {
  if (!badgeMenuTarget.value) return
  badgeMenuVisible.value = false
  await removeSchedule(badgeMenuTarget.value)
}

async function handleBadgeToggleOT() {
  if (!badgeMenuTarget.value) return
  try {
    const updated = await toggleScheduleOT(badgeMenuTarget.value.id)
    const idx = schedules.value.findIndex(x => x.id === updated.id)
    if (idx !== -1) schedules.value[idx] = updated
    ElMessage.success(updated.is_overtime ? '已設為加班日' : '已取消加班')
  } catch { ElMessage.error('操作失敗') }
  badgeMenuVisible.value = false
}

const exporting = ref(false)

async function handleExport(type) {
  exporting.value = true
  try {
    const y = currentYear.value
    const m = currentMonth.value
    const pad = String(m).padStart(2, '0')
    let blob, filename
    if (type === 'pdf') {
      blob     = await exportSchedulePdf(y, m)
      filename = `班表_${y}${pad}.pdf`
    } else if (type === 'pdf-list') {
      blob     = await exportSchedulePdfList(y, m)
      filename = `班表列表_${y}${pad}.pdf`
    } else {
      blob     = await exportSchedule(y, m)
      filename = `班表_${y}${pad}.xlsx`
    }
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  } catch { ElMessage.error('匯出失敗') }
  finally { exporting.value = false }
}

const WEEKDAYS = ['日','一','二','三','四','五','六']
</script>

<template>
  <div class="schedule-page">

    <!-- ── 標題列 ── -->
    <div class="page-header">
      <h2 class="page-title">排班管理</h2>
      <div class="header-actions">
        <el-dropdown @command="handleExport" :disabled="exporting" trigger="click">
          <button class="export-btn" :disabled="exporting">
            <el-icon><Download /></el-icon>
            {{ exporting ? '匯出中...' : '匯出班表' }}
            <el-icon style="margin-left:2px;font-size:12px"><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="xlsx">
                <el-icon><Grid /></el-icon> Excel（.xlsx）
              </el-dropdown-item>
              <el-dropdown-item command="pdf">
                <el-icon><Document /></el-icon> PDF 日曆版
              </el-dropdown-item>
              <el-dropdown-item command="pdf-list">
                <el-icon><List /></el-icon> PDF 列表版
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <button
          class="add-shift-btn"
          @click="shifts.length < 5 && (shiftDialog = true)"
          :disabled="shifts.length >= 5"
          :title="shifts.length >= 5 ? '班別已達上限（5個）' : ''"
        >
          <el-icon><Plus /></el-icon> 新增班別
          <span class="shift-count">{{ shifts.length }}/5</span>
        </button>
      </div>
    </div>

    <!-- ── 班別標籤 ── -->
    <div class="shift-tags">
      <div v-for="s in shifts" :key="s.id" class="shift-tag">
        <span class="shift-dot" :style="{ background: s.color }"></span>
        <span class="shift-label">{{ s.name }}（{{ s.start_time }}–{{ s.end_time }}{{ s.break_minutes ? ` 休${s.break_minutes}min` : '' }}）</span>
        <button class="shift-tag-edit" @click="openEditShift(s)" title="編輯">
          <el-icon><Edit /></el-icon>
        </button>
        <button class="shift-del" @click="confirmDeleteShift(s)" title="刪除">×</button>
      </div>
      <span v-if="!shifts.length" class="no-shift">尚無班別，請先新增</span>
    </div>

    <!-- ── 搜尋列 ── -->
    <div class="filter-bar">
      <el-select
        v-model="filterEmployee"
        placeholder="篩選員工"
        clearable
        class="filter-select"
      >
        <el-option
          v-for="e in employees" :key="e.id"
          :label="e.display_name" :value="e.id"
        />
      </el-select>
      <el-select
        v-model="filterShift"
        placeholder="篩選班別"
        clearable
        class="filter-select"
      >
        <el-option
          v-for="s in shifts" :key="s.id"
          :label="`${s.name}（${s.start_time}–${s.end_time}）`" :value="s.id"
        />
      </el-select>
      <el-button v-if="filterEmployee || filterShift" @click="clearFilter" size="small">
        清除篩選
      </el-button>
      <span v-if="filterEmployee || filterShift" class="filter-hint">
        篩選中：僅顯示符合條件的排班
      </span>
    </div>

    <!-- ── 月份導覽 ── -->
    <div class="cal-nav">
      <button class="nav-btn" @click="changeMonth(-1)">‹</button>
      <span class="cal-title">{{ currentYear }} 年 {{ currentMonth }} 月</span>
      <button class="nav-btn" @click="changeMonth(1)">›</button>
    </div>

    <!-- ── 月曆 ── -->
    <div class="calendar" v-loading="loading" element-loading-background="transparent">
      <!-- 星期標頭 -->
      <div class="cal-head">
        <div v-for="w in WEEKDAYS" :key="w" class="cal-weekday" :class="{ weekend: w==='日'||w==='六' }">{{ w }}</div>
      </div>
      <!-- 日期格子 -->
      <div class="cal-grid">
        <div
          v-for="(day, i) in calendarDays" :key="i"
          class="cal-cell"
          :class="{ empty: !day, today: isToday(day), holiday: !!holidayName(day) }"
          @click="day && shifts.length && openAssign(day)"
        >
          <template v-if="day">
            <div class="cell-date">
              {{ day }}
              <span v-if="holidayName(day)" class="holiday-label">{{ holidayName(day) }}</span>
            </div>
            <div class="cell-schedules">
              <div
                v-for="s in schedulesForDay(day)"
                :key="s.id"
                class="cell-badge"
                :style="{ background: s.shift_color }"
                :class="{ 'badge-overtime': s.is_overtime }"
                @click.stop="openBadgeMenu(s, $event)"
                :title="`${s.employee_name}・${s.shift_name}${s.is_overtime ? '・加班' : ''}（點擊操作）`"
              >
                {{ s.employee_name }}<span v-if="s.is_overtime" class="ot-mark">OT</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ── 班別設定 Dialog ── -->
    <el-dialog v-model="shiftDialog" :title="`班別設定（${shifts.length}/5）`" width="360px" align-center>
      <div class="shift-list" v-if="shifts.length">
        <div v-for="s in shifts" :key="s.id" class="shift-row">
          <span class="shift-dot" :style="{ background: s.color }"></span>
          <span style="flex:1;font-weight:600">{{ s.name }}</span>
          <span style="color:var(--text-muted);font-size:13px">{{ s.start_time }} – {{ s.end_time }}</span>
        </div>
      </div>
      <el-divider v-if="shifts.length" />
      <el-form :model="shiftForm" label-position="top">
        <el-form-item label="班別名稱">
          <el-input v-model="shiftForm.name" placeholder="例：早班" />
        </el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item label="上班時間" style="flex:1">
            <el-input v-model="shiftForm.start_time" type="time" />
          </el-form-item>
          <el-form-item label="下班時間" style="flex:1">
            <el-input v-model="shiftForm.end_time" type="time" />
          </el-form-item>
        </div>
        <el-form-item label="休息時間 (分鐘)">
          <el-input-number v-model="shiftForm.break_minutes" :min="0" :max="120" :step="5" style="width:150px" />
          <span style="margin-left:8px;font-size:12px;color:var(--text-muted)">薪資計算時自動扣除</span>
        </el-form-item>
        <el-form-item label="顏色">
          <div class="color-row">
            <div
              v-for="c in shiftColors" :key="c"
              class="color-dot"
              :style="{ background: c }"
              :class="{ selected: shiftForm.color === c }"
              @click="shiftForm.color = c"
            ></div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shiftDialog = false">關閉</el-button>
        <el-button type="primary" @click="submitShift" :disabled="shifts.length >= 5">
          {{ shifts.length >= 5 ? '已達上限' : '新增班別' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ── 編輯班別 Dialog ── -->
    <el-dialog v-model="editShiftDialog" title="編輯班別" width="360px" align-center>
      <el-form :model="editShiftForm" label-position="top">
        <el-form-item label="班別名稱">
          <el-input v-model="editShiftForm.name" placeholder="例：早班" />
        </el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item label="上班時間" style="flex:1">
            <el-input v-model="editShiftForm.start_time" type="time" />
          </el-form-item>
          <el-form-item label="下班時間" style="flex:1">
            <el-input v-model="editShiftForm.end_time" type="time" />
          </el-form-item>
        </div>
        <el-form-item label="休息時間 (分鐘)">
          <el-input-number v-model="editShiftForm.break_minutes" :min="0" :max="120" :step="5" style="width:150px" />
          <span style="margin-left:8px;font-size:12px;color:var(--text-muted)">薪資計算時自動扣除</span>
        </el-form-item>
        <el-form-item label="顏色">
          <div class="color-row">
            <div
              v-for="c in shiftColors" :key="c"
              class="color-dot"
              :style="{ background: c }"
              :class="{ selected: editShiftForm.color === c }"
              @click="editShiftForm.color = c"
            ></div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editShiftDialog = false">取消</el-button>
        <el-button type="primary" @click="submitEditShift">儲存</el-button>
      </template>
    </el-dialog>

    <!-- ── Badge 操作 Dialog ── -->
    <el-dialog v-model="badgeMenuVisible" title="排班操作" width="420px" align-center>
      <div v-if="badgeMenuTarget" class="badge-menu-info">
        <span class="bm-dot" :style="{ background: badgeMenuTarget.shift_color }"></span>
        <span class="bm-name">{{ badgeMenuTarget.employee_name }}</span>
        <span class="bm-shift">{{ badgeMenuTarget.shift_name }}</span>
        <el-tag v-if="badgeMenuTarget.is_overtime" type="warning" size="small" effect="plain">加班</el-tag>
      </div>
      <template #footer>
        <el-button
          :type="badgeMenuTarget?.is_overtime ? 'default' : 'warning'"
          @click="handleBadgeToggleOT"
        >
          {{ badgeMenuTarget?.is_overtime ? '取消加班' : '設為加班日' }}
        </el-button>
        <el-button type="danger" plain @click="handleBadgeRemove">移除排班</el-button>
      </template>
    </el-dialog>

    <!-- ── 指派排班 Dialog ── -->
    <el-dialog v-model="assignDialog" :title="`排班 — ${assignForm.work_date}`" width="320px" align-center>
      <el-form :model="assignForm" label-position="top">
        <el-form-item label="員工">
          <el-select v-model="assignForm.employee_id" placeholder="選擇員工" style="width:100%">
            <el-option v-for="e in employees" :key="e.id" :label="e.display_name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="班別">
          <el-select v-model="assignForm.shift_id" placeholder="選擇班別" style="width:100%">
            <el-option v-for="s in shifts" :key="s.id" :label="`${s.name}（${s.start_time}–${s.end_time}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="加班">
          <el-switch
            v-model="assignForm.is_overtime"
            active-text="是"
            inactive-text="否"
            style="--el-switch-on-color: #f59e0b"
          />
          <span style="margin-left:10px;font-size:13px;color:var(--text-muted)">
            開啟後，當日全部工時依加班倍率計薪
          </span>
        </el-form-item>
        <el-form-item label="備註（選填）">
          <el-input v-model="assignForm.note" placeholder="備註" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAssign">確認排班</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.schedule-page {
  flex: 1;
  background: var(--bg-app);
  padding: 28px 32px;
  box-sizing: border-box;
  overflow-y: auto;
  transition: background .2s;
}

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

/* ── 班別標籤 ── */
.header-actions { display: flex; gap: 10px; align-items: center; }

.export-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: #10b981; color: #fff;
  border: none; border-radius: 10px;
  padding: 9px 18px; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: background .15s, transform .1s, box-shadow .15s;
  box-shadow: 0 2px 8px rgba(16,185,129,0.35);
}
.export-btn:hover:not(:disabled) { background: #059669; box-shadow: 0 4px 14px rgba(16,185,129,0.45); transform: translateY(-1px); }
.export-btn:active:not(:disabled) { transform: translateY(0); }
.export-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.add-shift-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: #3b82f6; color: #fff;
  border: none; border-radius: 10px;
  padding: 9px 18px; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: background .15s, transform .1s, box-shadow .15s;
  box-shadow: 0 2px 8px rgba(59,130,246,0.35);
}
.add-shift-btn:hover:not(:disabled) { background: #2563eb; box-shadow: 0 4px 14px rgba(59,130,246,0.45); transform: translateY(-1px); }
.add-shift-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 6px rgba(59,130,246,0.3); }
.add-shift-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
.shift-count {
  font-size: 16px; font-weight: 700; opacity: 0.8;
  background: rgba(255,255,255,0.2); border-radius: 8px; padding: 1px 6px;
}

.shift-tags {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-bottom: 20px;
}
.shift-tag {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 20px; padding: 4px 10px 4px 8px;
  font-size: 16px; transition: background .2s;
}
.shift-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.shift-label { color: var(--text-primary); }
.shift-del {
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); font-size: 16px; line-height: 1; padding: 0 0 0 4px;
}
.shift-del:hover { color: #ef4444; }
.no-shift { font-size: 16px; color: var(--text-muted); }

/* ── 月份導覽 ── */
.cal-nav {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 12px;
}
.cal-title { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.nav-btn {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 8px; width: 32px; height: 32px;
  font-size: 18px; cursor: pointer; color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.nav-btn:hover { background: var(--bg-inner); }

/* ── 月曆 ── */
.calendar {
  background: var(--bg-card); border-radius: 14px;
  border: 1px solid var(--border-color);
  overflow: hidden; transition: background .2s;
}
.cal-head {
  display: grid; grid-template-columns: repeat(7, 1fr);
  background: #1e293b;
  border-bottom: 1px solid #000;
}
:root.dark .cal-head {
  background: #0f172a;
}
.cal-weekday {
  text-align: center; padding: 10px 0;
  font-size: 16px; font-weight: 600; color: #f8fafc;
}
.cal-weekday.weekend { color: #f87171; }

.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
}
.cal-cell {
  min-height: 110px;
  border-right: 1px solid #000;
  border-bottom: 1px solid #000;
  padding: 6px;
  cursor: pointer;
  transition: background .15s;
  vertical-align: top;
}
.cal-cell:nth-child(7n) { border-right: none; }
.cal-cell:hover:not(.empty) { background: var(--bg-inner); }
.cal-cell.empty { cursor: default; background: transparent; }
.cal-cell.today .cell-date {
  background: #3b82f6; color: #fff;
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}

.cal-cell.holiday { background: rgba(239, 68, 68, 0.06); }
.cal-cell.holiday .cell-date { color: #ef4444; }

.cell-date {
  font-size: 16px; font-weight: 600; color: var(--text-secondary);
  display: flex; align-items: center; gap: 5px;
  height: 24px;
  margin-bottom: 4px;
}
.holiday-label {
  font-size: 11px; font-weight: 500;
  color: #ef4444;
  white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
  max-width: 80px;
}
.cell-schedules {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3px;
}
.cell-badge {
  font-size: 16px; color: #fff; font-weight: 600;
  padding: 3px 7px; border-radius: 4px;
  cursor: pointer; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
  transition: opacity .15s;
}
.cell-badge:hover { opacity: 0.75; }
.badge-overtime { outline: 2px solid #f59e0b; outline-offset: -2px; }
.badge-menu-info {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 0; flex-wrap: wrap;
}
.bm-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.bm-name { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.bm-shift { font-size: 15px; color: var(--text-muted); }
.ot-mark {
  display: inline-block; margin-left: 3px;
  font-size: 9px; font-weight: 800; line-height: 1;
  background: #f59e0b; color: #fff;
  border-radius: 3px; padding: 1px 3px;
  vertical-align: middle;
}

/* ── 班別設定 Dialog ── */
.shift-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
.shift-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; font-size: 16px; color: var(--text-primary);
}

.color-row { display: flex; gap: 8px; flex-wrap: wrap; }

.shift-list {
  display: flex; flex-direction: column; gap: 6px;
  margin-bottom: 4px;
}
.shift-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 8px;
  background: var(--bg-inner);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 16px;
}
.shift-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.shift-tag-edit {
  background: transparent; border: none;
  color: var(--text-muted); font-size: 16px;
  cursor: pointer; padding: 0 2px; line-height: 1;
  display: flex; align-items: center;
  transition: color .15s;
  flex-shrink: 0;
}
.shift-tag-edit:hover { color: #3b82f6; }
.color-dot {
  width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
  transition: transform .15s, box-shadow .15s;
  border: 2px solid transparent;
}
.color-dot.selected { transform: scale(1.2); box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor; }
.color-dot:hover { transform: scale(1.15); }

/* ── 搜尋列 ── */
.filter-bar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px;
  margin-bottom: 16px;
}
.filter-select { width: 180px; }
.filter-hint {
  font-size: 16px; color: var(--text-muted);
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 20px; padding: 3px 10px;
}

/* ── RWD ── */
@media (max-width: 768px) {
  .schedule-page { padding: 16px 12px 100px; }
  .page-title { font-size: 17px; }
  .page-header { flex-wrap: wrap; gap: 8px; }
  .filter-select { width: 140px; }
  .header-actions { flex-wrap: wrap; gap: 8px; }
  .export-btn, .add-shift-btn { padding: 7px 12px; font-size: 16px; }
  .calendar { overflow-x: auto; }
  .cal-head, .cal-grid { min-width: 420px; }
  .cal-cell { min-height: 64px; padding: 4px; }
  .cell-date { font-size: 16px; }
  .cell-schedules { grid-template-columns: 1fr; }
  .cell-badge { font-size: 10px; padding: 1px 4px; }
  .cal-nav { gap: 10px; }
  .cal-title { font-size: 16px; }
}

@media (max-width: 375px) {
  .schedule-page { padding: 12px 8px 100px; }
  .export-btn, .add-shift-btn { padding: 6px 10px; font-size: 16px; }
  .shift-tag { font-size: 16px; padding: 3px 8px 3px 6px; }
}
</style>
