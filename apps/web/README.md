# GTO Poker Trainer — Frontend

Next.js 16 App Router frontend for [grindgto.com](https://grindgto.com).

## Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **State**: Zustand (persisted to localStorage)
- **i18n**: next-intl (en, zh-TW)
- **UI**: Tailwind CSS + shadcn/ui
- **Monitoring**: Sentry (`@sentry/nextjs`)

## Development

```bash
npm ci
npm run dev       # http://localhost:3000
npm run build     # production build
npm run lint      # ESLint
```

## Tests

```bash
npm run test:run               # Vitest unit tests
npm run test:e2e               # Playwright E2E (local dev server)
npm run test:e2e -- --ui       # Playwright UI mode

# E2E against production
E2E_BASE_URL=https://grindgto.com E2E_EXTERNAL_SERVER=1 npm run test:e2e
```

## Key Directories

```
src/
├── app/                  # Pages (drill, learn, quiz, progress, etc.)
├── components/
│   ├── layout/           # Navbar, Footer, ThemeProvider
│   └── poker/            # DrillSession, CardDisplay, RangeGrid
├── lib/poker/            # AI decision engine, equity, sizing, board texture
├── stores/               # Zustand stores (progress, settings)
└── i18n/                 # next-intl configuration

e2e/                      # Playwright E2E specs
messages/                 # Translation files (en.json, zh-TW.json)
```

## Environment Variables

See `.env.example` for required variables.
