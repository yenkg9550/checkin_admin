<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit as EditIcon, Delete as DeleteIcon } from '@element-plus/icons-vue'
import {
  fetchPositions, createPosition, updatePosition, deletePosition,
  fetchLeaveTypes,
} from '@/api/http.js'

const positions  = ref([])
const leaveTypes = ref([])
const loading    = ref(false)

// Dialog
const dialogVisible = ref(false)
const editTarget    = ref(null)
const saving        = ref(false)
const activeTab     = ref('basic')

const DEFAULT_FORM = () => ({
  name: '',
  description: '',
  pay_type: 'monthly',
  base_salary: 0,
  overtime_mode: 'none',
  overtime_threshold_hours: 8,
  overtime_min_minutes: 0,
  overtime_rate: 1.5,
  deduction_type: 'none',
  deduction_per_minute: 1,
  deduction_fixed: 1,
  holiday_mode: 'none',
  holiday_rate: 2.0,
  monthly_work_hours: 174,
  leave_type_ids: [],
})
const form = reactive(DEFAULT_FORM())

onMounted(async () => {
  loading.value = true
  try {
    [positions.value, leaveTypes.value] = await Promise.all([fetchPositions(), fetchLeaveTypes()])
  } catch { ElMessage.error('載入資料失敗') }
  finally { loading.value = false }
})

function openAdd() {
  editTarget.value = null
  Object.assign(form, DEFAULT_FORM())
  activeTab.value = 'basic'
  dialogVisible.value = true
}

function openEdit(pos) {
  editTarget.value = pos
  Object.assign(form, { ...pos })
  form.overtime_mode = (pos.overtime_rate === 0) ? 'none' : 'custom'
  form.holiday_mode  = (pos.holiday_rate  === 0) ? 'none' : 'custom'
  activeTab.value = 'basic'
  dialogVisible.value = true
}

