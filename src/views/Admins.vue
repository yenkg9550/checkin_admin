<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdmins, createAdmin, deleteAdmin, changeAdminPassword, updateAdminPermissions } from '@/api/http.js'
import { useAuthStore } from '@/stores/auth.js'
import { Setting as SettingIcon, Key as KeyIcon, Delete as DeleteIcon } from '@element-plus/icons-vue'

const auth = useAuthStore()

const admins  = ref([])
const loading = ref(false)

// ── 權限定義 ──────────────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  { key: 'attendance', label: '出勤管理', color: '#3b82f6' },
  { key: 'employees',  label: '員工管理', color: '#10b981' },
  { key: 'schedule',   label: '排班管理', color: '#8b5cf6' },
  { key: 'export',     label: '出勤匯出', color: '#f59e0b' },
  { key: 'salary',     label: '薪資管理', color: '#ec4899' },
  { key: 'settings',   label: '系統設定', color: '#64748b' },
]

function permLabel(key) {
  return ALL_PERMISSIONS.find(p => p.key === key)?.label ?? key
}
function permColor(key) {
  return ALL_PERMISSIONS.find(p => p.key === key)?.color ?? '#94a3b8'
}

// ── 新增管理者 ────────────────────────────────────────────────────────────
const createVisible = ref(false)
const createLoading = ref(false)
const createForm    = ref({ username: '', password: '', confirmPassword: '', display_name: '', permissions: [] })
const createFormRef = ref(null)

const createRules = {
  display_name:    [{ required: true, message: '請填寫顯示名稱', trigger: 'blur' }],
  username:        [{ required: true, message: '請填寫帳號', trigger: 'blur' },
                    { min: 3, message: '帳號至少 3 個字元', trigger: 'blur' }],
  password:        [{ required: true, message: '請填寫密碼', trigger: 'blur' },
                    { min: 6, message: '密碼至少 6 個字元', trigger: 'blur' }],
  confirmPassword: [{ required: true, message: '請再次輸入密碼', trigger: 'blur' },
                    {
                      validator: (rule, value, cb) =>
                        value !== createForm.value.password ? cb(new Error('兩次密碼不一致')) : cb(),
                      trigger: 'blur',
                    }],
}

function openCreate() {
  createForm.value = { username: '', password: '', confirmPassword: '', display_name: '', permissions: [] }
  createVisible.value = true
}

async function submitCreate() {
  await createFormRef.value.validate()
  createLoading.value = true
  try {
    await createAdmin({
      username:     createForm.value.username,
      password:     createForm.value.password,
      display_name: createForm.value.display_name,
      permissions:  createForm.value.permissions,
    })
    ElMessage.success(`已新增管理者「${createForm.value.display_name}」`)
    createVisible.value = false
    loadAdmins()
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '新增失敗')
  } finally {
    createLoading.value = false
  }
}

// ── 編輯權限 ──────────────────────────────────────────────────────────────
const permVisible = ref(false)
const permLoading = ref(false)
const permTarget  = ref(null)
const permForm    = ref([])

function openEditPerm(admin) {
  permTarget.value  = admin
  permForm.value    = [...(admin.permissions ?? [])]
  permVisible.value = true
}

async function submitPerm() {
  permLoading.value = true
  try {
    const updated = await updateAdminPermissions(permTarget.value.id, permForm.value)
    const idx = admins.value.findIndex(a => a.id === permTarget.value.id)
    if (idx !== -1) admins.value[idx] = updated
    ElMessage.success('權限已更新')
    permVisible.value = false
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '更新失敗')
  } finally {
    permLoading.value = false
  }
}

// ── 修改密碼 ──────────────────────────────────────────────────────────────
const pwdVisible = ref(false)
const pwdLoading = ref(false)
const pwdTarget  = ref(null)
const pwdForm    = ref({ newPwd: '', confirmPwd: '' })
const pwdFormRef = ref(null)

const pwdRules = {
  newPwd:     [{ required: true, message: '請填寫新密碼', trigger: 'blur' },
               { min: 6, message: '密碼至少 6 個字元', trigger: 'blur' }],
  confirmPwd: [{ required: true, message: '請再次輸入密碼', trigger: 'blur' },
               {
                 validator: (rule, value, cb) =>
                   value !== pwdForm.value.newPwd ? cb(new Error('兩次密碼不一致')) : cb(),
                 trigger: 'blur',
               }],
}

