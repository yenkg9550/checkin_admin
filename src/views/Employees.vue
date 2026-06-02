<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  fetchEmployees, deleteEmployee, updateEmployeeHireDate,
  fetchPositions, setEmployeePosition,
  fetchLeaveBalance,
} from '@/api/http.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Tickets as TicketsIcon, Delete as DeleteIcon } from '@element-plus/icons-vue'

const employees  = ref([])
const positions  = ref([])
const loading    = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    [employees.value, positions.value] = await Promise.all([
      fetchEmployees(), fetchPositions(),
    ])
  } catch {
    ElMessage.error('載入資料失敗')
  } finally {
    loading.value = false
  }
})

async function loadEmployees() {
  loading.value = true
  try { employees.value = await fetchEmployees() }
  catch { ElMessage.error('載入員工列表失敗') }
  finally { loading.value = false }
}

// ── 職位指派 Dialog ───────────────────────────────────────
const posDialog        = ref(false)
const posEmployee      = ref(null)
const posSelectedId    = ref(null)
const posApplySalary   = ref(false)
const savingPos        = ref(false)

function openPosition(emp) {
  posEmployee.value    = emp
  posSelectedId.value  = emp.position_id ?? null
  posApplySalary.value = false
  posDialog.value      = true
}

async function submitPosition() {
  savingPos.value = true
  try {
    await setEmployeePosition(posEmployee.value.id, posSelectedId.value, posApplySalary.value)
    posEmployee.value.position_id = posSelectedId.value
    posDialog.value = false
    ElMessage.success('職位已更新')
  } catch { ElMessage.error('更新失敗') }
  finally { savingPos.value = false }
}

function posName(id) {
  return positions.value.find(p => p.id === id)?.name ?? '未指派'
}


// ── 特休天數（勞基法）────────────────────────────────────
function calcAnnualLeaveDays(hireDateStr) {
  if (!hireDateStr) return null
  const hire = new Date(hireDateStr)
  const years = (Date.now() - hire) / (1000 * 60 * 60 * 24 * 365.25)
  if (years < 0.5) return 0
  if (years < 1)   return 3
  if (years < 2)   return 7
  if (years < 3)   return 10
  if (years < 5)   return 14
  if (years < 10)  return 15
  return Math.min(15 + Math.floor(years - 10) + 1, 30)
}

