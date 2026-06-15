<script setup>
import { ref } from 'vue'
import { resetAllData } from '@/api/http.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const confirmed = ref(false)

async function handleReset() {
  try {
    await ElMessageBox.confirm(
      '此操作將永久刪除所有員工、打卡紀錄、職位、薪資等資料，且無法復原。確定要繼續嗎？',
      '⚠️ 高風險操作',
      {
        confirmButtonText: '確認清除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )
  } catch {
    return
  }

  loading.value = true
  try {
    await resetAllData()
    ElMessage.success('所有業務資料已清除完成')
    confirmed.value = true
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '清除失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h2 class="title">重置資料</h2>
      <p class="subtitle">清除系統中所有業務資料，管理員帳號與系統設定將保留。</p>
    </div>

    <el-alert
      title="此操作不可復原"
      type="error"
      :closable="false"
      show-icon
      class="alert"
    >
      <template #default>
        執行後以下資料將被永久刪除，請確認已備份完畢再繼續。
      </template>
    </el-alert>

    <div class="card">
      <div class="scope-title">將被清除的資料</div>
      <div class="scope-grid">
        <div class="scope-item">
          <el-icon color="#ef4444"><User /></el-icon>
          <div>
            <div class="scope-label">員工資料</div>
            <div class="scope-desc">所有員工帳號與基本資料</div>
          </div>
        </div>
        <div class="scope-item">
          <el-icon color="#ef4444"><Clock /></el-icon>
          <div>
            <div class="scope-label">打卡紀錄</div>
            <div class="scope-desc">出勤紀錄、補打卡申請</div>
          </div>
        </div>
        <div class="scope-item">
          <el-icon color="#ef4444"><OfficeBuilding /></el-icon>
          <div>
            <div class="scope-label">職位設定</div>
            <div class="scope-desc">職位名稱與假別設定</div>
          </div>
        </div>
        <div class="scope-item">
          <el-icon color="#ef4444"><Money /></el-icon>
          <div>
            <div class="scope-label">薪資相關</div>
            <div class="scope-desc">薪資設定、薪資紀錄</div>
          </div>
        </div>
        <div class="scope-item">
          <el-icon color="#ef4444"><Calendar /></el-icon>
          <div>
            <div class="scope-label">排班與班別</div>
            <div class="scope-desc">班別設定、排班資料</div>
          </div>
        </div>
        <div class="scope-item">
          <el-icon color="#ef4444"><Tickets /></el-icon>
          <div>
            <div class="scope-label">假別與請假</div>
            <div class="scope-desc">假別類型、請假紀錄</div>
          </div>
        </div>
      </div>

      <div class="preserve">
        <el-icon color="#22c55e"><CircleCheck /></el-icon>
        <span>保留：管理員帳號、系統設定（GPS / IP 設定）</span>
      </div>
    </div>

    <div class="action">
      <el-button
        type="danger"
        size="large"
        :loading="loading"
        :disabled="confirmed"
        @click="handleReset"
      >
        <el-icon><Delete /></el-icon>
        {{ confirmed ? '已完成清除' : '清除所有資料' }}
      </el-button>
      <p v-if="confirmed" class="done-hint">資料已清除。如需重新啟用系統，請重新新增員工與相關設定。</p>
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

.alert { border-radius: 10px; }

.card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.scope-title { font-size: 14px; font-weight: 600; color: var(--el-text-color-secondary); }
.scope-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.scope-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.scope-item .el-icon { margin-top: 2px; flex-shrink: 0; }
.scope-label { font-size: 14px; font-weight: 600; color: var(--el-text-color-primary); }
.scope-desc { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }

.preserve {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.08);
  border-radius: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.action { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.done-hint { font-size: 13px; color: var(--el-text-color-secondary); margin: 0; }

@media (max-width: 480px) {
  .scope-grid { grid-template-columns: 1fr; }
}
</style>