function openChangePwd(admin) {
  pwdTarget.value  = admin
  pwdForm.value    = { newPwd: '', confirmPwd: '' }
  pwdVisible.value = true
}

async function submitPwd() {
  await pwdFormRef.value.validate()
  pwdLoading.value = true
  try {
    await changeAdminPassword(pwdTarget.value.id, pwdForm.value.newPwd)
    ElMessage.success('密碼已更新')
    pwdVisible.value = false
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '更新失敗')
  } finally {
    pwdLoading.value = false
  }
}

// ── 刪除 ──────────────────────────────────────────────────────────────────
async function handleDelete(admin) {
  if (admin.role === 'super_admin') {
    ElMessage.warning('超級管理員帳號不可被刪除')
    return
  }
  try {
    await ElMessageBox.confirm(
      `確定要刪除管理者「${admin.display_name}（${admin.username}）」嗎？`,
      '刪除確認',
      { confirmButtonText: '確定刪除', cancelButtonText: '取消', type: 'warning' },
    )
    await deleteAdmin(admin.id)
    ElMessage.success('已刪除管理者')
    loadAdmins()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.detail || '刪除失敗')
  }
}

// ── 權限判斷 ──────────────────────────────────────────────────────────────
const canChangePwd = (admin) => auth.isSuperAdmin || admin.username === auth.user?.username
const canDelete    = (admin) => auth.isSuperAdmin && admin.role !== 'super_admin'
const canEditPerm  = (admin) => auth.isSuperAdmin && admin.role !== 'super_admin'