async function submit() {
  if (!form.name.trim()) { ElMessage.warning('請填寫職位名稱'); return }
  saving.value = true
  try {
    const payload = { ...form }
    if (payload.overtime_mode === 'none') payload.overtime_rate = 0
    if (payload.holiday_mode  === 'none') payload.holiday_rate  = 0
    if (editTarget.value) {
      const updated = await updatePosition(editTarget.value.id, payload)
      const idx = positions.value.findIndex(p => p.id === editTarget.value.id)
      if (idx !== -1) positions.value[idx] = updated
      ElMessage.success('職位已更新')
    } else {
      const created = await createPosition(payload)
      positions.value.push(created)
      ElMessage.success('職位已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '操作失敗')
  } finally {
    saving.value = false
  }
}

async function remove(pos) {
  await ElMessageBox.confirm(`確定刪除職位「${pos.name}」？相關員工的職位將被清除。`, '確認', { type: 'warning' })
  try {
    await deletePosition(pos.id)
    positions.value = positions.value.filter(p => p.id !== pos.id)
    ElMessage.success('已刪除')
  } catch { ElMessage.error('刪除失敗') }
}

function ltName(id) {
  return leaveTypes.value.find(l => l.id === id)?.name ?? id
}
function ltColor(id) {
  return leaveTypes.value.find(l => l.id === id)?.color ?? '#ccc'
}
function payTypeLabel(t) {
  return t === 'monthly' ? '月薪' : '時薪'
}
</script>

<template>
  <div class="positions-page">
    <div class="page-header">
      <h2 class="page-title">職位設定</h2>
    </div>

    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增職位</el-button>
    </div>

    <div v-loading="loading" class="card-list">
      <div v-for="pos in positions" :key="pos.id" class="pos-card">
        <div class="pos-main">
          <div class="pos-name">{{ pos.name }}</div>
          <div class="pos-meta">
            <el-tag size="small" type="primary" effect="plain">{{ payTypeLabel(pos.pay_type) }}</el-tag>
            <span class="pos-salary">底薪 {{ pos.base_salary.toLocaleString() }} 元</span>
            <span v-if="pos.description" class="pos-desc">{{ pos.description }}</span>
          </div>
          <div v-if="pos.leave_type_ids?.length" class="pos-leaves">
            <span
              v-for="id in pos.leave_type_ids" :key="id"
              class="lt-dot"
              :style="{ background: ltColor(id) }"
              :title="ltName(id)"
            ></span>
            <span class="lt-names">{{ pos.leave_type_ids.map(ltName).join('、') }}</span>
          </div>
          <div v-else class="pos-no-leave"></div>
        </div>
        <div class="pos-actions">
          <el-button size="small" type="primary" :icon="EditIcon" @click="openEdit(pos)"><span class="btn-text">編輯</span></el-button>
          <el-button size="small" type="danger"  :icon="DeleteIcon" @click="remove(pos)"><span class="btn-text">刪除</span></el-button>
        </div>
      </div>

      <div v-if="!loading && !positions.length" class="empty">
        <p>尚未設定任何職位</p>
      </div>
    </div>

    <!-- Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editTarget ? `編輯職位：${editTarget.name}` : '新增職位'"
      width="560px"
      class="pos-dialog"
    >
      <el-tabs v-model="activeTab">

        <!-- 基本資訊 -->
        <el-tab-pane label="基本資訊" name="basic">
          <el-form :model="form" label-width="120px" size="default" style="margin-top:8px">
            <el-form-item label="職位名稱">
              <el-input v-model="form.name" placeholder="例：店長、正職員工、兼職" />
            </el-form-item>
            <el-form-item label="備註說明">
              <el-input v-model="form.description" type="textarea" :rows="2" placeholder="選填" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 薪資預設 -->
        <el-tab-pane label="薪資預設" name="salary">
          <el-form :model="form" label-width="140px" size="default" style="margin-top:8px">
            <el-form-item label="薪資類型">
              <el-radio-group v-model="form.pay_type">
                <el-radio value="monthly">月薪</el-radio>
                <el-radio value="hourly">時薪</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="底薪">
              <el-input-number v-model="form.base_salary" :min="0" :step="1000" style="width:160px" />
              <span class="unit">元</span>
            </el-form-item>
            <el-form-item label="加班計算">
              <el-switch v-model="form.overtime_mode" active-value="custom" inactive-value="none" />
            </el-form-item>
            <template v-if="form.overtime_mode === 'custom'">
              <el-form-item label="加班門檻">
                <el-input-number v-model="form.overtime_threshold_hours" :min="0" :step="0.5" style="width:130px" />
                <span class="unit">小時 / 天</span>
              </el-form-item>
              <el-form-item label="最低起算">
                <el-input-number v-model="form.overtime_min_minutes" :min="0" :max="120" :step="5" style="width:130px" />
                <span class="unit">分鐘（0 = 立即起算）</span>
              </el-form-item>
              <el-form-item label="加班倍率">
                <el-input-number v-model="form.overtime_rate" :min="1" :step="0.25" :precision="2" style="width:120px" />
                <span class="unit">倍</span>
              </el-form-item>
            </template>
            <el-form-item label="特別假日加給">
              <el-switch v-model="form.holiday_mode" active-value="custom" inactive-value="none" />
            </el-form-item>
            <el-form-item v-if="form.holiday_mode === 'custom'" label="特別假日倍率">
              <el-input-number v-model="form.holiday_rate" :min="1" :step="0.25" :precision="2" style="width:120px" />
              <span class="unit">倍</span>
            </el-form-item>

            <el-form-item label="啟用扣款">
              <el-switch
                :model-value="form.deduction_type !== 'none'"
                @change="v => form.deduction_type = v ? 'per_minute' : 'none'"
              />
            </el-form-item>
            <template v-if="form.deduction_type !== 'none'">
              <el-form-item label="扣款方式">
                <el-select v-model="form.deduction_type" style="width:160px">
                  <el-option label="按分鐘扣" value="per_minute" />
                  <el-option label="固定金額" value="fixed" />
                  <el-option label="兩者並用" value="both" />
                </el-select>
              </el-form-item>
              <el-form-item label="每分鐘扣款" v-if="form.deduction_type !== 'fixed'">
                <el-input-number v-model="form.deduction_per_minute" :min="1" :precision="0" style="width:130px" />
                <span class="unit">元 / 分鐘</span>
              </el-form-item>
              <el-form-item label="固定扣款" v-if="form.deduction_type !== 'per_minute'">
                <el-input-number v-model="form.deduction_fixed" :min="1" style="width:130px" />
                <span class="unit">元 / 次</span>
              </el-form-item>
            </template>
          </el-form>
        </el-tab-pane>

        <!-- 預設假別 -->
        <el-tab-pane label="預設假別" name="leaves">
          <div style="padding: 12px 0 4px; font-size:14px; color:var(--text-muted)">
            選取的假別會作為此職位的預設假別，指派員工時可一鍵套用。
          </div>
          <div class="lt-grid">
            <div
              v-for="lt in leaveTypes" :key="lt.id"
              class="lt-chip"
              :class="{ active: form.leave_type_ids.includes(lt.id) }"
              @click="
                form.leave_type_ids.includes(lt.id)
                  ? form.leave_type_ids.splice(form.leave_type_ids.indexOf(lt.id), 1)
                  : form.leave_type_ids.push(lt.id)
              "
            >
              <span class="chip-dot" :style="{ background: lt.color }"></span>
              {{ lt.name }}
              <span v-if="form.leave_type_ids.includes(lt.id)" class="chip-check">✓</span>
            </div>
            <div v-if="!leaveTypes.length" style="color:var(--text-muted);font-size:15px">
              尚未建立任何假別，請先至「假別設定」新增。
            </div>
          </div>
        </el-tab-pane>

      </el-tabs>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.positions-page {
  flex: 1;
  padding: 28px 32px;
  background: var(--bg-app);
  transition: background .2s;
}
.page-header { margin-bottom: 16px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
.toolbar     { margin-bottom: 16px; }

.card-list { display: flex; flex-direction: column; gap: 10px; max-width: 680px; }

.pos-card {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 14px; padding: 16px 18px;
  transition: background .2s, border-color .2s;
}
.pos-main { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.pos-name { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.pos-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pos-salary { font-size: 15px; color: var(--text-secondary); }
.pos-desc   { font-size: 14px; color: var(--text-muted); }
.pos-leaves { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.lt-dot     { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.lt-names   { font-size: 14px; color: var(--text-muted); }
.pos-no-leave { font-size: 14px; color: var(--text-muted); }
.pos-actions { display: flex; gap: 6px; flex-shrink: 0; }

.empty { text-align: center; color: var(--text-muted); padding: 40px; font-size: 16px; }

/* form */
.unit { margin-left: 8px; font-size: 14px; color: var(--text-muted); }

/* leave type chips */
.lt-grid { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 10px; }
.lt-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px;
  font-size: 15px; font-weight: 600;
  cursor: pointer; user-select: none;
  border: 1.5px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--bg-inner);
  transition: all .15s;
}
.lt-chip:hover { border-color: #3b82f6; color: #3b82f6; }
.lt-chip.active { background: rgba(59,130,246,0.12); border-color: #3b82f6; color: #3b82f6; }
.chip-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.chip-check { font-size: 13px; margin-left: 2px; }

:deep(.el-dialog) { background: var(--bg-card); border: 1px solid var(--border-color); }
:deep(.el-dialog__title) { color: var(--text-primary); }
:deep(.el-form-item__label) { color: var(--text-primary); }
:deep(.el-radio__label) { color: var(--text-primary); }
:deep(.el-input__wrapper) { background: var(--bg-inner) !important; box-shadow: 0 0 0 1px var(--border-color) !important; }
:deep(.el-input__inner) { color: var(--text-primary) !important; }
:deep(.el-textarea__inner) { background: var(--bg-inner) !important; color: var(--text-primary) !important; box-shadow: 0 0 0 1px var(--border-color) !important; }

@media (max-width: 768px) {
  .positions-page { padding: 20px 14px 100px; }
  .pos-actions { flex-direction: column; }
  .pos-dialog :deep(.el-dialog) {
    width: 92vw !important; max-height: 85dvh !important;
    display: flex !important; flex-direction: column !important;
  }
  .pos-dialog :deep(.el-dialog__body) { overflow-y: auto !important; flex: 1 !important; }
}
</style>
