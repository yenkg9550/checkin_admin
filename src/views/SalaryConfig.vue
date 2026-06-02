<template>
  <div class="salary-config-page">
    <h2 class="page-title">薪資設定</h2>

    <!-- Tabs: 員工薪資 / 班別時薪 -->
    <el-tabs v-model="activeTab" class="config-tabs">
      <!-- ── 員工薪資 ── -->
      <el-tab-pane label="員工薪資設定" name="employee">
        <div class="emp-list">
          <div
            v-for="emp in employees"
            :key="emp.id"
            class="emp-card"
          >
            <div class="emp-header">
              <el-avatar :src="emp.picture_url" :size="36">
                {{ emp.display_name[0] }}
              </el-avatar>
              <span class="emp-name">{{ emp.display_name }}</span>
              <el-tag
                size="small"
                :type="!configMap[emp.id] ? 'info' : configMap[emp.id].pay_type === 'monthly' ? 'success' : ''"
                :style="configMap[emp.id]?.pay_type === 'hourly' ? 'background:#fff7ed;color:#ea580c;border-color:#fed7aa' : ''"
              >
                {{ configMap[emp.id] ? configMap[emp.id].pay_type === 'hourly' ? '時薪制' : '月薪制' : '未設定' }}
              </el-tag>
              <el-button size="small" circle type="primary" :icon="EditIcon" @click="openEdit(emp)" />
            </div>
            <div v-if="configMap[emp.id]" class="emp-summary">
              <span>底薪 {{ configMap[emp.id].base_salary.toLocaleString() }}</span>
              <span>加班 {{ configMap[emp.id].overtime_rate === 0 ? '無' : configMap[emp.id].overtime_rate + 'x' }}</span>
              <span>特別假日 {{ configMap[emp.id].holiday_rate === 0 ? '無' : configMap[emp.id].holiday_rate + 'x' }}</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ── 班別時薪 ── -->
      <el-tab-pane label="班別時薪設定" name="shift">
        <div class="shift-card-list">
          <div v-for="row in shiftConfigs" :key="row.id" class="shift-rate-card">
            <div class="shift-rate-left">
              <span class="shift-dot" :style="{ background: row.color }"></span>
              <div class="shift-rate-info">
                <span class="shift-rate-name">{{ row.name }}</span>
                <span class="shift-rate-time">{{ row.start_time }} – {{ row.end_time }}</span>
              </div>
            </div>
            <div class="shift-rate-right">
              <label class="rate-label">時薪 (元)</label>
              <el-input-number
                v-model="row.hourly_rate"
                :min="0"
                :step="1"
                controls-position="right"
                style="width:140px"
                @change="saveShiftRate(row)"
              />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Edit dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="`薪資設定 — ${editTarget?.display_name}`"
      width="480px"
      class="salary-dialog"
    >
      <el-form :model="form" :label-width="isMobile ? 'auto' : '120px'" :label-position="isMobile ? 'top' : 'right'" size="default">
        <el-form-item label="薪資制度">
          <el-radio-group v-model="form.pay_type">
            <el-radio value="hourly">時薪制</el-radio>
            <el-radio value="monthly">月薪制</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="form.pay_type === 'hourly' ? '時薪 (元)' : '月薪 (元)'">
          <el-input-number v-model="form.base_salary" :min="0" :step="1" style="width:180px" />
        </el-form-item>
        <el-divider>加班</el-divider>
        <el-form-item label="加班計算">
          <el-radio-group v-model="form.overtime_mode">
            <el-radio value="none">無</el-radio>
            <el-radio value="custom">自訂</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.overtime_mode === 'custom'">
          <el-form-item label="加班門檻 (h)">
            <el-input-number v-model="form.overtime_threshold_hours" :min="1" :max="24" :step="0.5" style="width:150px" />
          </el-form-item>
          <el-form-item label="最低起算 (分鐘)">
            <el-input-number v-model="form.overtime_min_minutes" :min="0" :max="120" :step="5" style="width:150px" />
            <span style="margin-left:8px;font-size:13px;color:var(--text-muted)">超過門檻至少幾分鐘才算加班</span>
          </el-form-item>
          <el-form-item label="加班倍率">
            <el-input-number v-model="form.overtime_rate" :min="1" :max="5" :step="0.1" :precision="1" style="width:150px" />
          </el-form-item>
        </template>
        <el-divider>特別假日</el-divider>
        <el-form-item label="特別假日加給">
          <el-radio-group v-model="form.holiday_mode">
            <el-radio value="none">無</el-radio>
            <el-radio value="custom">自訂</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.holiday_mode === 'custom'" label="特別假日倍率">
          <el-input-number v-model="form.holiday_rate" :min="1" :max="5" :step="0.1" :precision="1" style="width:150px" />
        </el-form-item>
        <el-divider>遲到 / 早退扣款</el-divider>
        <el-form-item label="遲到扣款方式">
          <el-select v-model="form.deduction_type" style="width:160px">
            <el-option label="無" value="none" />
            <el-option label="每分鐘扣" value="per_minute" />
            <el-option label="每次固定扣" value="fixed" />
            <el-option label="兩者並用" value="both" />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="form.deduction_type !== 'fixed' && form.deduction_type !== 'none'"
          label="每分鐘扣 (元)"
        >
          <el-input-number v-model="form.deduction_per_minute" :min="1" :step="1" style="width:150px" />
        </el-form-item>
        <el-form-item
          v-if="form.deduction_type !== 'per_minute' && form.deduction_type !== 'none'"
          label="固定扣款 (元)"
        >
          <el-input-number v-model="form.deduction_fixed" :min="1" :step="1" style="width:150px" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit as EditIcon } from '@element-plus/icons-vue'