// ── 載入 ──────────────────────────────────────────────────────────────────
async function loadAdmins() {
  loading.value = true
  try {
    admins.value = await fetchAdmins()
  } catch {
    ElMessage.error('載入管理者列表失敗')
  } finally {
    loading.value = false
  }
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

onMounted(loadAdmins)
</script>

<template>
  <div class="admins-page">
    <div class="page-header">
      <h2 class="page-title">管理設定</h2>
      <div class="header-right">
        <el-button v-if="auth.isSuperAdmin" type="primary" size="default" style="font-size:14px" @click="openCreate">
          <el-icon><Plus /></el-icon> 新增管理者
        </el-button>
      </div>
    </div>

    <div v-if="!auth.isSuperAdmin" class="hint-bar">
      <el-icon><InfoFilled /></el-icon>
      只有超級管理員可以新增、刪除管理者或調整其權限
    </div>

    <div class="admin-table-wrap" v-loading="loading" element-loading-background="transparent">
      <table class="admin-table">
        <thead>
          <tr>
            <th>管理者</th>
            <th>帳號</th>
            <th>角色</th>
            <th>可存取功能</th>
            <th>建立日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="admin in admins" :key="admin.id">
            <td>
              <div class="admin-info">
                <div class="admin-avatar" :class="{ super: admin.role === 'super_admin' }">
                  {{ (admin.display_name || admin.username || '?')[0].toUpperCase() }}
                </div>
                <div>
                  <div class="admin-name">
                    {{ admin.display_name }}
                    <el-tag v-if="admin.username === auth.user?.username" type="primary" size="small" style="margin-left:6px">我</el-tag>
                  </div>
                </div>
              </div>
            </td>
            <td class="mono">@{{ admin.username }}</td>
            <td>
              <el-tag
                :type="admin.role === 'super_admin' ? 'warning' : 'info'"
                size="small"
                effect="dark"
              >
                {{ admin.role === 'super_admin' ? '⭐ 超級管理員' : '管理員' }}
              </el-tag>
            </td>
            <td>
              <!-- super_admin 顯示「全部功能」 -->
              <span v-if="admin.role === 'super_admin'" class="all-perm-label">全部功能</span>
              <!-- 一般 admin 顯示各權限標籤 -->
              <div v-else class="perm-tags">
                <span
                  v-for="p in admin.permissions"
                  :key="p"
                  class="perm-tag"
                  :style="{ background: permColor(p) + '22', color: permColor(p), borderColor: permColor(p) + '55' }"
                >
                  {{ permLabel(p) }}
                </span>
                <span v-if="!admin.permissions?.length" class="no-perm">無權限</span>
              </div>
            </td>
            <td>{{ fmtDate(admin.created_at) }}</td>
            <td>
              <div class="actions">
                <el-button
                  v-if="canEditPerm(admin)"
                  size="small" type="primary" plain
                  :icon="SettingIcon"
                  @click="openEditPerm(admin)"
                ><span class="btn-text">權限</span></el-button>
                <el-button
                  size="small" plain
                  :icon="KeyIcon"
                  :disabled="!canChangePwd(admin)"
                  @click="canChangePwd(admin) && openChangePwd(admin)"
                ><span class="btn-text">密碼</span></el-button>
                <el-tooltip :content="'超級管理員不可刪除'" :disabled="admin.role !== 'super_admin'" placement="top">
                  <el-button
                    size="small" type="danger" plain
                    :icon="DeleteIcon"
                    :disabled="!canDelete(admin)"
                    @click="canDelete(admin) && handleDelete(admin)"
                  ><span class="btn-text">刪除</span></el-button>
                </el-tooltip>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && admins.length === 0">
            <td colspan="6" class="empty-row">尚無管理者資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增管理者 dialog -->
    <el-dialog v-model="createVisible" title="新增管理者" width="420px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <el-form-item label="顯示名稱" prop="display_name">
          <el-input v-model="createForm.display_name" placeholder="例：王小明" />
        </el-form-item>
        <el-form-item label="帳號" prop="username">
          <el-input v-model="createForm.username" placeholder="登入用帳號（英數字）" autocomplete="off" />
        </el-form-item>
        <el-form-item label="密碼" prop="password">
          <el-input v-model="createForm.password" type="password" show-password placeholder="至少 6 個字元" autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="確認密碼" prop="confirmPassword">
          <el-input v-model="createForm.confirmPassword" type="password" show-password placeholder="再輸入一次密碼" autocomplete="new-password" />
        </el-form-item>

        <!-- 權限勾選 -->
        <el-form-item label="可存取功能">
          <div class="perm-checklist">
            <label
              v-for="p in ALL_PERMISSIONS" :key="p.key"
              class="perm-check-item"
              :class="{ checked: createForm.permissions.includes(p.key) }"
              :style="createForm.permissions.includes(p.key)
                ? { borderColor: p.color, background: p.color + '22', color: p.color, fontWeight: 700 }
                : {}"
            >
              <input type="checkbox" :value="p.key" v-model="createForm.permissions" />
              <span class="perm-check-icon" :style="createForm.permissions.includes(p.key) ? { background: p.color } : {}">
                <span v-if="createForm.permissions.includes(p.key)">✓</span>
              </span>
              <span class="perm-dot" :style="{ background: p.color }"></span>
              {{ p.label }}
            </label>
          </div>
yj        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="submitCreate">新增</el-button>
      </template>
    </el-dialog>

    <!-- 編輯權限 dialog -->
    <el-dialog
      v-model="permVisible"
      :title="`編輯權限 — ${permTarget?.display_name}`"
      width="360px"
      :close-on-click-modal="false"
    >
      <div class="perm-edit-desc">勾選此管理者可以存取的功能頁面</div>
      <div class="perm-checklist" style="margin-top:12px">
        <label
          v-for="p in ALL_PERMISSIONS" :key="p.key"
          class="perm-check-item"
          :class="{ checked: permForm.includes(p.key) }"
          :style="permForm.includes(p.key)
            ? { borderColor: p.color, background: p.color + '22', color: p.color, fontWeight: 700 }
            : {}"
        >
          <input type="checkbox" :value="p.key" v-model="permForm" />
          <span class="perm-check-icon" :style="permForm.includes(p.key) ? { background: p.color } : {}">
            <span v-if="permForm.includes(p.key)">✓</span>
          </span>
          <span class="perm-dot" :style="{ background: p.color }"></span>
          {{ p.label }}
        </label>
      </div>
      <div class="perm-hint" style="margin-top:10px">已選 {{ permForm.length }} / {{ ALL_PERMISSIONS.length }} 項</div>
      <template #footer>
        <el-button @click="permVisible = false">取消</el-button>
        <el-button type="primary" :loading="permLoading" @click="submitPerm">儲存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密碼 dialog -->
    <el-dialog v-model="pwdVisible" :title="`修改密碼 — ${pwdTarget?.display_name}`" width="360px" :close-on-click-modal="false">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-position="top">
        <el-form-item label="新密碼" prop="newPwd">
          <el-input v-model="pwdForm.newPwd" type="password" show-password placeholder="至少 6 個字元" autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="確認新密碼" prop="confirmPwd">
          <el-input v-model="pwdForm.confirmPwd" type="password" show-password placeholder="再輸入一次" autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdLoading" @click="submitPwd">更新密碼</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admins-page { flex: 1; background: var(--bg-app); transition: background .2s; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px; flex-wrap: wrap; gap: 12px;
}
.header-right { display: flex; align-items: center; gap: 8px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; transition: color .2s; }

