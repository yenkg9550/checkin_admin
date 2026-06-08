<script setup>
import { ref, onMounted, computed } from 'vue'
import { fetchLeaveRequests, approveLeaveRequest, rejectLeaveRequest, fetchEmployees } from '@/api/http.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const records     = ref([])
const employees   = ref([])
const loading     = ref(false)
const filterStatus = ref('pending')
const filterEmp    = ref(null)

const rejectDialogVisible = ref(false)
const rejectTarget        = ref(null)
const rejectReason        = ref('')
const rejectLoading       = ref(false)

onMounted(async () => {
  try { employees.value = await fetchEmployees() } catch {}
  await loadRecords()
})

async function loadRecords() {
  loading.value = true
  try {
    const params = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (filterEmp.value)    params.employee_id = filterEmp.value
    records.value = await fetchLeaveRequests(params)
  } catch {
    ElMessage.error('載入請假申請失敗')
  } finally {
    loading.value = false
  }
}

async function handleApprove(row) {
  try {
    await ElMessageBox.confirm(
      `確認通過 ${row.display_name} 的請假申請？\n假別：${row.leave_type_name}｜${row.start_date} ～ ${row.end_date}（${row.days} 天）`,
      '審核通過',
      { confirmButtonText: '確認通過', cancelButtonText: '取消', type: 'success' }
    )
  } catch { return }
  try {
    await approveLeaveRequest(row.id)
    ElMessage.success('已通過，假別餘額已扣除')
    await loadRecords()
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '操作失敗')
  }
}

function openReject(row) {
  rejectTarget.value = row
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

async function submitReject() {
  rejectLoading.value = true
  try {
    await rejectLeaveRequest(rejectTarget.value.id, rejectReason.value)
    ElMessage.success('已駁回')
    rejectDialogVisible.value = false
    await loadRecords()
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '操作失敗')
  } finally {
    rejectLoading.value = false
  }
}

const pendingCount = computed(() =>
  filterStatus.value === 'pending' ? records.value.length : 0
)

const statusOptions = [
  { label: '待審核', value: 'pending'  },
  { label: '已通過', value: 'approved' },
  { label: '已駁回', value: 'rejected' },
  { label: '全部',   value: ''         },
]
const statusLabel = (s) => ({ pending: '待審核', approved: '已通過', rejected: '已駁回' }[s] ?? s)
const statusType  = (s) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] ?? 'info')
</script>