import {
  fetchEmployees,
  fetchSalaryConfig, upsertSalaryConfig,
  fetchShifts, fetchShiftSalary, upsertShiftSalary,
} from '@/api/http'

const activeTab    = ref('employee')
const employees    = ref([])
const configMap    = reactive({})   // empId → SalaryConfigOut
const shiftConfigs = ref([])        // Shift + hourly_rate
const dialogVisible = ref(false)
const editTarget    = ref(null)
const saving        = ref(false)

const DEFAULT_FORM = () => ({
  pay_type: 'hourly',
  base_salary: 0,
  overtime_mode: 'none',
  overtime_threshold_hours: 8,
  overtime_min_minutes: 0,
  overtime_rate: 1.5,
  deduction_type: 'none',
  deduction_per_minute: 1,
  deduction_fixed: 1,
  holiday_mode: 'none',
  holiday_rate: 2.0,
  monthly_work_hours: 174,
})

const form = reactive(DEFAULT_FORM())

const isMobile = computed(() => window.innerWidth <= 768)

onMounted(async () => {
  await loadEmployees()
  await loadShifts()
})

async function loadEmployees() {
  employees.value = await fetchEmployees()
  for (const emp of employees.value) {
    try {
      configMap[emp.id] = await fetchSalaryConfig(emp.id)
    } catch {
      // 404 = not set yet
    }
  }
}

async function loadShifts() {
  const shifts = await fetchShifts()
  const rows = []
  for (const s of shifts) {
    let hourly_rate = 0
    try {
      const sc = await fetchShiftSalary(s.id)
      hourly_rate = sc.hourly_rate
    } catch { /* not set */ }
    rows.push({ ...s, hourly_rate })
  }
  shiftConfigs.value = rows
}

function openEdit(emp) {
  editTarget.value = emp
  const cfg = configMap[emp.id]
  if (cfg) {
    Object.assign(form, { ...cfg })
    form.overtime_mode = cfg.overtime_rate === 0 ? 'none' : 'custom'
    form.holiday_mode  = cfg.holiday_rate  === 0 ? 'none' : 'custom'
  } else {
    Object.assign(form, DEFAULT_FORM())
  }
  dialogVisible.value = true
}

