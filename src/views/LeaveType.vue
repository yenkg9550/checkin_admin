<template>
  <div class="leave-type-page">
    <h2 class="page-title">假別設定</h2>

    <el-tabs v-model="activeTab" class="leave-tabs">

      <!-- ── Tab 1：假別管理 ── -->
      <el-tab-pane label="假別管理" name="types">
        <div class="toolbar">
          <el-button type="primary" @click="openAdd">新增假別</el-button>
          <el-button :loading="importingLaw" @click="importLawLeaves">匯入勞基法假別</el-button>
        </div>

        <div class="card-list" v-loading="loading">
          <div v-for="lt in leaveTypes" :key="lt.id" class="leave-card">
            <div class="leave-left">
              <span class="leave-dot" :style="{ background: lt.color }"></span>
              <div class="leave-info">
                <span class="leave-name">{{ lt.name }}</span>
                <span class="leave-desc">{{ lt.is_paid ? '有薪' : '無薪' }}・{{ lt.max_days == null ? '依年資（勞基法）' : `每年上限 ${lt.max_days} 天` }}</span>
              </div>
            </div>
            <div class="leave-actions">
              <el-button size="small" type="primary" :icon="EditIcon" class="hide-text-mobile" @click="openEdit(lt)"><span class="btn-text">編輯</span></el-button>
              <el-button size="small" type="danger" :icon="DeleteIcon" class="hide-text-mobile" @click="remove(lt.id)"><span class="btn-text">刪除</span></el-button>
            </div>
          </div>
          <div v-if="!loading && !leaveTypes.length" class="empty">
            <el-icon size="32" color="var(--text-muted)"><Tickets /></el-icon>
            <p>尚未設定假別</p>
          </div>
        </div>
      </el-tab-pane>

      <!-- ── Tab 2：個別員工設定 ── -->
      <el-tab-pane label="個別員工設定" name="employee">
        <div class="emp-filter">
          <el-select
            v-model="selectedEmpId"
            placeholder="選擇員工"
            filterable
            clearable
            style="width:220px"
            @change="onEmpChange"
          >
            <el-option v-for="e in employees" :key="e.id" :label="e.display_name" :value="e.id" />
          </el-select>
          <el-button
            v-if="selectedEmpId && empPosition"
            size="small" type="primary"
            @click="applyPositionLeaves"
          >套用職位「{{ empPosition.name }}」預設假別</el-button>
        </div>

        <div v-if="!selectedEmpId" class="empty">請先選擇員工</div>

        <template v-else>
          <div class="lt-grid-emp" v-loading="loadingEmpLt">
            <div
              v-for="lt in leaveTypes" :key="lt.id"
              class="lt-chip-emp"
              :class="{ active: empLtSelected.includes(lt.id) }"
              @click="toggleEmpLt(lt.id)"
            >
              <span class="chip-dot-emp" :style="{ background: lt.color }"></span>
              <span class="chip-name">{{ lt.name }}</span>
              <span class="lt-meta-emp">{{ lt.is_paid ? '有薪' : '無薪' }}{{ lt.max_days == null ? ' · 依年資' : ` · ${lt.max_days}天` }}</span>
              <span v-if="empLtSelected.includes(lt.id)" class="chip-check-emp">✓</span>
            </div>
            <div v-if="!leaveTypes.length" class="empty">請先在「假別管理」新增假別</div>
          </div>

          <div class="emp-lt-actions">
            <el-button type="primary" :loading="savingEmpLt" @click="submitEmpLeave">儲存設定</el-button>
          </div>
        </template>
      </el-tab-pane>

      <!-- ── Tab 3：特別假日設定 ── -->
      <el-tab-pane label="特別假日設定" name="holidays">
        <div class="toolbar">
          <el-date-picker
            v-model="holidayMonth"
            type="month"
            placeholder="選擇月份"
            format="YYYY/MM"
            value-format="YYYY-MM"
            style="width:160px"
            @change="loadHolidays"
          />
          <el-button type="primary" @click="addHolidayDialog = true">新增特別假日</el-button>
          <el-button :loading="importing === 'month'" @click="doImportNational('month')">匯入當月特別假日</el-button>
          <el-button :loading="importing === 'year'"  @click="doImportNational('year')">匯入整年特別假日</el-button>
        </div>
        <div class="holiday-list">
          <div v-if="!holidays.length" class="holiday-empty">本月無特別假日</div>
          <div v-for="h in holidays" :key="h.id" class="holiday-row">
            <span class="holiday-date">{{ h.date }}</span>
            <span class="holiday-name">{{ h.name }}</span>
            <el-tag size="small" :type="h.type === 'national' ? 'danger' : 'info'" class="holiday-tag">
              {{ h.type === 'national' ? '國定' : '自訂' }}
            </el-tag>
            <el-button size="small" type="danger" :icon="DeleteIcon" @click="removeHoliday(h.id)"><span class="btn-text">刪除</span></el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- ── Tab 4：勞基法假別說明 ── -->
      <el-tab-pane label="勞基法假別說明" name="law">
        <div class="law-intro">以下為《勞動基準法》規定的法定假別，供參考。特休天數依年資計算，其餘假別依法給予。</div>
        <div class="law-table">
          <div class="law-row law-header">
            <span>假別</span>
            <span>天數 / 週數</span>
            <span>薪資</span>
            <span>說明</span>
          </div>
          <div class="law-row" v-for="lt in lawLeaves" :key="lt.name">
            <span class="law-name-cell">
              <span class="law-dot" :style="{ background: lt.color }"></span>{{ lt.name }}
            </span>
            <span class="law-days-cell">{{ lt.days }}</span>
            <span>
              <el-tag size="small" :type="lt.paid ? 'success' : 'warning'">{{ lt.paid ? '有薪' : '無薪' }}</el-tag>
            </span>
            <span class="law-note-cell">{{ lt.note }}</span>
          </div>
        </div>
        <div class="law-footer">依據《勞動基準法》第 38、43 條及相關規定</div>

        <!-- 特休年資對照 -->
        <div class="annual-title">特休年資對照表</div>
        <div class="law-table annual-table">
          <div class="law-row law-header">
            <span>年資</span>
            <span>特休天數</span>
          </div>
          <div class="law-row" v-for="r in annualLeaveTable" :key="r.label">
            <span>{{ r.label }}</span>
            <span class="law-days-cell">{{ r.days }}</span>
          </div>
        </div>
      </el-tab-pane>

    </el-tabs>

    <!-- 新增特別假日 Dialog -->
    <el-dialog v-model="addHolidayDialog" title="新增特別假日" width="360px" align-center>
      <el-form :model="holidayForm" label-width="80px" style="margin-top:4px">
        <el-form-item label="日期">
          <el-date-picker v-model="holidayForm.date" type="date" value-format="YYYY-MM-DD" style="width:180px" />
        </el-form-item>
        <el-form-item label="名稱">
          <el-input v-model="holidayForm.name" style="width:180px" />
        </el-form-item>
        <el-form-item label="類型">
          <el-select v-model="holidayForm.type" style="width:160px">
            <el-option label="國定特別假日" value="national" />
            <el-option label="自訂特別假日" value="custom" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addHolidayDialog = false">取消</el-button>
        <el-button type="primary" @click="submitHoliday">新增</el-button>
      </template>
    </el-dialog>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="editTarget ? '編輯假別' : '新增假別'" width="420px" class="leave-dialog">
      <el-form :model="form" label-width="110px" size="default">
        <el-form-item label="假別名稱">
          <el-input v-model="form.name" placeholder="例：特休、事假、病假" />
        </el-form-item>
        <el-form-item label="薪資類型">
          <el-radio-group v-model="form.is_paid">
            <el-radio :value="true">有薪假</el-radio>
            <el-radio :value="false">無薪假</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="每年上限 (天)">
          <div class="max-days-wrap">
            <el-radio-group v-model="form.max_days_mode" @change="onMaxDaysModeChange">
              <el-radio value="law">按照勞基法給予（依年資計算）</el-radio>
              <el-radio value="fixed">自行設定</el-radio>
            </el-radio-group>
            <el-input-number
              v-if="form.max_days_mode === 'fixed'"
              v-model="form.max_days_fixed"
              :min="0"
              :step="1"
              style="width:130px;margin-top:8px"
            />
          </div>
        </el-form-item>
        <el-form-item label="顏色">
          <div class="color-row">
            <div v-for="c in colors" :key="c" class="color-dot" :style="{ background: c }" :class="{ selected: form.color === c }" @click="form.color = c"></div>
          </div>
        </el-form-item>
        <el-form-item label="備註">
          <el-input v-model="form.note" type="textarea" :rows="2" placeholder="選填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit as EditIcon, Delete as DeleteIcon } from '@element-plus/icons-vue'