<template>
  <div class="leave-req-page">
    <div class="page-header">
      <h2 class="page-title">申請請假列表</h2>
      <el-tag v-if="pendingCount > 0" type="danger" effect="dark" size="small">
        {{ pendingCount }} 筆待審
      </el-tag>
    </div>

    <!-- 篩選 -->
    <div class="filter-bar">
      <el-select v-model="filterStatus" style="width:120px" @change="loadRecords">
        <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
      <el-select v-model="filterEmp" placeholder="全部員工" clearable style="width:160px" @change="loadRecords">
        <el-option v-for="e in employees" :key="e.id" :label="e.display_name" :value="e.id" />
      </el-select>
      <span class="record-hint" v-if="records.length">共 {{ records.length }} 筆</span>
    </div>

    <!-- 桌機表格 -->
    <div class="table-wrap desktop-view" v-loading="loading" element-loading-background="transparent">
      <table class="req-table">
        <thead>
          <tr>
            <th>員工</th>
            <th>假別</th>
            <th>請假期間</th>
            <th>天數</th>
            <th>原因</th>
            <th>狀態</th>
            <th>申請時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td>
              <div class="emp-info">
                <img v-if="r.picture_url" :src="r.picture_url" class="avatar" referrerpolicy="no-referrer" />
                <div v-else class="avatar-ph">{{ r.display_name?.[0] }}</div>
                <span class="emp-name">{{ r.display_name }}</span>
              </div>
            </td>
            <td>
              <span class="type-badge" :style="{ background: r.leave_type_color + '22', color: r.leave_type_color, borderColor: r.leave_type_color }">
                {{ r.leave_type_name }}
              </span>
            </td>
            <td class="mono">{{ r.start_date }}<br/><span class="muted">～ {{ r.end_date }}</span></td>
            <td class="days-cell">{{ r.days }} 天</td>
            <td class="reason">{{ r.reason || '—' }}</td>
            <td>
              <el-tag :type="statusType(r.status)" size="small">{{ statusLabel(r.status) }}</el-tag>
              <div v-if="r.reject_reason" class="reject-hint">{{ r.reject_reason }}</div>
            </td>
            <td class="mono muted">{{ r.created_at?.slice(0,16).replace('T',' ') }}</td>
            <td>
              <div class="action-btns" v-if="r.status === 'pending'">
                <el-button type="success" size="small" @click="handleApprove(r)">通過</el-button>
                <el-button type="danger"  size="small" @click="openReject(r)">駁回</el-button>
              </div>
              <span v-else class="muted done-text">已處理</span>
            </td>
          </tr>
          <tr v-if="!loading && records.length === 0">
            <td colspan="8" class="empty">尚無請假申請</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 手機卡片 -->
    <div class="mobile-view" v-loading="loading" element-loading-background="transparent">
      <div v-if="!loading && records.length === 0" class="empty">尚無請假申請</div>
      <div v-for="r in records" :key="r.id" class="req-card">
        <div class="card-top">
          <div class="emp-info">
            <img v-if="r.picture_url" :src="r.picture_url" class="avatar" referrerpolicy="no-referrer" />
            <div v-else class="avatar-ph">{{ r.display_name?.[0] }}</div>
            <span class="emp-name">{{ r.display_name }}</span>
          </div>
          <el-tag :type="statusType(r.status)" size="small">{{ statusLabel(r.status) }}</el-tag>
        </div>
        <div class="card-row">
          <span class="type-badge" :style="{ background: r.leave_type_color + '22', color: r.leave_type_color, borderColor: r.leave_type_color }">
            {{ r.leave_type_name }}
          </span>
          <span class="mono" style="font-size:13px">{{ r.start_date }} ～ {{ r.end_date }}</span>
          <span class="days-cell">{{ r.days }}天</span>
        </div>
        <div v-if="r.reason" class="card-row"><span class="label">原因</span><span>{{ r.reason }}</span></div>
        <div v-if="r.reject_reason" class="card-row reject-hint"><span class="label">駁回</span><span>{{ r.reject_reason }}</span></div>
        <div class="card-row muted"><span class="label">申請</span><span>{{ r.created_at?.slice(0,16).replace('T',' ') }}</span></div>
        <div v-if="r.status === 'pending'" class="card-actions">
          <el-button type="success" size="small" style="flex:1" @click="handleApprove(r)">通過</el-button>
          <el-button type="danger"  size="small" style="flex:1" @click="openReject(r)">駁回</el-button>
        </div>
      </div>
    </div>

    <!-- 駁回對話框 -->
    <el-dialog v-model="rejectDialogVisible" title="駁回請假" width="380px" :close-on-click-modal="false">
      <div v-if="rejectTarget" style="margin-bottom:12px;color:var(--text-secondary);font-size:14px;line-height:1.6">
        員工：<strong>{{ rejectTarget.display_name }}</strong><br/>
        假別：{{ rejectTarget.leave_type_name }}｜{{ rejectTarget.start_date }} ～ {{ rejectTarget.end_date }}（{{ rejectTarget.days }} 天）
      </div>
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="3"
        placeholder="請輸入駁回原因（選填，30字以內）"
        maxlength="30"
        show-word-limit
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="rejectLoading" @click="submitReject">確認駁回</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.leave-req-page {
  flex: 1; padding: 28px 32px;
  background: var(--bg-app); transition: background .2s;
}
.page-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.record-hint { font-size: 14px; color: var(--text-muted); }

.table-wrap {
  background: var(--bg-card); border-radius: 12px;
  border: 1px solid var(--border-color); overflow: hidden;
  min-height: 200px; transition: background .2s, border-color .2s;
}
.req-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.req-table thead tr { background: var(--bg-inner); }
.req-table th { padding: 13px 14px; text-align: left; font-weight: 700; font-size: 13px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); }
.req-table tbody tr { border-bottom: 1px solid var(--divider); transition: background .15s; }
.req-table tbody tr:last-child { border-bottom: none; }
.req-table tbody tr:hover { background: var(--bg-inner); }
.req-table td { padding: 11px 14px; color: var(--text-secondary); vertical-align: middle; }

.emp-info { display: flex; align-items: center; gap: 8px; }
.avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.avatar-ph {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg,#3b82f6,#1d4ed8);
  color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.emp-name { font-weight: 600; color: var(--text-primary); font-size: 13px; }

.type-badge {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 700; border: 1.5px solid;
}
.mono { font-family: monospace; font-size: 13px; }
.muted { color: var(--text-muted); }
.days-cell { font-weight: 700; color: var(--text-primary); white-space: nowrap; }
.reason { max-width: 200px; font-size: 13px; }
.reject-hint { font-size: 12px; color: #ef4444; margin-top: 4px; }
.action-btns { display: flex; gap: 6px; }
.done-text { font-size: 13px; }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

.mobile-view { display: none; flex-direction: column; gap: 10px; }
.req-card {
  background: var(--bg-card); border-radius: 12px;
  border: 1px solid var(--border-color);
  padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
  transition: background .2s, border-color .2s;
}
.card-top { display: flex; align-items: center; justify-content: space-between; }
.card-row { display: flex; gap: 8px; font-size: 13px; color: var(--text-secondary); align-items: center; flex-wrap: wrap; }
.card-row .label { color: var(--text-muted); font-weight: 600; min-width: 42px; }
.card-row.muted { color: var(--text-muted); font-size: 12px; }
.card-actions { display: flex; gap: 8px; margin-top: 4px; }

@media (max-width: 768px) {
  .leave-req-page { padding: 20px 14px 100px; }
  .desktop-view { display: none; }
  .mobile-view { display: flex; }
}
</style>