async function submitEdit() {
  saving.value = true
  const payload = { ...form }
  if (payload.overtime_mode === 'none') payload.overtime_rate = 0
  if (payload.holiday_mode  === 'none') payload.holiday_rate  = 0
  try {
    const updated = await upsertSalaryConfig(editTarget.value.id, payload)
    configMap[editTarget.value.id] = updated
    dialogVisible.value = false
    ElMessage.success('薪資設定已儲存')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '儲存失敗')
  } finally {
    saving.value = false
  }
}

async function saveShiftRate(row) {
  try {
    await upsertShiftSalary(row.id, { hourly_rate: row.hourly_rate })
    ElMessage.success(`${row.name} 時薪已更新`)
  } catch (e) {
    ElMessage.error('儲存失敗')
  }
}
</script>

<style scoped>
.salary-config-page {
  flex: 1;
  padding: 24px;
  background: var(--bg-app);
  transition: background .2s;
  min-height: 100%;
  overflow-x: hidden;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
  transition: color .2s;
}

/* tabs */
.config-tabs :deep(.el-tabs__nav-wrap::after) { background: var(--border-color); }
.config-tabs :deep(.el-tabs__item) { color: var(--text-secondary); transition: color .2s; }
.config-tabs :deep(.el-tabs__item.is-active) { color: var(--text-primary); }

.emp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 700px;
}

/* card */
.emp-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  transition: background .2s, border-color .2s;
}

.emp-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.emp-name {
  flex: 1;
  font-weight: 600;
  color: var(--text-primary);
  transition: color .2s;
}

.emp-summary {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  font-size: 16px;
  color: var(--text-secondary);
  transition: color .2s;
}

/* shift rate cards */
.shift-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 520px;
}

.shift-rate-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 16px 20px;
  transition: background .2s, border-color .2s;
}

.shift-rate-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shift-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.shift-rate-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shift-rate-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
  transition: color .2s;
}

.shift-rate-time {
  font-size: 16px;
  color: var(--text-muted);
  transition: color .2s;
}

.shift-rate-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.rate-label {
  font-size: 16px;
  color: var(--text-muted);
  font-weight: 500;
}

.shift-rate-right :deep(.el-input-number .el-input__wrapper) {
  background: var(--bg-inner) !important;
  box-shadow: 0 0 0 1px var(--border-color) !important;
}
.shift-rate-right :deep(.el-input-number .el-input__inner) {
  color: var(--text-primary) !important;
}

/* dialog */
.salary-dialog :deep(.el-dialog) {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .salary-dialog :deep(.el-dialog) {
    width: 92vw !important;
    max-height: 85dvh !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }
  .salary-dialog :deep(.el-dialog__body) {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    flex: 1 !important;
  }
  .salary-dialog :deep(.el-input-number),
  .salary-dialog :deep(.el-select) {
    width: 100% !important;
  }
  .salary-dialog :deep(.el-form-item__content) {
    flex-wrap: wrap !important;
  }
}
.salary-dialog :deep(.el-dialog__title)     { color: var(--text-primary); }
.salary-dialog :deep(.el-form-item__label)  { color: var(--text-primary); }
.salary-dialog :deep(.el-radio__label)      { color: var(--text-primary); }
.salary-dialog :deep(.el-input__inner)      { background: var(--bg-inner); color: var(--text-primary); border-color: var(--border-color); }
.salary-dialog :deep(.el-select .el-input__inner) { background: var(--bg-inner); color: var(--text-primary); }
.salary-dialog :deep(.el-divider__text)     { color: var(--text-secondary); background: var(--bg-card); }
.salary-dialog :deep(.el-divider)           { border-color: var(--border-color); }
</style>