import {
  fetchLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveTypeApi,
  fetchEmployees, fetchPositions,
  fetchEmployeeLeaveTypes, setEmployeeLeaveTypes,
  fetchHolidays, createHoliday, deleteHoliday, importNationalHolidays,
} from '@/api/http.js'

const leaveTypes = ref([])
const employees  = ref([])
const positions  = ref([])

const lawLeaves = [
  { name: '特休',   days: '3–30 天', paid: true,  color: '#10b981', note: '依年資計算，見下方對照表' },
  { name: '事假',   days: '14 天',   paid: false, color: '#f59e0b', note: '無薪，每年上限 14 天' },
  { name: '病假',   days: '30 天',   paid: true,  color: '#3b82f6', note: '前30天半薪，後續無薪（需醫師證明）' },
  { name: '婚假',   days: '8 天',    paid: true,  color: '#ec4899', note: '有薪，結婚時一次使用' },
  { name: '喪假',   days: '3–8 天',  paid: true,  color: '#6b7280', note: '依親等：配偶/父母8天、祖父母3天等' },
  { name: '產假',   days: '8 週',    paid: true,  color: '#8b5cf6', note: '任職滿6個月全薪，未滿6個月半薪' },
  { name: '陪產假', days: '7 天',    paid: true,  color: '#06b6d4', note: '有薪，配偶分娩時使用' },
  { name: '公假',   days: '依實際',  paid: true,  color: '#84cc16', note: '有薪，含選舉、出庭、兵役召集等' },
]

