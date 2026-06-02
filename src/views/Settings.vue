<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchSettings, updateSettings } from '@/api/http.js'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const saving  = ref(false)

const form = ref({
  check_mode:      'gps',
  gps_enabled:     true,
  office_lat:      23.4617157,
  office_lng:      120.2494022,
  office_radius_m: 200,
  ip_enabled:      false,
  allowed_ips:     '',
})

const newIp     = ref('')
const ipList    = computed(() => form.value.allowed_ips ? form.value.allowed_ips.split(',').map(s => s.trim()).filter(Boolean) : [])
const showGps   = computed(() => ['gps', 'both'].includes(form.value.check_mode))
const showIp    = computed(() => ['ip', 'both'].includes(form.value.check_mode))

const modeOptions = [
  { value: 'gps',  label: 'GPS 定位',    desc: '員工須在指定範圍內才能打卡' },
  { value: 'ip',   label: 'IP / WiFi',   desc: '員工須在公司網路下才能打卡' },
  { value: 'both', label: 'GPS 或 IP',   desc: 'GPS 位置或公司網路符合其一即可' },
  { value: 'free', label: '不限制',       desc: '任何地點皆可打卡' },
]

onMounted(async () => {
  loading.value = true
  try {
    const data = await fetchSettings()
    form.value = {
      check_mode:      data.check_mode      ?? 'gps',
      gps_enabled:     data.gps_enabled     ?? true,
      office_lat:      data.office_lat      ?? 23.4617157,
      office_lng:      data.office_lng      ?? 120.2494022,
      office_radius_m: data.office_radius_m ?? 200,
      ip_enabled:      data.ip_enabled      ?? false,
      allowed_ips:     data.allowed_ips     ?? '',
    }
  } catch {
    ElMessage.error('載入設定失敗')
  } finally {
    loading.value = false
  }
})

function addIp() {
  const ip = newIp.value.trim()
  if (!ip) return
  const list = ipList.value
  if (list.includes(ip)) { ElMessage.warning('該 IP 已存在'); return }
  form.value.allowed_ips = [...list, ip].join(',')
  newIp.value = ''
}

function removeIp(ip) {
  form.value.allowed_ips = ipList.value.filter(i => i !== ip).join(',')
}

function openMap() {
  window.open(`https://www.google.com/maps?q=${form.value.office_lat},${form.value.office_lng}`, '_blank')
}

