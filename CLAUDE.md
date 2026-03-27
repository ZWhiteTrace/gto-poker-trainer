# GTO Poker Trainer

## 專案結構
```
apps/
├── web/          # Next.js 16 前端
│   ├── src/app/           # App Router（含 [locale] URL-based i18n 路由）
│   ├── src/components/    # UI 組件
│   ├── src/lib/poker/     # 撲克邏輯（AI、equity、sizing）
│   ├── src/stores/        # Zustand 狀態管理
│   ├── src/proxy.ts       # next-intl locale routing proxy
│   └── messages/          # i18n 翻譯檔
└── api/          # FastAPI 後端
    ├── routers/           # API 路由
    └── data/              # JSON 題庫

content/
└── guides/       # Learn 文章內容（中文原文 + content/guides/en/ 英文）
```

## 常見任務路徑
| 任務 | 檔案 |
|------|------|
| 考題題庫 | `apps/web/src/app/[locale]/exam/page.tsx` |
| AI 決策引擎 | `apps/web/src/lib/poker/aiDecisionEngine.ts` |
| 牌面質地分析 | `apps/web/src/lib/poker/boardTexture.ts` |
| 下注尺寸邏輯 | `apps/web/src/lib/poker/sizing.ts` |
| Table Trainer | `apps/web/src/app/[locale]/drill/table-trainer/` |
| Postflop 練習 | `apps/web/src/app/[locale]/drill/postflop/` |
| Learn 文章頁 | `apps/web/src/app/[locale]/learn/` |
| 翻譯 (中文) | `apps/web/messages/zh-TW.json` |
| 翻譯 (英文) | `apps/web/messages/en.json` |
| SEO / alternates | `apps/web/src/lib/metadata.ts` |
| API 題庫 | `apps/api/data/` |

## 開發指令
```bash
# Frontend
cd apps/web && npm run dev      # 開發模式
cd apps/web && npm run build    # 建置驗證

# API (本地)
cd apps/api && uvicorn main:app --reload
```

## 術語規範
- 撲克術語需加中文標註：`MDF（最小防禦頻率）`、`C-bet（持續下注）`
- 考題 ID 格式：類型縮寫 + 數字（`pf1`, `e1`, `post1`, `sz1`, `rg1`）
- BB = 大盲，需在考題中說明「有效籌碼」概念

## 部署
- Frontend: Vercel (`grindgto.com`)
- API: Railway (`api.grindgto.com`)

## Build 驗證

修改後必須跑：
- **Web build**: `cd apps/web && npm run build`
- **Web test**: `cd apps/web && npm run test:run`
- **Web E2E**: `cd apps/web && npm run test:e2e`
- **API test**: `cd apps/api && pytest -v`

## 常見陷阱

```typescript
// ❌ tableStore test 中 AI turn 測試 — 多人桌 AI chain 難以預測
// ✅ reduce 到 2 players (hero + 1 AI) 來測 AI thinking state

// ❌ data/ JSON import 在 test 中失敗
// ✅ vitest.config.ts 已設 @data alias，確認 resolve.alias 存在
```

```typescript
// ❌ i18n key 直接寫中文字串
label: "最小防禦頻率"

// ✅ 用 labelKey，在 render 時 t() 解析
labelKey: "drill.squeeze.mdfLabel"
// component: {t(item.labelKey)}
```

## 不確定時的 Default

- 不確定 drill type → 查 `TrackedDrillType` enum（10 種）
- 不確定考題 ID 格式 → 類型縮寫 + 數字：`pf1`, `e1`, `post1`, `sz1`, `rg1`
- 不確定翻譯 key 放哪 → `apps/web/messages/zh-TW.json`，按 page 分 namespace
- 不確定 data 檔放哪 → root `data/`（前端 @data alias）+ `apps/api/data/`（後端），兩邊保持同步
- 不確定 guide 放哪 → 只放 root `content/guides/`（apps/web/content/guides/ 已刪）
- 不確定 locale 路由怎麼走 → 以 `apps/web/src/app/[locale]/...` 為準，default locale `zh-TW` 走無 prefix，英文走 `/en/...`

## 禁止事項

- 不要在 `apps/web/content/guides/` 建檔（已刪除，只用 root `content/guides/`）
- 不要改 `data/` 而不同步 `apps/api/data/`
- 不要在 component 中硬編碼中文，用 i18n key
- 不要跳過 vitest 直接 build — test 先過才 build
