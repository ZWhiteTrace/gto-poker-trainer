# GTO Poker Trainer - 部署指南

## 正式環境

| 服務 | 域名 |
|------|------|
| Frontend | https://grindgto.com |
| API | https://api.grindgto.com |

## 架構概覽

```
┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│     Railway     │
│   (Next.js)     │     │   (FastAPI)     │
│  grindgto.com   │     │api.grindgto.com │
└─────────────────┘     └─────────────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
            ┌─────────────┐
            │  Supabase   │
            │  (Auth/DB)  │
            └─────────────┘
```

## 步驟 1: 部署 FastAPI 到 Railway

1. 前往 [Railway](https://railway.app/) 並用 GitHub 登入

2. 點擊 **New Project** → **Deploy from GitHub repo**

3. 選擇 `gto-poker-trainer` 倉庫

4. 配置部署：
   - **Root Directory**: `apps/api`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

5. 部署完成後，記下你的 Railway URL（例如 `https://gto-api-xxx.railway.app`）

## 步驟 2: 部署 Next.js 到 Vercel

1. 前往 [Vercel](https://vercel.com/) 並用 GitHub 登入

2. 點擊 **Add New** → **Project**

3. 導入 `gto-poker-trainer` 倉庫

4. 配置部署：
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`

5. 設置環境變數：
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app
   NEXT_PUBLIC_SUPABASE_URL=你的 Supabase URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase Anon Key
   ```

6. 點擊 **Deploy**

7. 部署後驗證：
   - `/` 應為預設 `zh-TW`
   - `/en` 應正確載入英文頁
   - `/sitemap.xml` 應可正常開啟
   - 關鍵 drill 路徑例如 `/drill/rfi`、`/en/drill/rfi` 應可正常渲染

## 步驟 3: 設置 Supabase（可選，用於 Auth）

1. 前往 [Supabase](https://supabase.com/) 創建新專案

2. 在 **Authentication** → **Providers** 啟用 Google OAuth

3. 複製 API 設置中的 URL 和 Anon Key

4. 更新 Vercel 環境變數

## 環境變數參考

### Railway (apps/api)
```
PORT=8000  # Railway 自動設置
```

### Vercel (apps/web)
```
NEXT_PUBLIC_API_URL=https://api.grindgto.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

## 本地開發

```bash
# 終端 1: 後端
cd apps/api
# 優先使用 apps/api/.venv；若你的環境只建立了 repo root venv，再改用 ../../venv/bin/activate
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# 終端 2: 前端
cd apps/web
npm ci
npm run dev
```

前端本地路由重點：

- locale routes 位於 `apps/web/src/app/[locale]/...`
- locale negotiation 由 `apps/web/src/proxy.ts` 處理
- 預設中文不帶 prefix，英文使用 `/en/...`

## 常見問題

### CORS 錯誤
確保 `apps/api/main.py` 中的 `allow_origins` 包含你的 Vercel 域名。

### Railway 部署失敗
檢查 `apps/api/requirements.txt` 是否包含所有依賴。

### Supabase Auth 不工作
確保 Supabase 專案的 **Site URL** 設置為你的 Vercel 域名。

### 英文路由正常但 head metadata 不對
先檢查：
- `apps/web/src/app/[locale]/...` 對應頁面是否有 locale-aware metadata
- `apps/web/src/proxy.ts` 是否仍存在
- sitemap / canonical / alternates 是否與實際 route 對齊
