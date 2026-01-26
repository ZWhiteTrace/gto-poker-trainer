# GTO Poker Trainer - SaaS Migration Plan

## Executive Summary

將現有 Streamlit 應用遷移至 Next.js，實現：
- **SEO 優化** — SSR/SSG，獨立 URL，結構化數據
- **商業化準備** — 會員系統、付費功能、訂閱模式
- **擴展性** — 多語言、API、手機 App 基礎

---

## 1. 技術架構

### 1.1 推薦 Stack

```
Frontend:  Next.js 14+ (App Router)
Styling:   Tailwind CSS + shadcn/ui
State:     Zustand (client) + React Query (server)
Auth:      NextAuth.js + Supabase Auth
Database:  Supabase (PostgreSQL)
Payments:  Stripe
Analytics: Vercel Analytics + PostHog
Hosting:   Vercel
```

### 1.2 專案結構

```
gto-trainer-nextjs/
├── app/
│   ├── (marketing)/          # Landing pages (SSG)
│   │   ├── page.tsx          # Homepage
│   │   ├── pricing/
│   │   └── about/
│   ├── (app)/                # App pages (SSR/Client)
│   │   ├── layout.tsx        # App shell with sidebar
│   │   ├── drill/
│   │   │   └── page.tsx
│   │   ├── ranges/
│   │   │   ├── page.tsx      # Range overview
│   │   │   ├── [position]/   # /ranges/btn, /ranges/sb
│   │   │   │   └── page.tsx
│   │   │   └── rfi/
│   │   │       └── page.tsx
│   │   ├── push-fold/
│   │   │   ├── page.tsx
│   │   │   ├── chart/
│   │   │   ├── defense/
│   │   │   ├── resteal/
│   │   │   └── hu/
│   │   ├── facing-3bet/
│   │   ├── icm-calculator/
│   │   ├── equity-quiz/
│   │   ├── outs-quiz/
│   │   ├── ev-quiz/
│   │   └── postflop/
│   ├── api/
│   │   ├── auth/
│   │   ├── progress/
│   │   └── stripe/
│   └── (auth)/
│       ├── login/
│       └── signup/
├── components/
│   ├── ui/                   # shadcn components
│   ├── range-grid/
│   ├── hand-display/
│   └── drill/
├── lib/
│   ├── ranges/               # JSON data + loaders
│   ├── drills/               # Drill logic (ported from Python)
│   └── utils/
├── content/                  # MDX articles for SEO
│   ├── guides/
│   │   ├── rfi-basics.mdx
│   │   ├── push-fold-strategy.mdx
│   │   └── icm-explained.mdx
│   └── hand-analysis/
└── public/
    └── og/                   # Open Graph images
```

---

## 2. SEO 策略

### 2.1 URL 結構 (SEO-friendly)

| 現有 (Streamlit) | 新 URL | 頁面類型 |
|------------------|--------|----------|
| `/?page=drill` | `/drill` | SSR |
| `/?page=range` | `/ranges` | SSG |
| (無) | `/ranges/btn` | SSG |
| (無) | `/ranges/sb/rfi` | SSG |
| `/?page=pushfold` | `/push-fold` | SSR |
| (無) | `/push-fold/chart/sb/10bb` | SSG |
| `/?page=vs3bet` | `/facing-3bet` | SSR |
| `/?page=icm` | `/icm-calculator` | SSR |
| (無) | `/guides/rfi-basics` | SSG |
| (無) | `/guides/push-fold-strategy` | SSG |

### 2.2 Meta Tags Template

```tsx
// app/push-fold/page.tsx
export const metadata: Metadata = {
  title: 'MTT Push/Fold 圖表 | GTO Poker Trainer',
  description: '免費 Nash 均衡 Push/Fold 圖表，適用於 MTT 短碼情況。支援 3bb-25bb，包含防守範圍和 Resteal 策略。',
  keywords: ['push fold chart', 'MTT strategy', 'short stack poker', 'Nash equilibrium'],
  openGraph: {
    title: 'MTT Push/Fold 圖表 - 免費 GTO 工具',
    description: '短碼全下策略，一眼看懂何時 Push 何時 Fold',
    images: ['/og/push-fold.png'],
  },
};
```

### 2.3 結構化數據 (JSON-LD)

```tsx
// For educational content pages
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'MTT Push/Fold 完全指南',
  author: {
    '@type': 'Organization',
    name: 'GTO Poker Trainer',
  },
  publisher: {
    '@type': 'Organization',
    name: 'GTO Poker Trainer',
    logo: '/logo.png',
  },
  datePublished: '2025-01-26',
  description: '學習 Nash 均衡 Push/Fold 策略...',
};

// For tool pages
const toolJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'ICM Calculator',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};
```

### 2.4 內容策略

**靜態內容頁面 (SSG, 高 SEO 價值):**
1. `/guides/rfi-basics` — RFI 入門指南
2. `/guides/push-fold-strategy` — Push/Fold 完全攻略
3. `/guides/icm-explained` — ICM 原理解析
4. `/guides/facing-3bet` — 面對 3bet 的應對策略
5. `/hand-analysis/[id]` — 經典牌局分析

