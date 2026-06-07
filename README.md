# CheckIn Admin — 管理後台

LINE 打卡系統的管理後台，使用 Vue 3 + Element Plus，提供出勤管理、員工管理、系統設定與管理員帳號管理功能。

## 技術棧

- Vue 3 + Composition API（JavaScript）
- Vite
- Element Plus
- Pinia
- Vue Router（Hash History）
- Axios

## 快速開始

```bash
npm install
npm run dev     # 開發：http://localhost:5174
npm run build   # 打包
npm run preview # 預覽打包結果
```

## 環境變數

在根目錄建立 `.env` 檔：

```
VITE_API_BASE=http://localhost:8000/api/v1
```

## 頁面路由

| 路徑 | 頁面 | 說明 |
|------|------|------|
| `/dashboard` | Dashboard | 每日出勤總覽 |
| `/employees` | Employees | 員工管理 |
| `/settings` | Settings | 系統設定（GPS、打卡範圍） |
| `/admins` | Admins | 管理員帳號管理 |

## 登入帳號

後端首次啟動時會依 `.env` 的 `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` 自動建立超級管理員帳號。


## 一鍵 Commit 與自動推送

```bash
# 自動偵測變動檔案、產生 commit message，並 git push
bash commit.sh

# 使用自訂 commit message
bash commit.sh "feat(admins): 新增管理員管理頁面"
```

腳本會自動：
1. 若尚未 `git init` 則自動初始化
2. `git add -A` 加入所有變動
3. 依變動的檔案路徑（views、stores、api、router 等）自動產生 commit message
4. `git commit`
5. 若已設定 remote origin 則自動 `git push`
