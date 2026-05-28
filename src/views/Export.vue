<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportMonthly } from '@/api/http.js'

const exporting = ref(false)

const now = new Date()
const selectedYear  = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)

const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)

async function handleExport() {
  exporting.value = true
  try {
    const blob = await exportMonthly(selectedYear.value, selectedMonth.value)
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
      <h2 class="page-title">匯出記錄</h2>
    </div>

    <div class="card-wrap">
      <div class="section-card">
        <div class="section-title">選擇匯出月份</div>
        <div class="section-desc">將指定月份的所有員工打卡記錄匯出為 Excel 檔案</div>

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

      <div class="preview-bar">
        <el-icon size="18"><Document /></el-icon>
        <span>打卡記錄_{{ selectedYear }}年{{ selectedMonth }}月.xlsx</span>
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
  background: #0f172a;
  padding: 28px 32px;
  box-sizing: border-box;
}
.page-header { margin-bottom: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #f1f5f9; margin: 0; }

.card-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.section-card {
  background: #1e293b;
  border-radius: 14px;
  padding: 20px 24px;
  border: 1px solid rgba(255,255,255,0.08);
}
.section-title {
  font-size: 15px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px;
}
.section-desc {
  font-size: 13px; color: #64748b; margin-bottom: 20px;
}

.picker-row {
  display: flex; gap: 16px;
}
.pick-field {
  flex: 1; display: flex; flex-direction: column; gap: 8px;
}
.pick-field label {
  font-size: 13px; color: #94a3b8; font-weight: 500;
}

.preview-bar {
  display: flex; align-items: center; gap: 10px;
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 12px 16px;
  color: #94a3b8;
  font-size: 14px;
}

.export-btn { width: 100%; }

@media (max-width: 768px) {
  .export-page { padding: 16px 14px; }
  .page-title { font-size: 17px; }
  .picker-row { flex-direction: column; }
}
</style>