**關鍵字目標:**
- 繁中: "GTO 撲克", "翻前範圍", "Push Fold 表", "ICM 計算"
- 英文: "GTO preflop charts", "free push fold chart", "poker range trainer"

---

## 3. 商業模式

### 3.1 免費 vs 付費功能

| 功能 | Free | Pro ($9.99/mo) | Team ($29.99/mo) |
|------|------|----------------|------------------|
| RFI 範圍查看 | ✅ | ✅ | ✅ |
| Push/Fold 圖表 | ✅ | ✅ | ✅ |
| ICM 計算器 | ✅ | ✅ | ✅ |
| 基礎練習模式 | 10題/天 | ✅ 無限 | ✅ 無限 |
| 進階練習 (3bet/Postflop) | ❌ | ✅ | ✅ |
| 進度追蹤 | 7天 | ✅ 永久 | ✅ 永久 |
| 手牌歷史分析 | ❌ | ✅ | ✅ |
| 自訂範圍 | ❌ | ✅ | ✅ |
| API 存取 | ❌ | ❌ | ✅ |
| 團隊管理 | ❌ | ❌ | ✅ |

### 3.2 資料庫 Schema (Supabase)

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  plan TEXT DEFAULT 'free', -- 'free', 'pro', 'team'
  plan_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Progress tracking
CREATE TABLE drill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  drill_type TEXT, -- 'rfi', 'push_fold', 'vs_3bet', etc.
  scenario TEXT,
  total_attempts INT DEFAULT 0,
  correct_attempts INT DEFAULT 0,
  last_practiced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Session history
CREATE TABLE drill_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  drill_type TEXT,
  hands JSONB, -- Array of {hand, scenario, correct, timestamp}
  total INT,
  correct INT,
  duration_seconds INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stripe subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  plan TEXT,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. 遷移路徑

### Phase 1: 基礎架構 (Week 1-2)
- [ ] 建立 Next.js 專案 + Tailwind + shadcn
- [ ] 移植 Range Grid 組件
- [ ] 移植 Hand Display 組件
- [ ] 設置 Supabase 連接
- [ ] 基礎 Auth 流程

### Phase 2: 核心功能 (Week 3-4)
- [ ] 移植 RFI 範圍查看器 (SSG)
- [ ] 移植 Push/Fold 圖表 (SSG)
- [ ] 移植 ICM 計算器 (Client)
- [ ] 移植 Drill 邏輯 (TypeScript)

### Phase 3: 練習模式 (Week 5-6)
- [ ] RFI Drill
- [ ] Push/Fold Drill (含 Defense, Resteal, HU)
- [ ] Facing 3bet Drill
- [ ] 進度追蹤系統

### Phase 4: 商業化 (Week 7-8)
- [ ] Stripe 整合
- [ ] 付費牆實作
- [ ] Landing Page
- [ ] SEO 內容頁面

### Phase 5: 上線準備 (Week 9-10)
- [ ] 效能優化
- [ ] 測試
- [ ] 文件
- [ ] 部署到 Vercel

---

## 5. 關鍵決策點

### 5.1 漸進式遷移 vs 完全重寫

**推薦: 漸進式遷移**
- 保持 Streamlit 運行，同時開發 Next.js
- 功能對齊後再切換
- 使用相同的 JSON 資料檔案

### 5.2 TypeScript 移植策略

Python drill 邏輯 → TypeScript:
```typescript
// lib/drills/push-fold.ts
export interface PushFoldSpot {
  hand: string;
  position: Position;
  stackDepth: StackDepth;
  isDefense?: boolean;
  defenseScenario?: string;
}

export function isPush(hand: string, stack: StackDepth, position: Position): boolean {
  const range = PUSH_RANGES[stack]?.[position] ?? new Set();
  return range.has(hand);
}
```

### 5.3 資料檔案復用

現有 JSON 檔案可直接在 Next.js 使用:
```typescript
// lib/ranges/push-fold.ts
import pushFoldData from '@/data/ranges/mtt/push_fold.json';
import defenseData from '@/data/ranges/mtt/defense_vs_shove.json';
import restealData from '@/data/ranges/mtt/resteal.json';
import huData from '@/data/ranges/mtt/hu_push_defense.json';
```

---

## 6. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 開發時間過長 | 延遲上線 | 優先核心功能，MVP 先行 |
| SEO 效果不明顯 | 流量不足 | 持續產出內容，建立 backlinks |
| 付費轉換率低 | 收入不足 | 調整定價，增加免費功能價值 |
| 技術債務 | 維護困難 | 嚴格 code review，測試覆蓋 |

---

## 7. 成功指標

| 指標 | 目標 (6個月) |
|------|-------------|
| 月活躍用戶 (MAU) | 5,000 |
| 自然搜尋流量 | 2,000/月 |
| 付費轉換率 | 3% |
| MRR | $1,500 |
| Google 排名 (繁中關鍵字) | Top 10 |

---

## Next Steps

1. **立即行動**: 建立 Next.js 專案骨架
2. **本週目標**: Range Grid 組件移植
3. **本月目標**: 核心功能 MVP

需要我開始建立 Next.js 專案嗎？
