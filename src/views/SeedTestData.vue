<script setup>
import { ref } from 'vue'
import { seedTestData } from '@/api/http.js'
import { ElMessage } from 'element-plus'

const loading   = ref(false)
const done      = ref(false)
const resultMsg = ref('')

async function handleSeed() {
  loading.value = true
  try {
    const res = await seedTestData()
    resultMsg.value = res.message || '操作完成'
    done.value = true
    ElMessage.success(resultMsg.value)
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '新增測試資料失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2 class="title">加入測試資料</h2>
      <p class="subtitle">此頁面為隱藏工具頁，不會出現在選單中。點擊下方按鈕會新增「林佳穎」「張志強」兩位員工，連同日班／晚班、排班與打卡紀錄。</p>
    </div>

    <div class="card">
      <div class="scope-title">將新增的資料</div>
      <ul class="scope-list">
        <li>員工：林佳穎（日班）、張志強（晚班）</li>
        <li>班別：日班 09:00–18:00、晚班 22:00–07:00</li>
        <li>排班與打卡紀錄：2026 年 5 月份共 21 個工作日</li>
      </ul>
      <p class="hint">若這兩位員工已存在，將不會重複新增。</p>
    </div>

    <div class="action">
      <el-button
        type="primary"
        size="large"
        :loading="loading"
        :disabled="done"
        @click="handleSeed"
      >
        <el-icon><Plus /></el-icon>
        {{ done ? '已完成新增' : '加入測試資料' }}
      </el-button>
      <p v-if="resultMsg" class="done-hint">{{ resultMsg }}</p>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 680px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.header { display: flex; flex-direction: column; gap: 6px; }
.title { font-size: 22px; font-weight: 700; color: var(--el-text-color-primary); margin: 0; }
.subtitle { font-size: 14px; color: var(--el-text-color-secondary); margin: 0; }

.card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scope-title { font-size: 14px; font-weight: 600; color: var(--el-text-color-secondary); }
.scope-list { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: var(--el-text-color-primary); }
.hint { font-size: 13px; color: var(--el-text-color-secondary); margin: 0; }

.action { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.done-hint { font-size: 13px; color: var(--el-text-color-secondary); margin: 0; }
</style>
