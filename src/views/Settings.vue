<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSettings, updateSettings } from '@/api/http.js'
import { ElMessage } from 'element-plus'

const router  = useRouter()
const loading = ref(false)
const saving  = ref(false)

const form = ref({
  gps_enabled:   true,
  office_lat:    23.4617157,
  office_lng:    120.2494022,
  office_radius_m: 200,
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await fetchSettings()
    form.value = { ...data }
  } catch {
    ElMessage.error('載入設定失敗')
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  try {
    const data = await updateSettings(form.value)
    form.value = { ...data }
    ElMessage.success('設定已儲存')
  } catch {
    ElMessage.error('儲存失敗')
  } finally {
    saving.value = false
  }
}

function openMap() {
  const url = `https://www.google.com/maps?q=${form.value.office_lat},${form.value.office_lng}`
  window.open(url, '_blank')
}
</script>

<template>
  <div class="settings-page" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="router.push({ name: 'dashboard' })">← 回首頁</button>
        <h2 class="page-title">系統設定</h2>
      </div>
    </div>

    <div class="card-wrap">

      <!-- GPS 開關 -->
      <div class="section-card">
        <div class="section-title">GPS 打卡限制</div>
        <div class="section-desc">開啟後，員工須在指定範圍內才能打卡</div>
        <div class="toggle-row">
          <span class="toggle-label">{{ form.gps_enabled ? '已開啟' : '已關閉' }}</span>
          <el-switch
            v-model="form.gps_enabled"
            :active-color="'#10b981'"
            :inactive-color="'#94a3b8'"
            size="large"
          />
        </div>
      </div>

      <!-- 位置設定 -->
      <div class="section-card" :class="{ disabled: !form.gps_enabled }">
        <div class="section-title">辦公室位置</div>
        <div class="section-desc">設定允許打卡的中心點座標</div>

        <div class="field-row">
          <div class="field">
            <label>緯度（Latitude）</label>
            <el-input
              v-model.number="form.office_lat"
              type="number"
              placeholder="23.4617157"
              :disabled="!form.gps_enabled"
            />
          </div>
          <div class="field">
            <label>經度（Longitude）</label>
            <el-input
              v-model.number="form.office_lng"
              type="number"
              placeholder="120.2494022"
              :disabled="!form.gps_enabled"
            />
          </div>
        </div>

        <button
          class="map-btn"
          @click="openMap"
          :disabled="!form.gps_enabled"
        >
          在 Google Maps 確認位置 ↗
        </button>
      </div>

      <!-- 半徑設定 -->
      <div class="section-card" :class="{ disabled: !form.gps_enabled }">
        <div class="section-title">允許打卡半徑</div>
        <div class="section-desc">距離辦公室幾公尺內視為有效打卡</div>

        <div class="radius-row">
          <el-slider
            v-model="form.office_radius_m"
            :min="50"
            :max="1000"
            :step="10"
            :disabled="!form.gps_enabled"
            :marks="{
              50: '50m',
              200: '200m',
              500: '500m',
              1000: '1km',
            }"
            show-stops
          />
          <div class="radius-value">{{ form.office_radius_m }} 公尺</div>
        </div>
      </div>

      <!-- 儲存 -->
      <el-button
        type="primary"
        size="large"
        :loading="saving"
        @click="save"
        class="save-btn"
      >
        儲存設定
      </el-button>

    </div>
  </div>
</template>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: #0f172a;
  padding: 32px 36px;
  box-sizing: border-box;
}
.page-header {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 24px;
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

.card-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 640px;
}

.section-card {
  background: #1e293b;
  border-radius: 14px;
  padding: 20px 24px;
  border: 1px solid rgba(255,255,255,0.08);
  transition: opacity .2s;
}
.section-card.disabled { opacity: 0.45; pointer-events: none; }

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 4px;
}
.section-desc {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 16px;
}

/* GPS 開關 */
.toggle-row {
  display: flex; align-items: center;
  justify-content: space-between;
}
.toggle-label { font-size: 14px; color: #94a3b8; font-weight: 500; }

/* 位置輸入 */
.field-row { display: flex; gap: 12px; margin-bottom: 12px; }
.field { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: #94a3b8; font-weight: 500; }

.map-btn {
  background: transparent;
  border: 1px solid rgba(59,130,246,0.4);
  color: #60a5fa;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s;
}
.map-btn:hover { background: rgba(59,130,246,0.1); }
.map-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 半徑 slider */
.radius-row { padding: 0 8px; }
.radius-value {
  text-align: right;
  font-size: 20px;
  font-weight: 800;
  color: #10b981;
  margin-top: 24px;
}

/* 儲存按鈕 */
.save-btn { width: 100%; margin-top: 4px; }

/* RWD */
@media (max-width: 768px) {
  .settings-page { padding: 20px 14px 100px; }
  .page-title { font-size: 17px; }
  .field-row { flex-direction: column; }
}
@media (max-width: 375px) {
  .settings-page { padding: 16px 10px 100px; }
}
</style>
