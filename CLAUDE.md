# GTO Poker Trainer

## 專案結構
```
apps/
├── web/          # Next.js 16 前端
│   ├── src/app/           # 頁面路由
│   ├── src/components/    # UI 組件
│   ├── src/lib/poker/     # 撲克邏輯（AI、equity、sizing）
│   ├── src/stores/        # Zustand 狀態管理
│   └── messages/          # i18n 翻譯檔
└── api/          # FastAPI 後端
    ├── routers/           # API 路由
    └── data/              # JSON 題庫
```

## 常見任務路徑
| 任務 | 檔案 |
|------|------|
| 考題題庫 | `apps/web/src/app/exam/page.tsx` |
| AI 決策引擎 | `apps/web/src/lib/poker/aiDecisionEngine.ts` |
| 牌面質地分析 | `apps/web/src/lib/poker/boardTexture.ts` |
| 下注尺寸邏輯 | `apps/web/src/lib/poker/sizing.ts` |
| Table Trainer | `apps/web/src/app/drill/table-trainer/` |
| Postflop 練習 | `apps/web/src/app/drill/postflop/` |
| 翻譯 (中文) | `apps/web/messages/zh-TW.json` |
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
