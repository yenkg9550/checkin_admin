<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { exportMonthly, fetchEmployees } from '@/api/http.js'

const exporting = ref(false)

const now = new Date()
const selectedYear  = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)

const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)

// 員工篩選
const employees      = ref([])
const selectedEmpIds = ref([])  // [] = 全部

onMounted(async () => {
  try {
    const data = await fetchEmployees()
    employees.value = data
  } catch {
    ElMessage.error('載入員工列表失敗')
  }
})

function selectAll() {
  selectedEmpIds.value = []
}

async function handleExport() {
  exporting.value = true
  try {
    const blob = await exportMonthly(selectedYear.value, selectedMonth.value, selectedEmpIds.value)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `打卡記錄_${selectedYear.value}年${selectedMonth.value}月.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('匯出成功')
  } catch {
    ElMessage.error('匯出失敗')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="export-page">
    <div class="page-header">
      <h2 class="page-title">出勤匯出</h2>
    </div>

    <div class="card-wrap">

      <!-- 月份選擇 -->
      <div class="section-card">
        <div class="section-title">選擇匯出月份</div>
        <div class="section-desc">將指定月份的員工打卡記錄匯出為 Excel 檔案</div>

        <div class="picker-row">
          <div class="pick-field">
            <label>年份</label>
            <el-select v-model="selectedYear" size="large">
              <el-option v-for="y in years" :key="y" :label="`${y} 年`" :value="y" />
            </el-select>
          </div>
          <div class="pick-field">
            <label>月份</label>
            <el-select v-model="selectedMonth" size="large">
              <el-option v-for="m in months" :key="m" :label="`${m} 月`" :value="m" />
            </el-select>
          </div>
        </div>
      </div>

      <!-- 員工篩選 -->
      <div class="section-card">
        <div class="section-title">選擇員工</div>
        <div class="section-desc">
          不選擇則匯出全部員工；可多選指定人員
        </div>

        <el-select
          v-model="selectedEmpIds"
          multiple
          collapse-tags
          collapse-tags-tooltip
          placeholder="全部員工"
          size="large"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="emp in employees"
            :key="emp.id"
            :label="emp.display_name"
            :value="emp.id"
          />
        </el-select>

        <div class="emp-hint" v-if="selectedEmpIds.length">
          已選 {{ selectedEmpIds.length }} 位員工
          <button class="clear-btn" @click="selectAll">清除（全部）</button>
        </div>
        <div class="emp-hint" v-else>
          匯出全部 {{ employees.length }} 位員工
        </div>
      </div>

      <!-- 預覽列 -->
      <div class="preview-bar">
        <el-icon size="18"><Document /></el-icon>
        <span>打卡記錄_{{ selectedYear }}年{{ selectedMonth }}月.xlsx</span>
        <span v-if="selectedEmpIds.length" class="preview-tag">{{ selectedEmpIds.length }} 位員工</span>
        <span v-else class="preview-tag">全部員工</span>
      </div>

      <el-button
        type="success"
        size="large"
        :loading="exporting"
        @click="handleExport"
        class="export-btn"
      >
        <el-icon><Download /></el-icon>
        <span style="margin-left:6px">下載 Excel</span>
      </el-button>

    </div>
  </div>
</template>

<style scoped>
.export-page {
  flex: 1;
  background: var(--bg-app);
  padding: 28px 32px;
  box-sizing: border-box;
  transition: background .2s;
}
.page-header { margin-bottom: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; transition: color .2s; }

.card-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.section-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 20px 24px;
  border: 1px solid var(--border-color);
  transition: background .2s, border-color .2s;
}
.section-title {
  font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;
}
.section-desc {
  font-size: 16px; color: var(--text-secondary); margin-bottom: 16px;
}

.picker-row {
  display: flex; gap: 16px;
}
.pick-field {
  flex: 1; display: flex; flex-direction: column; gap: 8px;
}
.pick-field label {
  font-size: 16px; color: var(--text-muted); font-weight: 500;
}

.emp-hint {
  margin-top: 10px;
  font-size: 16px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 10px;
}
.clear-btn {
  background: #64748b;
  border: none;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s, transform .1s;
}
.clear-btn:hover {
  background: #475569;
  transform: translateY(-1px);
}

.preview-bar {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg-inner);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--text-muted);
  font-size: 16px;
  transition: background .2s, border-color .2s;
  flex-wrap: wrap;
}
.preview-tag {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 16px;
  color: var(--text-secondary);
}

.export-btn { width: 100%; }

@media (max-width: 768px) {
  .export-page { padding: 16px 14px 100px; }
  .page-title { font-size: 17px; }
  .picker-row { flex-direction: column; gap: 12px; }
  .card-wrap { max-width: 100%; }
  .section-card { padding: 16px; }
}

@media (max-width: 375px) {
  .export-page { padding: 12px 10px 100px; }
  .section-title { font-size: 16px; }
}
</style>
