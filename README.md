# CheckIn Admin — 管理後台

LINE 打卡系統的管理後台，提供出勤管理、補打卡/請假審核、員工管理、排班、薪資等功能。

## 技術棧

- Vue 3 + Composition API（JavaScript）
- Vite / Element Plus / Pinia / Vue Router（Hash History）/ Axios

## 快速開始

```bash
npm install
npm run dev     # 開發：http://localhost:5174
npm run build   # 打包
```

## 環境變數

複製 `.env.example` 為 `.env`：

```
VITE_API_BASE=http://localhost:8000/api/v1
```

## 頁面路由

### 出勤管理

| 路徑 | 說明 |
|------|------|
| `/dashboard` | 每日出勤總覽 |
| `/attendance-list` | 出勤紀錄（月份） |
| `/override-records` | 補打卡紀錄 |
| `/punch-requests` | 申請打卡列表（員工申請 → 審核） |
| `/anomaly-report` | 打卡異常報告 |
| `/export` | 出勤匯出 |

### 員工管理

| 路徑 | 說明 |
|------|------|
| `/employees` | 員工列表 |
| `/positions` | 職位設定 |
| `/leave-types` | 假別設定 |
| `/salary-config` | 薪資設定 |
| `/leave-requests` | 申請請假列表（員工申請 → 審核） |

### 其他

| 路徑 | 說明 |
|------|------|
| `/schedule` | 排班管理 |
| `/payroll` | 薪資報表 |
| `/payroll-export` | 薪資匯出 |
| `/settings` | GPS / IP 打卡設定 |
| `/admins` | 管理員帳號（super_admin 限定） |

## 登入

首次啟動後端後，依 `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` 自動建立超級管理員帳號。

## 一鍵 Commit & Push

```bash
bash commit.sh
bash commit.sh "自訂訊息"
```
