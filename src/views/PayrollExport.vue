<script setup>
import { ref, onMounted } from 'vue'
import { fetchEmployees, exportPayroll } from '@/api/http.js'
import { ElMessage } from 'element-plus'

const employees   = ref([])
const _lastMonth  = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
const year        = ref(_lastMonth.getFullYear())
const month       = ref(_lastMonth.getMonth() + 1)
const filterEmps  = ref([])
const exporting   = ref(false)

const ALL_COLUMNS = [
  { key: 'worked_h',     label: '實際工時' },
  { key: 'overtime_h',   label: '加班工時' },
  { key: 'late_h',       label: '遲到時數' },
  { key: 'early_h',      label: '早退時數' },
  { key: 'base_pay',     label: '底薪' },
  { key: 'overtime_pay', label: '加班費' },
  { key: 'holiday_pay',  label: '假日加給' },
  { key: 'deductions',   label: '扣款' },
  { key: 'total_pay',    label: '實領薪資' },
  { key: 'status',       label: '狀態' },
]

const selectedCols = ref(ALL_COLUMNS.map(c => c.key))

const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

onMounted(async () => {
  try {
    employees.value = await fetchEmployees()
  } catch {
    ElMessage.error('載入員工列表失敗')
  }
})

async function doExport() {
  if (!selectedCols.value.length) {
    ElMessage.warning('請至少選擇一個欄位')
    return
  }
  exporting.value = true
  try {
    const blob = await exportPayroll(year.value, month.value, filterEmps.value, selectedCols.value)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `payroll_${year.value}_${String(month.value).padStart(2,'0')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('匯出成功')
  } catch {
    ElMessage.error('匯出失敗')
  } finally {
    exporting.value = false
  }
}

function toggleCol(key) {
  const idx = selectedCols.value.indexOf(key)
  if (idx >= 0) selectedCols.value.splice(idx, 1)
  else selectedCols.value.push(key)
}

function selectAll()   { selectedCols.value = ALL_COLUMNS.map(c => c.key) }
function clearAll()    { selectedCols.value = [] }
</script>

<template>
  <div class="export-page">
    <div class="page-header">
      <h2 class="page-title">薪資匯出</h2>
    </div>

    <div class="card">
      <!-- 年月 -->
      <div class="section">
        <div class="section-label">匯出月份</div>
        <div class="row-wrap">
          <el-select v-model="year" style="width:110px">
            <el-option v-for="y in yearOptions" :key="y" :label="`${y} 年`" :value="y" />
          </el-select>
          <el-select v-model="month" style="width:100px">
            <el-option v-for="m in monthOptions" :key="m" :label="`${m} 月`" :value="m" />
          </el-select>
        </div>
      </div>

      <!-- 員工篩選 -->
      <div class="section">
        <div class="section-label">員工篩選 <span class="hint">（不選則匯出全部）</span></div>
        <el-select
          v-model="filterEmps"
          multiple
          collapse-tags
          collapse-tags-tooltip
          placeholder="全部員工"
          clearable
          style="width:100%; max-width:420px"
        >
          <el-option
            v-for="e in employees"
            :key="e.id"
            :label="e.display_name"
            :value="e.id"
          />
        </el-select>
      </div>

      <!-- 欄位選擇 -->
      <div class="section">
        <div class="section-label-row">
          <span class="section-label">匯出欄位</span>
          <div class="quick-btns">
            <el-button size="small" type="primary" @click="selectAll">全選</el-button>
            <el-button size="small" @click="clearAll">清除</el-button>
          </div>
        </div>
        <div class="col-grid">
          <div
            v-for="col in ALL_COLUMNS"
            :key="col.key"
            class="col-chip"
            :class="{ active: selectedCols.includes(col.key) }"
            @click="toggleCol(col.key)"
          >
            <span class="chip-check" v-if="selectedCols.includes(col.key)">✓</span>
            {{ col.label }}
          </div>
        </div>
      </div>

      <!-- 匯出按鈕 -->
      <div class="section">
        <el-button
          type="success"
          :loading="exporting"
          @click="doExport"
          style="min-width:140px"
        >
          {{ exporting ? '匯出中…' : '匯出 Excel' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-page {
  flex: 1;
  padding: 28px 32px;
  background: var(--bg-app);
  transition: background .2s;
}
.page-header { margin-bottom: 20px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px 28px;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: background .2s, border-color .2s;
}

.section { display: flex; flex-direction: column; gap: 10px; }
.section-label { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.section-label-row { display: flex; align-items: center; justify-content: space-between; }
.hint { font-size: 16px; font-weight: 400; color: var(--text-muted); }
.quick-btns { display: flex; gap: 6px; }

.row-wrap { display: flex; gap: 10px; flex-wrap: wrap; }

.col-grid {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.col-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 8px 14px; border-radius: 8px;
  font-size: 16px; font-weight: 600;
  cursor: pointer; user-select: none;
  border: 1.5px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--bg-inner);
  transition: all .15s;
}
.col-chip:hover { border-color: #3b82f6; color: #3b82f6; }
.col-chip.active {
  background: #3b82f6; border-color: #3b82f6;
  color: #fff;
}
.chip-check { font-size: 16px; }

@media (max-width: 768px) {
  .export-page { padding: 20px 14px 100px; }
  .card { padding: 18px 16px; }
}
</style>