const annualLeaveTable = [
  { label: '滿6個月未滿1年', days: '3 天' },
  { label: '滿1年未滿2年',   days: '7 天' },
  { label: '滿2年未滿3年',   days: '10 天' },
  { label: '滿3年未滿5年',   days: '14 天' },
  { label: '滿5年未滿10年',  days: '15 天' },
  { label: '滿10年以上',     days: '每滿1年加1天，最多30天' },
]
const colors = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#6b7280']

const activeTab     = ref('types')
const dialogVisible = ref(false)
const editTarget    = ref(null)
const saving        = ref(false)
const loading       = ref(false)

const DEFAULT_FORM = () => ({
  name: '', is_paid: true,
  max_days_mode: 'fixed',  // 'law' | 'fixed'
  max_days_fixed: 1,
  color: '#10b981', note: '',
})
const form = reactive(DEFAULT_FORM())

function onMaxDaysModeChange(val) {
  if (val === 'law') form.max_days_fixed = 0
}

// ── 個別員工假別 ─────────────────────────────────────────
const selectedEmpId  = ref(null)
const empLtSelected  = ref([])
const loadingEmpLt   = ref(false)
const savingEmpLt    = ref(false)

const empPosition = computed(() => {
  const emp = employees.value.find(e => e.id === selectedEmpId.value)
  if (!emp?.position_id) return null
  return positions.value.find(p => p.id === emp.position_id) ?? null
})

async function onEmpChange(id) {
  if (!id) { empLtSelected.value = []; return }
  loadingEmpLt.value = true
  try { empLtSelected.value = await fetchEmployeeLeaveTypes(id) }
  catch { empLtSelected.value = [] }
  finally { loadingEmpLt.value = false }
}