function getServiceYears(hireDateStr) {
  if (!hireDateStr) return '—'
  const hire = new Date(hireDateStr)
  const today = new Date()
  const ms = today - hire
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25))
  const months = Math.floor((ms % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
  if (years === 0) return `${months} 個月`
  return months > 0 ? `${years} 年 ${months} 個月` : `${years} 年`
}

// ── 剩餘假別 Dialog ───────────────────────────────────────
const leaveDialog    = ref(false)
const leaveEmployee  = ref(null)
const leaveYear      = ref(new Date().getFullYear())
const leaveBalance   = ref([])
const loadingBalance = ref(false)

// 勞基法法定假別（依到職日計算）
const LAW_LEAVES = [
  { name: '事假',   max_days: 14,  paid: false, color: '#f59e0b', note: '每年上限 14 天' },
  { name: '病假',   max_days: 30,  paid: true,  color: '#3b82f6', note: '每年上限 30 天（前30天半薪）' },
  { name: '婚假',   max_days: 8,   paid: true,  color: '#ec4899', note: '結婚時一次使用' },
  { name: '喪假',   max_days: 8,   paid: true,  color: '#6b7280', note: '依親等 3–8 天' },
  { name: '產假',   max_days: 56,  paid: true,  color: '#8b5cf6', note: '8週（任職滿6月全薪）' },
  { name: '陪產假', max_days: 7,   paid: true,  color: '#06b6d4', note: '配偶分娩時使用' },
  { name: '公假',   max_days: 0,   paid: true,  color: '#84cc16', note: '依實際需要給予' },
]

const lawLeaveCards = computed(() => {
  const hire = leaveEmployee.value?.hire_date
  const annualDays = calcAnnualLeaveDays(hire)
  const cards = [
    {
      name: '特休',
      max_days: annualDays ?? 0,
      paid: true,
      color: '#10b981',
      note: hire ? `依年資，目前 ${annualDays} 天` : '需設定到職日',
      used_days: 0,
      remaining: annualDays ?? 0,
      noHire: !hire,
    },
    ...LAW_LEAVES.map(lt => ({ ...lt, used_days: 0, remaining: lt.max_days }))
  ]
  return cards
})

async function openLeave(emp) {
  leaveEmployee.value = emp
  leaveDialog.value   = true
  await loadBalance()
}

async function loadBalance() {
  if (!leaveEmployee.value) return
  loadingBalance.value = true
  try {
    leaveBalance.value = await fetchLeaveBalance(leaveEmployee.value.id, leaveYear.value)
  } catch { ElMessage.error('載入假別資料失敗') }
  finally { loadingBalance.value = false }
}

// ── 到職日設定 ────────────────────────────────────────────
const hireDateDialog  = ref(false)
const hireDateTarget  = ref(null)
const hireDateValue   = ref('')
const savingHireDate  = ref(false)

function openHireDate(emp) {
  hireDateTarget.value = emp
  hireDateValue.value  = emp.hire_date || ''
  hireDateDialog.value = true
}

async function submitHireDate() {
  savingHireDate.value = true
  try {
    await updateEmployeeHireDate(hireDateTarget.value.id, hireDateValue.value)
    hireDateTarget.value.hire_date = hireDateValue.value || null
    hireDateDialog.value = false
    ElMessage.success('到職日已更新')
  } catch {
    ElMessage.error('更新失敗')
  } finally {
    savingHireDate.value = false
  }
}

async function confirmDelete(emp) {
  try {
    await ElMessageBox.confirm(`確定要移除「${emp.display_name}」？此操作將同時清除其所有打卡記錄，且無法復原。`, '移除員工', {
      confirmButtonText: '確定移除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteEmployee(emp.id)
    employees.value = employees.value.filter(e => e.id !== emp.id)
    ElMessage.success('員工已移除')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('移除失敗')
  }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <div class="emp-page">
    <div class="page-header">
      <h2 class="page-title">員工列表</h2>
      <div class="emp-count" :class="{ full: employees.length >= 20 }">
        {{ employees.length }} / 20 人
        <span v-if="employees.length >= 20" class="full-tag">已達上限</span>
      </div>
    </div>

    <!-- 桌機表格 -->
    <div class="emp-table-wrap desktop-table" v-loading="loading" element-loading-background="transparent">
      <table class="emp-table">
        <thead>
          <tr>
            <th>員工</th>
            <th>職位</th>
            <th>到職日</th>
            <th>年資</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="emp in employees" :key="emp.id">
            <td>
              <div class="emp-info">
                <img v-if="emp.picture_url" :src="emp.picture_url" class="emp-avatar" referrerpolicy="no-referrer" />
                <div v-else class="emp-avatar-placeholder">{{ emp.display_name?.[0] ?? '?' }}</div>
                <span class="emp-name">{{ emp.display_name }}</span>
              </div>
            </td>
            <td>
              <span class="pos-cell" @click="openPosition(emp)">
                {{ emp.position_id ? posName(emp.position_id) : '未指派' }}
                <el-icon size="12" style="margin-left:4px;opacity:0.5"><Edit /></el-icon>
              </span>
            </td>
            <td>
              <span class="hire-date-cell" @click="openHireDate(emp)">
                {{ emp.hire_date ? formatDate(emp.hire_date) : '未設定' }}
                <el-icon size="12" style="margin-left:4px;opacity:0.5"><Edit /></el-icon>
              </span>
            </td>
            <td>{{ getServiceYears(emp.hire_date) }}</td>
            <td>
              <div class="action-btns">
                <el-button size="small" type="success" :icon="TicketsIcon" @click="openLeave(emp)">剩餘假別</el-button>
                <el-button size="small" type="danger" :icon="DeleteIcon" @click="confirmDelete(emp)">移除</el-button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && employees.length === 0">
            <td colspan="6" class="empty-row">尚無員工資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 手機卡片 -->
    <div class="mobile-cards" v-loading="loading" element-loading-background="transparent">
      <div v-if="!loading && employees.length === 0" class="empty-row">尚無員工資料</div>
      <div v-for="emp in employees" :key="emp.id" class="emp-card">
        <div class="card-left">
          <img v-if="emp.picture_url" :src="emp.picture_url" class="emp-avatar" referrerpolicy="no-referrer" />
          <div v-else class="emp-avatar-placeholder">{{ emp.display_name?.[0] ?? '?' }}</div>
          <div class="card-info">
            <div class="emp-name">{{ emp.display_name }}</div>
            <div class="card-date">
              到職：{{ emp.hire_date ? formatDate(emp.hire_date) : '未設定' }}
              ・特休 {{ emp.hire_date ? calcAnnualLeaveDays(emp.hire_date) + '天' : '—' }}
            </div>
          </div>
        </div>
        <div class="card-actions">
          <el-button circle type="success" :icon="TicketsIcon" @click="openLeave(emp)" title="假別" />
          <el-button circle type="danger" :icon="DeleteIcon" @click="confirmDelete(emp)" title="移除" />
        </div>
      </div>
    </div>
  </div>

  <!-- 剩餘假別 Dialog -->
  <el-dialog
    v-model="leaveDialog"
    :title="`${leaveEmployee?.display_name} — 剩餘假別`"
    width="560px"
    class="leave-balance-dialog"
  >
    <div v-if="leaveEmployee" class="lb-wrap">
      <div v-loading="loadingBalance" class="lb-cards">
        <div v-if="!loadingBalance && !leaveBalance.length" class="lb-empty">
          此員工尚未分配假別，請至「假別設定」頁面設定
        </div>
        <div v-for="b in leaveBalance" :key="b.leave_type_id" class="lb-card">
          <div class="lb-card-left">
            <span class="lb-dot" :style="{ background: b.color }"></span>
            <div class="lb-info">
              <span class="lb-name">{{ b.name }}</span>
              <span class="lb-sub">{{ b.is_paid ? '有薪' : '無薪' }}</span>
            </div>
          </div>
          <div class="lb-card-right">
            <template v-if="b.max_days != null && b.max_days > 0">
              <div class="lb-bar-wrap">
                <div class="lb-bar" :style="{ width: Math.min(b.used_days / b.max_days * 100, 100) + '%', background: b.color }"></div>
              </div>
              <span class="lb-nums">剩 <strong>{{ Math.max(b.remaining, 0).toFixed(1) }}</strong> / {{ b.max_days }} 天</span>
            </template>
            <template v-else-if="b.max_days === 0">
              <span class="lb-nums">0 天</span>
            </template>
            <template v-else>
              <!-- null = 依年資（勞基法） -->
              <span class="lb-nums">剩 <strong>{{ Math.max(b.remaining, 0).toFixed(1) }}</strong> 天（依年資）</span>
            </template>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="leaveDialog = false">關閉</el-button>
    </template>
  </el-dialog>

  <!-- 職位指派 Dialog -->
  <el-dialog v-model="posDialog" :title="`職位指派 — ${posEmployee?.display_name}`" width="380px" align-center>
    <el-form label-width="100px" style="margin-top:4px">
      <el-form-item label="指派職位">
        <el-select v-model="posSelectedId" placeholder="不指派" clearable style="width:200px">
          <el-option v-for="p in positions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="套用薪資">
        <el-checkbox v-model="posApplySalary">同時套用職位薪資預設值</el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="posDialog = false">取消</el-button>
      <el-button type="primary" :loading="savingPos" @click="submitPosition">確認</el-button>
    </template>
  </el-dialog>

  <!-- 到職日設定 Dialog -->
  <el-dialog v-model="hireDateDialog" :title="`設定到職日 — ${hireDateTarget?.display_name}`" width="340px" align-center>
    <el-form label-width="80px" style="margin-top:4px">
      <el-form-item label="到職日">
        <el-date-picker
          v-model="hireDateValue"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="選擇到職日"
          style="width:200px"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="hireDateDialog = false">取消</el-button>
      <el-button type="primary" :loading="savingHireDate" @click="submitHireDate">確認</el-button>
    </template>
  </el-dialog>

</template>

<style scoped>
.emp-page {
  flex: 1;
  background: var(--bg-app);
  padding: 28px 32px;
  box-sizing: border-box;
  transition: background .2s;
}
.page-header {
  margin-bottom: 20px;
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; transition: color .2s; }

.emp-count {
  font-size: 16px; font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-inner);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 3px 12px;
  display: flex; align-items: center; gap: 6px;
  transition: background .2s, border-color .2s;
}
.emp-count.full { color: #ef4444; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.06); }
.full-tag { font-size: 16px; background: #ef4444; color: #fff; border-radius: 10px; padding: 1px 7px; }

/* ── 桌機表格 ── */
.desktop-table {
  background: var(--bg-card); border-radius: 12px;
  overflow: hidden; border: 1px solid var(--border-color); min-height: 200px;
  transition: background .2s, border-color .2s;
}
.emp-table { width: 100%; border-collapse: collapse; font-size: 16px; }
.emp-table thead tr { background: var(--bg-inner); }
.emp-table th {
  padding: 14px 16px; text-align: left; color: var(--text-muted);
  font-weight: 700; font-size: 16px; letter-spacing: .03em;
  border-bottom: 1px solid var(--border-color);
}
.emp-table tbody tr { border-bottom: 1px solid var(--divider); transition: background .15s; }
.emp-table tbody tr:last-child { border-bottom: none; }
.emp-table tbody tr:hover { background: var(--bg-inner); }
.emp-table td { padding: 14px 16px; color: var(--text-secondary); vertical-align: middle; font-size: 16px; white-space: nowrap; }

.emp-info { display: flex; align-items: center; gap: 10px; }
.emp-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.emp-avatar-placeholder {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg,#3b82f6,#1d4ed8);
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.emp-name { font-weight: 600; color: var(--text-primary); }
.empty-row { text-align: center; color: #475569; padding: 40px; }
.text-muted { color: var(--text-muted); }

.hire-date-cell {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 16px;
  transition: color .15s;
}
.hire-date-cell:hover { color: #3b82f6; }

.pos-cell {
  cursor: pointer; display: inline-flex; align-items: center;
  color: var(--text-secondary); font-size: 16px; transition: color .15s;
}
.pos-cell:hover { color: #3b82f6; }

.annual-days { font-weight: 600; color: #10b981; }


/* ── 手機卡片 ── */
.mobile-cards { display: none; flex-direction: column; gap: 10px; }
.emp-card {
  background: var(--bg-card); border-radius: 12px;
  padding: 12px 14px; display: flex;
  align-items: center; justify-content: space-between;
  border: 1px solid var(--border-color);
  transition: background .2s, border-color .2s;
  gap: 8px;
}
.card-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.card-info { min-width: 0; }
.card-date { font-size: 16px; color: var(--text-muted); margin-top: 2px; }

.card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

/* ── RWD ── */
@media (max-width: 768px) {
  .emp-page { padding: 20px 14px 100px; }
  .page-title { font-size: 17px; }
  .desktop-table { display: none; }
  .mobile-cards { display: flex; }
}

.action-btns { display: flex; gap: 6px; flex-wrap: nowrap; align-items: center; }

.leave-btn {
  background: #10b981; border: none; color: #fff;
  border-radius: 8px; padding: 10px 20px; font-size: 16px; font-weight: 600; cursor: pointer;
  transition: background .15s, transform .1s;
}
.leave-btn:hover { background: #059669; transform: translateY(-1px); }

.override-btn {
  background: #3b82f6; border: none; color: #fff;
  border-radius: 8px; padding: 10px 20px; font-size: 16px; font-weight: 600; cursor: pointer;
  transition: background .15s, transform .1s;
}
.override-btn:hover { background: #2563eb; transform: translateY(-1px); }

.del-btn {
  background: #ef4444; border: none; color: #fff;
  border-radius: 8px; padding: 10px 20px; font-size: 16px; font-weight: 600; cursor: pointer;
  transition: background .15s, transform .1s;
}
.del-btn:hover { background: #dc2626; transform: translateY(-1px); }

/* ── 剩餘假別 Dialog ── */
.lb-wrap { display: flex; flex-direction: column; gap: 14px; }
.lb-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.lb-add-form {
  background: var(--bg-inner); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 14px;
}
.lb-cards { display: flex; flex-direction: column; gap: 10px; }
.lb-card {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-inner); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 12px 16px; gap: 12px;
}
.lb-card-left { display: flex; align-items: center; gap: 10px; flex-shrink: 0; min-width: 100px; }
.lb-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.lb-info { display: flex; flex-direction: column; gap: 2px; }
.lb-name { font-weight: 600; font-size: 16px; color: var(--text-primary); }
.lb-sub  { font-size: 14px; color: var(--text-muted); }
.lb-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex: 1; }
.lb-bar-wrap { width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden; }
.lb-bar { height: 100%; border-radius: 3px; transition: width .3s; }
.lb-nums { font-size: 15px; color: var(--text-secondary); }
.lb-nums strong { font-size: 16px; color: var(--text-primary); font-weight: 700; }

.lb-section-title { font-size: 15px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; letter-spacing: .03em; }
.lb-empty { font-size: 15px; color: var(--text-muted); padding: 12px 0; }
.lb-warn { color: #f59e0b !important; }

/* dialog dark mode */
:deep(.el-dialog) { background: var(--bg-card); border: 1px solid var(--border-color); }
:deep(.el-dialog__title)    { color: var(--text-primary); }
:deep(.el-form-item__label) { color: var(--text-primary); }
:deep(.el-radio__label)     { color: var(--text-primary); }
:deep(.el-input__wrapper) {
  background: var(--bg-inner) !important;
  box-shadow: 0 0 0 1px var(--border-color) !important;
}
:deep(.el-input__inner) { color: var(--text-primary) !important; }

@media (max-width: 375px) {
  .emp-page { padding: 16px 10px 100px; }
  .emp-name { font-size: 16px; }
}

:deep(.leave-balance-dialog) {
  max-height: 85dvh !important;
  display: flex !important; flex-direction: column !important;
}
:deep(.leave-balance-dialog .el-dialog__body) {
  overflow-y: auto !important; flex: 1 !important;
}
</style>
