<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchEmployees } from '@/api/http.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const employees = ref([])
const loading = ref(false)

const roleTagType = (role) => role === 'admin' ? 'danger' : 'info'

onMounted(loadEmployees)

async function loadEmployees() {
  loading.value = true
  try {
    employees.value = await fetchEmployees()
  } catch (e) {
    ElMessage.error('載入員工列表失敗')
  } finally {
    loading.value = false
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
      <div class="header-left">
        <button class="back-btn" @click="router.push({ name: 'dashboard' })">← 回首頁</button>
        <h2 class="page-title">員工管理</h2>
      </div>
      <el-button size="small" :loading="loading" @click="loadEmployees" circle>
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 桌機表格 -->
    <div class="emp-table-wrap desktop-table" v-loading="loading">
      <table class="emp-table">
        <thead>
          <tr>
            <th>員工</th>
            <th>LINE ID</th>
            <th>角色</th>
            <th>加入日期</th>
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
            <td class="mono">{{ emp.line_user_id }}</td>
            <td>
              <el-tag :type="roleTagType(emp.role)" size="small" effect="dark">
                {{ emp.role === 'admin' ? '管理員' : '一般員工' }}
              </el-tag>
            </td>
            <td>{{ formatDate(emp.created_at) }}</td>
          </tr>
          <tr v-if="!loading && employees.length === 0">
            <td colspan="4" class="empty-row">尚無員工資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 手機卡片 -->
    <div class="mobile-cards" v-loading="loading">
      <div v-if="!loading && employees.length === 0" class="empty-row">尚無員工資料</div>
      <div v-for="emp in employees" :key="emp.id" class="emp-card">
        <div class="card-left">
          <img v-if="emp.picture_url" :src="emp.picture_url" class="emp-avatar" referrerpolicy="no-referrer" />
          <div v-else class="emp-avatar-placeholder">{{ emp.display_name?.[0] ?? '?' }}</div>
          <div class="card-info">
            <div class="emp-name">{{ emp.display_name }}</div>
            <div class="card-date">{{ formatDate(emp.created_at) }}</div>
          </div>
        </div>
        <el-tag :type="roleTagType(emp.role)" size="small" effect="dark">
          {{ emp.role === 'admin' ? '管理員' : '員工' }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emp-page {
  min-height: 100vh;
  background: #0f172a;
  padding: 32px 36px;
  box-sizing: border-box;
}
.page-header {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 20px;
}
.header-left { display: flex; align-items: center; gap: 14px; }
.back-btn {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  color: #94a3b8; border-radius: 8px;
  padding: 6px 14px; font-size: 13px;
  cursor: pointer; transition: background .15s, color .15s;
}
.back-btn:hover { background: rgba(255,255,255,0.12); color: #f1f5f9; }
.page-title { font-size: 20px; font-weight: 700; color: #f1f5f9; margin: 0; }

/* ── 桌機表格 ── */
.desktop-table {
  background: #1e293b; border-radius: 12px;
  overflow: hidden; border: 1px solid rgba(255,255,255,0.08); min-height: 200px;
}
.emp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.emp-table thead tr { background: #0f172a; }
.emp-table th {
  padding: 12px 16px; text-align: left; color: #94a3b8;
  font-weight: 600; font-size: 12px; letter-spacing: .05em;
  text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.08);
}
.emp-table tbody tr {
  border-bottom: 1px solid rgba(255,255,255,0.05); transition: background .15s;
}
.emp-table tbody tr:last-child { border-bottom: none; }
.emp-table tbody tr:hover { background: rgba(255,255,255,0.03); }
.emp-table td { padding: 12px 16px; color: #cbd5e1; vertical-align: middle; }

.emp-info { display: flex; align-items: center; gap: 10px; }
.emp-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.emp-avatar-placeholder {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg,#3b82f6,#1d4ed8);
  color: #fff; font-size: 15px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.emp-name { font-weight: 600; color: #e2e8f0; }
.mono {
  font-family: monospace; font-size: 11px; color: #64748b;
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.empty-row { text-align: center; color: #475569; padding: 40px; }

/* ── 手機卡片 ── */
.mobile-cards { display: none; flex-direction: column; gap: 10px; }
.emp-card {
  background: #1e293b; border-radius: 12px;
  padding: 12px 14px; display: flex;
  align-items: center; justify-content: space-between;
  border: 1px solid rgba(255,255,255,0.07);
}
.card-left { display: flex; align-items: center; gap: 12px; }
.card-info { min-width: 0; }
.card-date { font-size: 11px; color: #475569; margin-top: 2px; }

/* ── RWD ── */
@media (max-width: 768px) {
  .emp-page { padding: 20px 14px 100px; }
  .page-title { font-size: 17px; }
  .desktop-table { display: none; }
  .mobile-cards { display: flex; }
}

@media (max-width: 375px) {
  .emp-page { padding: 16px 10px 100px; }
  .emp-name { font-size: 13px; }
}
</style>
