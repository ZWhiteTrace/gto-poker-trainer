# GTO Poker Trainer

Free, open-source preflop & postflop GTO training app.

**Live**: [grindgto.com](https://grindgto.com)

## Architecture

```
apps/
├── web/          # Next.js 16 frontend (Vercel)
│   ├── src/app/           # App Router pages
│   ├── src/components/    # UI components
│   ├── src/lib/poker/     # Poker domain logic (AI, equity, sizing)
│   ├── src/stores/        # Zustand state management
│   └── messages/          # i18n (en, zh-TW)
└── api/          # FastAPI backend (Railway)
    ├── routers/           # API routes
    └── data/              # Question bank / solver data

data/             # Training data (bundled into frontend for offline use)
```

## Local Development

**API**
```bash
cd apps/api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd apps/web
npm ci
npm run dev
```

## Tests

```bash
# API
cd apps/api && pytest tests

# Frontend unit tests
cd apps/web && npm run test:run

# Frontend E2E (against production)
cd apps/web && E2E_BASE_URL=https://grindgto.com E2E_EXTERNAL_SERVER=1 npm run test:e2e

# Frontend E2E (local dev server)
cd apps/web && npm run test:e2e
```

## Data Sources

| Directory | Purpose | Consumed by |
|-----------|---------|-------------|
| `data/` | Range charts, reasoning, postflop strategies | Frontend (bundled at build time for 0-latency) |
| `apps/api/data/` | Question bank, solver data, flop textures | API endpoints |

## Deployment

- **Frontend**: Vercel (`grindgto.com`)
- **API**: Railway (`api.grindgto.com`)
- **Monitoring**: Sentry (`@sentry/nextjs`)

See `DEPLOYMENT.md` for details.

## CI

GitHub Actions runs on every push to `main` and PRs:
- **api-tests**: `pytest`
- **web-lint-test-build**: `eslint` → `vitest` → `next build`
- **web-e2e**: Playwright tests against production (push/manual only)