async function save() {
  saving.value = true
  try {
    const data = await updateSettings(form.value)
    form.value = {
      check_mode:      data.check_mode      ?? 'gps',
      gps_enabled:     data.gps_enabled,
      office_lat:      data.office_lat,
      office_lng:      data.office_lng,
      office_radius_m: data.office_radius_m,
      ip_enabled:      data.ip_enabled      ?? false,
      allowed_ips:     data.allowed_ips     ?? '',
    }
    ElMessage.success('設定已儲存')
  } catch {
    ElMessage.error('儲存失敗')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="settings-page" v-loading="loading" element-loading-background="transparent">
    <div class="page-header">
      <h2 class="page-title">打卡設定</h2>
    </div>

    <div class="card-wrap">

      <!-- 打卡模式 -->
      <div class="section-card">
        <div class="section-title">打卡驗證方式</div>
        <div class="section-desc">選擇員工打卡時的位置驗證方式</div>
        <div class="mode-grid">
          <div
            v-for="opt in modeOptions" :key="opt.value"
            class="mode-card"
            :class="{ selected: form.check_mode === opt.value }"
            @click="form.check_mode = opt.value"
          >
            <div class="mode-label">{{ opt.label }}</div>
            <div class="mode-desc">{{ opt.desc }}</div>
          </div>
        </div>
      </div>

      <!-- GPS 設定 -->
      <template v-if="showGps">
        <div class="section-card">
          <div class="section-title">辦公室位置</div>
          <div class="section-desc">設定允許打卡的中心點座標</div>
          <div class="field-row">
            <div class="field">
              <label>緯度（Latitude）</label>
              <el-input v-model.number="form.office_lat" type="number" placeholder="23.4617157" />
            </div>
            <div class="field">
              <label>經度（Longitude）</label>
              <el-input v-model.number="form.office_lng" type="number" placeholder="120.2494022" />
            </div>
          </div>
          <button class="map-btn" @click="openMap">在 Google Maps 確認位置 ↗</button>
        </div>

        <div class="section-card">
          <div class="section-title">允許打卡半徑</div>
          <div class="section-desc">距離辦公室幾公尺內視為有效打卡</div>
          <div class="radius-row">
            <el-slider
              v-model="form.office_radius_m"
              :min="50" :max="1000" :step="10"
              :marks="{ 50: '50m', 200: '200m', 500: '500m', 1000: '1km' }"
              show-stops
            />
            <div class="radius-value">{{ form.office_radius_m }} 公尺</div>
          </div>
        </div>
      </template>

      <!-- IP 設定 -->
      <template v-if="showIp">
        <div class="section-card">
          <div class="section-title">允許打卡的 IP 白名單</div>
          <div class="section-desc">員工須從以下 IP 連線才能打卡，支援單一 IP 或 CIDR 格式（如 192.168.1.0/24）</div>

          <div class="ip-input-row">
            <el-input
              v-model="newIp"
              placeholder="192.168.1.100 或 192.168.1.0/24"
              style="flex:1"
              @keyup.enter="addIp"
            />
            <el-button type="primary" @click="addIp">新增</el-button>
          </div>

          <div v-if="ipList.length" class="ip-list">
            <div v-for="ip in ipList" :key="ip" class="ip-tag">
              <span>{{ ip }}</span>
              <el-icon class="ip-remove" @click="removeIp(ip)"><Close /></el-icon>
            </div>
          </div>
          <div v-else class="ip-empty">尚未設定任何 IP，員工將無法透過 IP 方式打卡</div>
        </div>
      </template>

      <!-- 不限制提示 -->
      <div v-if="form.check_mode === 'free'" class="section-card free-notice">
        <el-icon size="20" color="#f59e0b"><WarningFilled /></el-icon>
        <span>目前設定為不限制，員工可在任何地點打卡</span>
      </div>

      <!-- 儲存 -->
      <el-button type="primary" size="large" :loading="saving" @click="save" class="save-btn">
        儲存設定
      </el-button>

    </div>
  </div>
</template>

<style scoped>
.settings-page {
  flex: 1;
  background: var(--bg-app);
  padding: 28px 32px;
  box-sizing: border-box;
  transition: background .2s;
}
.page-header { margin-bottom: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

.card-wrap { display: flex; flex-direction: column; gap: 16px; max-width: 640px; }

.section-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 20px 24px;
  border: 1px solid var(--border-color);
  transition: background .2s, border-color .2s;
}

.section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.section-desc  { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; }

/* 模式選擇 */
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.mode-card {
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.mode-card:hover { border-color: #60a5fa; background: rgba(59,130,246,.05); }
.mode-card.selected { border-color: #3b82f6; background: rgba(59,130,246,.08); }
.mode-label { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.mode-desc  { font-size: 13px; color: var(--text-muted); }
.mode-card.selected .mode-label { color: #3b82f6; }

/* GPS */
.field-row { display: flex; gap: 12px; margin-bottom: 12px; }
.field { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 14px; color: var(--text-muted); font-weight: 500; }

.map-btn {
  background: #3b82f6; border: none; color: #fff;
  padding: 10px 20px; border-radius: 8px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background .15s;
}
.map-btn:hover { background: #2563eb; }

.radius-row { padding: 0 8px; }
.radius-value { text-align: right; font-size: 20px; font-weight: 800; color: #10b981; margin-top: 24px; }

/* IP */
.ip-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
.ip-list { display: flex; flex-wrap: wrap; gap: 8px; }
.ip-tag {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--bg-inner); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 5px 10px;
  font-size: 14px; color: var(--text-primary);
}
.ip-remove { cursor: pointer; color: var(--text-muted); transition: color .15s; }
.ip-remove:hover { color: #f56c6c; }
.ip-empty { font-size: 14px; color: var(--text-muted); padding: 8px 0; }

/* 不限制提示 */
.free-notice {
  display: flex; align-items: center; gap: 10px;
  color: #f59e0b; font-size: 14px; font-weight: 500;
  border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.05) !important;
}

.save-btn { width: 100%; margin-top: 4px; }

:deep(.el-input__wrapper) { background: var(--bg-inner) !important; box-shadow: 0 0 0 1px var(--border-color) !important; }
:deep(.el-input__inner)   { color: var(--text-primary) !important; }

@media (max-width: 768px) {
  .settings-page { padding: 16px 14px 100px; }
  .card-wrap { max-width: 100%; }
  .section-card { padding: 16px; }
  .mode-grid { grid-template-columns: 1fr 1fr; }
  .field-row { flex-direction: column; }
}
</style>
