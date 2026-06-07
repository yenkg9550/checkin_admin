<template>
  <div class="payroll-page">
    <h2 class="page-title">薪資報表</h2>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" class="payroll-tabs">
      <!-- ── 薪資單 ── -->
      <el-tab-pane label="薪資單" name="payroll">
        <div class="toolbar">
          <el-date-picker
            v-model="selectedMonth"
            type="month"
            placeholder="選擇月份"
            format="YYYY/MM"
            value-format="YYYY-MM"
            style="width:160px"
          />
          <el-button type="primary" :loading="calculating" @click="doCalculate">
            重新計算
          </el-button>
        </div>

        <el-table
          :data="records"
          class="payroll-table"
          row-key="id"
          :row-class-name="({ row }) => (row.anomaly_days > 0 || row.unscheduled_days > 0) ? 'row-anomaly' : ''"
        >
          <el-table-column label="員工" prop="employee_name" min-width="110" />
          <el-table-column label="出勤(h)" align="right" min-width="80">
            <template #default="{ row }">{{ ((row.worked_minutes - row.overtime_minutes) / 60).toFixed(1) }}</template>
          </el-table-column>
          <el-table-column label="加班(h)" align="right" min-width="80">
            <template #default="{ row }">{{ (row.overtime_minutes / 60).toFixed(1) }}</template>
          </el-table-column>
          <el-table-column label="遲到(h)" align="right" min-width="80">
            <template #default="{ row }">
              <span :class="row.late_minutes > 0 ? 'warn' : ''">{{ (row.late_minutes / 60).toFixed(1) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="早退(h)" align="right" min-width="80">
            <template #default="{ row }">
              <span :class="row.early_leave_minutes > 0 ? 'warn' : ''">{{ (row.early_leave_minutes / 60).toFixed(1) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="底薪" align="right" min-width="90">
            <template #default="{ row }">{{ row.base_pay.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="加班薪" align="right" min-width="90">
            <template #default="{ row }">{{ row.overtime_pay.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="特別假日" align="right" min-width="90">
            <template #default="{ row }">{{ row.holiday_pay.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="扣款" align="right" min-width="80">
            <template #default="{ row }">
              <el-tooltip v-if="row.deductions > 0" placement="top">
                <template #content>
                  <div v-if="row.insurance_deduction > 0">勞健保：{{ row.insurance_deduction.toLocaleString() }}</div>
                  <div v-if="row.pension_deduction > 0">自提：{{ row.pension_deduction.toLocaleString() }}</div>
                  <div v-if="(row.deductions - (row.insurance_deduction||0) - (row.pension_deduction||0)) > 0">
                    遲到/早退：{{ (row.deductions - (row.insurance_deduction||0) - (row.pension_deduction||0)).toLocaleString() }}
                  </div>
                </template>
                <span class="deduct">-{{ row.deductions.toLocaleString() }}</span>
              </el-tooltip>
              <span v-else>0</span>
            </template>
          </el-table-column>
          <el-table-column label="合計" align="right" min-width="100">
            <template #default="{ row }">
              <strong class="total-pay">{{ row.total_pay.toLocaleString() }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="" width="44" align="center">
            <template #default="{ row }">
              <el-tooltip v-if="row.anomaly_days > 0 || row.unscheduled_days > 0" placement="top" effect="dark">
                <template #content>
                  <div v-if="row.anomaly_days > 0">⚠ {{ row.anomaly_days }} 天僅有單筆打卡（缺上班或下班卡）</div>
                  <div v-if="row.unscheduled_days > 0">⚠ {{ row.unscheduled_days }} 天有打卡但無排班</div>
                </template>
                <el-icon size="16" color="#ef4444" style="cursor:pointer"><WarnTriangleFilled /></el-icon>
              </el-tooltip>
            </template>
          </el-table-column>

        </el-table>
      </el-tab-pane>

    </el-tabs>



  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  fetchPayroll, calculatePayroll,
} from '@/api/http'

const activeTab     = ref('payroll')
const selectedMonth = ref(todayYM())
const records       = ref([])
const calculating   = ref(false)


function todayYM() {
  const now = new Date(Date.now() + 8 * 3600000)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function parseYM(ym) {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, month: m }
}

onMounted(async () => {
  await loadPayroll()
})

watch(selectedMonth, loadPayroll)

async function loadPayroll() {
  if (!selectedMonth.value) return
  const { year, month } = parseYM(selectedMonth.value)
  records.value = await fetchPayroll(year, month)
}

async function doCalculate() {
  const { year, month } = parseYM(selectedMonth.value)
  calculating.value = true
  try {
    const result = await calculatePayroll(year, month)
    if (result.errors?.length) {
      const lines = result.errors.map(e => `• ${e.error}`).join('<br>')
      ElMessage({
        type: 'warning',
        dangerouslyUseHTMLString: true,
        message: `計算完成，以下 ${result.errors.length} 位員工未能計算：<br>${lines}`,
        duration: 8000,
        showClose: true,
      })
    } else {
      ElMessage.success(`計算完成，共 ${result.calculated?.length ?? 0} 筆`)
    }
    await loadPayroll()
  } catch (e) {
    ElMessage.error('計算失敗')
  } finally {
    calculating.value = false
  }
}



</script>

<style scoped>
.payroll-page {
  padding: 24px;
  height: 100%;
  background: var(--bg-app);
  transition: background .2s;
  display: flex;
  flex-direction: column;
}

.payroll-page :deep(.el-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.payroll-page :deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
}
.payroll-page :deep(.el-tab-pane) {
  height: 100%;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
  transition: color .2s;
}

/* tabs */
.payroll-tabs :deep(.el-tabs__nav-wrap::after) { background: var(--border-color); }
.payroll-tabs :deep(.el-tabs__item) { color: var(--text-secondary); transition: color .2s; }
.payroll-tabs :deep(.el-tabs__item.is-active) { color: var(--text-primary); }

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-left: 6px;
}

.record-count {
  font-size: 16px;
  color: var(--text-secondary);
}


/* tables */
.payroll-table { }

.payroll-page :deep(.el-table),
.payroll-page :deep(.el-table tr),
.payroll-page :deep(.el-table__inner-wrapper),
.payroll-page :deep(.el-table__body-wrapper),
.payroll-page :deep(.el-table__header-wrapper),
.payroll-page :deep(.el-table__footer-wrapper) {
  background: var(--bg-app) !important;
}

.payroll-page :deep(th.el-table__cell) {
  background: var(--bg-inner) !important;
  color: var(--text-secondary) !important;
  border-color: var(--border-color) !important;
}
.payroll-page :deep(td.el-table__cell) {
  background: var(--bg-app) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}
.payroll-page :deep(.el-table__row:hover td.el-table__cell),
.payroll-page :deep(.el-table__row.hover-row td.el-table__cell) {
  background: var(--bg-inner) !important;
}
.payroll-page :deep(.row-anomaly td.el-table__cell) { background: rgba(239,68,68,.08) !important; }
.payroll-page :deep(.row-anomaly:hover td.el-table__cell),
.payroll-page :deep(.row-anomaly.hover-row td.el-table__cell) { background: rgba(239,68,68,.14) !important; }
.payroll-page :deep(.el-table__empty-block) { background: var(--bg-app) !important; }
.payroll-page :deep(.el-table__empty-text) { color: var(--text-muted) !important; }

/* date picker */
:deep(.el-date-editor .el-input__wrapper) {
  background: var(--bg-card) !important;
  box-shadow: 0 0 0 1px var(--border-color) !important;
}
:deep(.el-date-editor .el-input__inner) {
  color: var(--text-primary) !important;
}

/* dialogs */
:deep(.el-dialog) {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}
:deep(.el-dialog__title)    { color: var(--text-primary); }
:deep(.el-form-item__label) { color: var(--text-primary); }
:deep(.el-input__wrapper) {
  background: var(--bg-inner) !important;
  box-shadow: 0 0 0 1px var(--border-color) !important;
}
:deep(.el-input__inner)  { color: var(--text-primary) !important; }

.total-pay  { color: #409eff; }
.deduct     { color: #f56c6c; }
.warn       { color: #e6a23c; font-weight: 600; }
</style>