.hint-bar {
  display: flex; align-items: center; gap: 8px;
  margin: 0 24px 16px; padding: 10px 14px; border-radius: 10px;
  background: rgba(59,130,246,0.1); color: #93c5fd; font-size: 16px;
  border: 1px solid rgba(59,130,246,0.2);
}

.admin-table-wrap {
  margin: 0 24px 24px;
  background: var(--bg-card); border-radius: 12px; overflow: hidden;
  border: 1px solid var(--border-color);
  transition: background .2s, border-color .2s;
}
.admin-table { width: 100%; border-collapse: collapse; font-size: 16px; }
.admin-table thead tr { background: var(--bg-inner); }
.admin-table th {
  padding: 12px 16px; text-align: left; color: var(--text-secondary);
  font-weight: 600; font-size: 16px; letter-spacing: .05em; text-transform: uppercase;
  border-bottom: 1px solid var(--border-color);
}
.admin-table tbody tr { border-bottom: 1px solid var(--divider); transition: background .15s; }
.admin-table tbody tr:last-child { border-bottom: none; }
.admin-table tbody tr:hover { background: var(--bg-inner); }
.admin-table td { padding: 12px 16px; color: var(--text-secondary); vertical-align: middle; }

.admin-info { display: flex; align-items: center; gap: 12px; }
.admin-avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.admin-avatar.super { background: linear-gradient(135deg, #f59e0b, #d97706); }
.admin-name { font-weight: 600; color: var(--text-primary); display: flex; align-items: center; }

.mono { font-family: monospace; font-size: 16px; color: var(--text-secondary); }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.empty-row { text-align: center; color: var(--text-muted); padding: 40px !important; }

/* ── 權限標籤 ── */
.all-perm-label {
  font-size: 16px; font-weight: 600;
  color: #f59e0b; letter-spacing: .02em;
}
.perm-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.perm-tag {
  font-size: 16px; font-weight: 600;
  border: 1px solid; border-radius: 6px;
  padding: 2px 7px; white-space: nowrap;
}
.no-perm { font-size: 16px; color: var(--text-muted); }

/* ── 權限勾選清單 ── */
.perm-checklist {
  display: flex; flex-direction: column; gap: 8px;
}
.perm-check-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  border: 1.5px solid var(--border-color);
  cursor: pointer; font-size: 16px; font-weight: 500;
  color: var(--text-secondary);
  transition: border-color .15s, background .15s, color .15s;
  user-select: none;
}
.perm-check-item:hover {
  border-color: var(--text-muted);
  background: var(--bg-inner);
}
.perm-check-item input[type="checkbox"] { display: none; }

.perm-check-icon {
  width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
  border: 1.5px solid var(--border-color);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 900; color: #fff;
  transition: background .15s, border-color .15s;
}

.perm-dot {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
}
.perm-hint { font-size: 16px; color: var(--text-muted); margin-top: 6px; }
.perm-edit-desc { font-size: 16px; color: var(--text-secondary); }

@media (max-width: 768px) {
  .page-header { padding: 16px 16px 12px; }
  .page-title { font-size: 17px; }
  .hint-bar { margin: 0 16px 12px; font-size: 16px; }
  .admin-table-wrap { margin: 0 16px 16px; overflow-x: auto; }
  .admin-table { min-width: 620px; font-size: 16px; }
  .admin-table th, .admin-table td { padding: 10px 12px; }
}

@media (max-width: 375px) {
  .page-header { padding: 12px 12px 10px; }
  .hint-bar { margin: 0 12px 10px; }
  .admin-table-wrap { margin: 0 12px 12px; }
}
</style>