function toggleEmpLt(id) {
  const idx = empLtSelected.value.indexOf(id)
  if (idx >= 0) empLtSelected.value.splice(idx, 1)
  else empLtSelected.value.push(id)
}

function applyPositionLeaves() {
  if (!empPosition.value?.leave_type_ids?.length) return
  empLtSelected.value = [...new Set([...empLtSelected.value, ...empPosition.value.leave_type_ids])]
  ElMessage.success('已套用職位預設假別')
}

async function submitEmpLeave() {
  savingEmpLt.value = true
  try {
    await setEmployeeLeaveTypes(selectedEmpId.value, empLtSelected.value)
    ElMessage.success('假別已更新')
  } catch { ElMessage.error('更新失敗') }
  finally { savingEmpLt.value = false }
}

// ── 初始化 ───────────────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    ;[leaveTypes.value, employees.value, positions.value] = await Promise.all([
      fetchLeaveTypes(), fetchEmployees(), fetchPositions(),
    ])
    await loadHolidays()
  } catch { ElMessage.error('載入資料失敗') }
  finally { loading.value = false }
})

// ── 匯入勞基法假別 ───────────────────────────────────────
const LAW_LEAVE_PRESETS = [
  { name: '特休',   is_paid: true,  max_days: null, color: '#10b981', note: '' },
  { name: '事假',   is_paid: false, max_days: 14,   color: '#f59e0b', note: '每年上限14天，無薪' },
  { name: '病假',   is_paid: true,  max_days: 30,   color: '#3b82f6', note: '前30天半薪，需醫師證明' },
  { name: '婚假',   is_paid: true,  max_days: 8,    color: '#ec4899', note: '結婚時一次使用，有薪' },
  { name: '喪假',   is_paid: true,  max_days: 8,    color: '#6b7280', note: '依親等3–8天，有薪' },
  { name: '產假',   is_paid: true,  max_days: 56,   color: '#8b5cf6', note: '8週，任職滿6月全薪' },
  { name: '陪產假', is_paid: true,  max_days: 7,    color: '#06b6d4', note: '配偶分娩時，有薪' },
  { name: '公假',   is_paid: true,  max_days: 30,   color: '#84cc16', note: '依實際需要給予，有薪' },
]

const importingLaw = ref(false)

async function importLawLeaves() {
  const existing  = leaveTypes.value.map(lt => lt.name)
  const toCreate  = LAW_LEAVE_PRESETS.filter(p => !existing.includes(p.name))
  const allLawIds = leaveTypes.value.filter(lt => LAW_LEAVE_PRESETS.some(p => p.name === lt.name)).map(lt => lt.id)

  importingLaw.value = true
  try {
    // 建立尚不存在的假別
    for (const preset of toCreate) {
      const created = await createLeaveType(preset)
      leaveTypes.value.push(created)
      allLawIds.push(created.id)
    }

    if (toCreate.length === 0) {
      ElMessage.info('勞基法假別已全數存在')
    } else {
      ElMessage.success(`已匯入 ${toCreate.length} 筆勞基法假別`)
    }

    // 詢問是否套用給所有員工
    await ElMessageBox.confirm(
      '是否將勞基法假別套用給所有員工？',
      '套用假別',
      { confirmButtonText: '套用全部員工', cancelButtonText: '稍後手動設定', type: 'info' }
    )

    // 套用給所有員工（合併現有假別，不覆蓋）
    let count = 0
    for (const emp of employees.value) {
      try {
        const empExisting = await fetchEmployeeLeaveTypes(emp.id)
        const merged = [...new Set([...empExisting, ...allLawIds])]
        await setEmployeeLeaveTypes(emp.id, merged)
        count++
      } catch { /* 單筆失敗不中斷 */ }
    }
    ElMessage.success(`已套用給 ${count} 位員工`)

  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失敗')
  } finally {
    importingLaw.value = false
  }
}

// ── 假別 CRUD ────────────────────────────────────────────
function openAdd() {
  editTarget.value = null
  Object.assign(form, DEFAULT_FORM())
  dialogVisible.value = true
}

