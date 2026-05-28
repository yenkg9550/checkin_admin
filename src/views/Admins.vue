<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdmins, createAdmin, deleteAdmin, changeAdminPassword } from '@/api/http.js'
import { useAuthStore } from '@/stores/auth.js'

const auth   = useAuthStore()

const admins  = ref([])
const loading = ref(false)

// ── 新增管理者 ────────────────────────────────────────────────────────────
const createVisible = ref(false)
const createLoading = ref(false)
const createForm    = ref({ username: '', password: '', confirmPassword: '', display_name: '' })
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
  createForm.value = { username: '', password: '', confirmPassword: '', display_name: '' }
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
        <el-button v-if="auth.isSuperAdmin" type="primary" size="default" @click="openCreate">
          <el-icon><Plus /></el-icon> 新增管理者
        </el-button>
      </div>
    </div>

    <div v-if="!auth.isSuperAdmin" class="hint-bar">
      <el-icon><InfoFilled /></el-icon>
      只有超級管理員可以新增或刪除管理者帳號
    </div>

    <div class="admin-table-wrap" v-loading="loading" element-loading-background="transparent">
      <table class="admin-table">
        <thead>
          <tr>
            <th>管理者</th>
            <th>帳號</th>
            <th>角色</th>
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
            <td>{{ fmtDate(admin.created_at) }}</td>
            <td>
              <div class="actions">
                <el-button
                  size="small" plain
                  :disabled="!canChangePwd(admin)"
                  @click="canChangePwd(admin) && openChangePwd(admin)"
                >
                  修改密碼
                </el-button>
                <el-tooltip :content="admin.role === 'super_admin' ? '超級管理員不可刪除' : ''" placement="top">
                  <el-button
                    size="small" type="danger" plain
                    :disabled="!canDelete(admin)"
                    @click="canDelete(admin) && handleDelete(admin)"
                  >
                    刪除
                  </el-button>
                </el-tooltip>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && admins.length === 0">
            <td colspan="5" class="empty-row">尚無管理者資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增管理者 dialog -->
    <el-dialog v-model="createVisible" title="新增管理者" width="400px" :close-on-click-modal="false">
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
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="submitCreate">新增</el-button>
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
.admins-page { flex: 1; background: #0f172a; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px; flex-wrap: wrap; gap: 12px;
}
.header-right { display: flex; align-items: center; gap: 8px; }

.page-title { font-size: 20px; font-weight: 700; color: #f1f5f9; margin: 0; }

.hint-bar {
  display: flex; align-items: center; gap: 8px;
  margin: 0 24px 16px; padding: 10px 14px; border-radius: 10px;
  background: rgba(59,130,246,0.1); color: #93c5fd; font-size: 15px;
  border: 1px solid rgba(59,130,246,0.2);
}

.admin-table-wrap {
  margin: 0 24px 24px;
  background: #1e293b; border-radius: 12px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}
.admin-table { width: 100%; border-collapse: collapse; font-size: 16px; }
.admin-table thead tr { background: #0f172a; }
.admin-table th {
  padding: 12px 16px; text-align: left; color: #64748b;
  font-weight: 600; font-size: 13px; letter-spacing: .05em; text-transform: uppercase;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.admin-table tbody tr { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background .15s; }
.admin-table tbody tr:last-child { border-bottom: none; }
.admin-table tbody tr:hover { background: rgba(255,255,255,0.03); }
.admin-table td { padding: 12px 16px; color: #cbd5e1; vertical-align: middle; }

.admin-info { display: flex; align-items: center; gap: 12px; }
.admin-avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.admin-avatar.super { background: linear-gradient(135deg, #f59e0b, #d97706); }
.admin-name { font-weight: 600; color: #e2e8f0; display: flex; align-items: center; }

.mono { font-family: monospace; font-size: 13px; color: #64748b; }
.actions { display: flex; gap: 8px; }
.empty-row { text-align: center; color: #475569; padding: 40px !important; }
</style>