function openEdit(lt) {
  editTarget.value = lt
  Object.assign(form, {
    name:          lt.name,
    is_paid:       lt.is_paid,
    color:         lt.color,
    note:          lt.note ?? '',
    max_days_mode:  lt.max_days == null ? 'law' : 'fixed',
    max_days_fixed: lt.max_days ?? 0,
  })
  dialogVisible.value = true
}

function formPayload() {
  return {
    name:     form.name,
    is_paid:  form.is_paid,
    max_days: form.max_days_mode === 'law' ? null : form.max_days_fixed,
    color:    form.color,
    note:     form.note,
  }
}

async function submit() {
  if (!form.name.trim()) { ElMessage.warning('請填寫假別名稱'); return }
  saving.value = true
  try {
    if (editTarget.value) {
      const updated = await updateLeaveType(editTarget.value.id, formPayload())
      const idx = leaveTypes.value.findIndex(x => x.id === editTarget.value.id)
      if (idx !== -1) leaveTypes.value[idx] = updated
      ElMessage.success('假別已更新')
    } else {
      const created = await createLeaveType(formPayload())
      leaveTypes.value.push(created)
      ElMessage.success('假別已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '操作失敗')
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  await ElMessageBox.confirm('確定刪除此假別？', '確認', { type: 'warning' })
  try {
    await deleteLeaveTypeApi(id)
    leaveTypes.value = leaveTypes.value.filter(x => x.id !== id)
    ElMessage.success('已刪除')
  } catch { ElMessage.error('刪除失敗') }
}

// ── 特別假日 ─────────────────────────────────────────────
function todayYM() {
  const now = new Date(Date.now() + 8 * 3600000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

const holidayMonth     = ref(todayYM())
const holidays         = ref([])
const addHolidayDialog = ref(false)
const importing        = ref('')
const holidayForm      = reactive({ date: '', name: '', type: 'custom' })

async function loadHolidays() {
  const [y, m] = holidayMonth.value.split('-').map(Number)
  holidays.value = await fetchHolidays(y, m)
}

async function doImportNational(mode) {
  const [year, mon] = holidayMonth.value.split('-').map(Number)
  const month = mode === 'month' ? mon : null
  importing.value = mode
  try {
    const result = await importNationalHolidays(year, month)
    const label = mode === 'month' ? `${year}/${String(mon).padStart(2,'0')}` : `${year} 年`
    ElMessage.success(`${label} 已匯入：新增 ${result.added} 筆，略過 ${result.skipped} 筆`)
    await loadHolidays()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '匯入失敗')
  } finally { importing.value = '' }
}

async function submitHoliday() {
  if (!holidayForm.date || !holidayForm.name) return ElMessage.warning('請填寫日期與名稱')
  try {
    await createHoliday({ ...holidayForm })
    addHolidayDialog.value = false
    Object.assign(holidayForm, { date: '', name: '', type: 'custom' })
    await loadHolidays()
    ElMessage.success('特別假日已新增')
  } catch (e) { ElMessage.error(e.response?.data?.detail || '新增失敗') }
}

async function removeHoliday(id) {
  await deleteHoliday(id)
  holidays.value = holidays.value.filter(h => h.id !== id)
  ElMessage.success('已刪除')
}
</script>

<style scoped>
.leave-type-page {
  flex: 1;
  padding: 24px;
  background: var(--bg-app);
  transition: background .2s;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
}

.toolbar {
  margin-bottom: 16px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 600px;
}

.leave-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 14px 18px;
  transition: background .2s, border-color .2s;
}

.leave-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.leave-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.leave-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.leave-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
}

.leave-desc {
  font-size: 16px;
  color: var(--text-muted);
}

.leave-actions {
  display: flex;
  gap: 4px;
}

/* tabs */
.leave-tabs { margin-top: 4px; }
:deep(.el-tabs__item) { font-size: 16px; color: var(--text-muted); }
:deep(.el-tabs__item.is-active) { color: #3b82f6; }
:deep(.el-tabs__active-bar) { background: #3b82f6; }

/* 個別設定 */
.emp-filter { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 16px 0; }
.lt-grid-emp {
  display: flex; flex-direction: column; gap: 8px;
  max-width: 600px; max-height: 420px; overflow-y: auto;
  margin-bottom: 16px;
}
.lt-chip-emp {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-radius: 10px;
  font-size: 16px; font-weight: 600; cursor: pointer;
  border: 1.5px solid var(--border-color);
  color: var(--text-secondary); background: var(--bg-inner);
  transition: all .15s; user-select: none;
}
.lt-chip-emp:hover { border-color: #3b82f6; color: #3b82f6; }
.lt-chip-emp.active { background: rgba(59,130,246,0.1); border-color: #3b82f6; color: #3b82f6; }
.chip-dot-emp  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.chip-name     { flex: 1; }
.lt-meta-emp   { font-size: 14px; color: var(--text-muted); font-weight: 400; }
.chip-check-emp { font-size: 15px; color: #3b82f6; font-weight: 700; }
.emp-lt-actions { margin-top: 4px; }

/* 特別假日 */
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 16px 0; }
.holiday-list { display: flex; flex-direction: column; gap: 8px; max-width: 680px; }
.holiday-empty { color: var(--text-muted); font-size: 16px; padding: 24px 0; }
.holiday-row {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 10px 16px;
}
.holiday-date { font-size: 15px; color: var(--text-muted); white-space: nowrap; min-width: 100px; }
.holiday-name { flex: 1; font-weight: 600; color: var(--text-primary); font-size: 16px; min-width: 0; }
.holiday-tag  { flex-shrink: 0; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: var(--text-muted);
  font-size: 16px;
}

.max-days-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* color picker */
.color-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform .15s, box-shadow .15s;
}
.color-dot:hover { transform: scale(1.15); }
.color-dot.selected { transform: scale(1.2); box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 4px currentColor; }

/* ── 勞基法說明 ── */
.law-intro {
  font-size: 15px; color: var(--text-muted);
  margin: 12px 0 14px; max-width: 640px;
}
.law-table {
  display: flex; flex-direction: column;
  border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden;
  max-width: 700px; margin-bottom: 20px;
}
.law-row {
  display: grid; grid-template-columns: 80px 100px 70px 1fr;
  align-items: center; padding: 10px 14px;
  font-size: 16px; color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}
/* 年資對照表只有2欄，覆蓋 grid */
.annual-table .law-row {
  grid-template-columns: 180px 1fr;
}
.law-row:last-child { border-bottom: none; }
.law-header {
  background: var(--bg-inner); font-weight: 700; font-size: 15px; color: var(--text-muted);
}
.law-name-cell { display: flex; align-items: center; gap: 7px; font-weight: 600; color: var(--text-primary); }
.law-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.law-days-cell { font-weight: 600; color: var(--text-primary); }
.law-note-cell { color: var(--text-muted); font-size: 15px; }
.law-footer { font-size: 14px; color: var(--text-muted); text-align: right; max-width: 700px; margin-bottom: 24px; }
.annual-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; }

/* dialog */
:deep(.el-dialog) { background: var(--bg-card); border: 1px solid var(--border-color); }
:deep(.el-dialog__title) { color: var(--text-primary); }

@media (max-width: 768px) {
  :deep(.leave-dialog) {
    width: 92vw !important;
    max-height: 85dvh !important;
    display: flex !important;
    flex-direction: column !important;
  }
  :deep(.leave-dialog .el-dialog__body) {
    overflow-y: auto !important;
    flex: 1 !important;
  }
}
:deep(.el-form-item__label) { color: var(--text-primary); }
:deep(.el-radio__label)     { color: var(--text-primary); }
:deep(.el-input__wrapper) {
  background: var(--bg-inner) !important;
  box-shadow: 0 0 0 1px var(--border-color) !important;
}
:deep(.el-input__inner)    { color: var(--text-primary) !important; }
:deep(.el-textarea__inner) { background: var(--bg-inner) !important; color: var(--text-primary) !important; box-shadow: 0 0 0 1px var(--border-color) !important; }
</style>
