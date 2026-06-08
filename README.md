# HabitNext

A habit-tracking web app grounded in behavior science — BJ Fogg's Tiny Habits (Anchor + Behavior + Celebration) and James Clear's Atomic Habits (Identity-driven change), organized around the GENESIS+IO 9-domain health model.

**Live:** [habitnext1.vercel.app](https://habitnext1.vercel.app)
**Repo:** [github.com/weichun1008/habitnext1](https://github.com/weichun1008/habitnext1)

> **交接 / 接手請從 [`docs/INDEX.md`](docs/INDEX.md) 開始** — 一頁看懂四份文件給誰看、上線 blocker、後台授權與環境變數。

---

## What you can do today

1. **Explore habits** by 9 health domains（基因與腸道 / 環境 / 飲食 / 運動 / 壓力與睡眠 / 社交互動 / 心靈 / 認知與智慧 / 職涯與平衡）
2. **Pick a habit** from 105 curated recommendations，每個有 3 個難度（入門 / 進階 / 挑戰）
3. **Attach an anchor + identity**：選錨點（30+ 內建生活時刻 / 既有 task / 自訂）+ 身分宣告 → 寫入 `Task.cue` 與 `Task.identity`
4. **Subscribe to 14-day curated plans**：4 個花朵型小課程（女性週期）+ 4 個睡眠處方 + 1 個健康計劃30天
5. **Daily-reset checklists**：「每餐都要做某事」這類 multi-step habit 每天獨立、不會累積到隔天
6. **Date browsing**：點週列任一天 → 預覽未來計畫（鎖住 🔒）或重看過去完成狀態
7. **Stats & streaks**：5 個 widget 包含完成率 / 9 域分布 / 連續紀錄 / 週熱力圖

## Behavioral-science core

| 概念 | 來源 | App 內表現 |
|---|---|---|
| Anchor (錨點) | BJ Fogg — Tiny Habits | `Task.cue`，顯示在 TaskCard 標題上方 |
| Behavior (微行為) | BJ Fogg | OfficialHabit + `Task.title` |
| Identity (身分認同) | James Clear — Atomic Habits | `Task.identity`，每類型獨立預設 + 通用 + 自訂 |
| 9 GENESIS+IO 面向 | 整全健康模型 | 9 個 HabitCategory，icon + 配色 |
| 雙維分型（花朵 + 睡眠） | 內部架構 | `User.typeKey` + `User.sleepTypeKey` 各自篩選推薦 |

---

## Tech stack

- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS 3.4, lucide-react
- **Backend**: Next.js API Routes (Node.js)
- **Database**: Vercel Postgres (Prisma 5)
- **Testing**: Jest + React Testing Library — 20 suites / 122 tests
- **Deploy**: Vercel auto-deploy on push to `main`
- **Auth**: phone + bcrypt password (light-weight, no JWT/session middleware)

## Repo layout

```
habitnext1/
├── README.md                   # 你正在讀的這份
├── docs/
│   ├── PRODUCT.md              # 產品全景（非工程師讀）
│   ├── ARCHITECTURE.md         # 技術全景（工程師讀）
│   ├── superpowers/
│   │   ├── specs/              # 每個 slice 的設計 spec
│   │   ├── plans/              # 每個 slice 的實作步驟
│   │   └── notes/              # 內部 review / 紀錄
│   └── notes/                  # 內容方意見回饋
└── web-app/                    # Next.js app
    ├── prisma/
    │   ├── schema.prisma       # DB schema (single source of truth)
    │   └── seed/               # JSON seed data
    ├── scripts/                # Node 維運腳本 (audit, seed, migrate)
    └── src/
        ├── app/                # App Router pages + API routes
        ├── components/         # React components
        ├── lib/                # Pure utility modules
        └── __tests__/          # Jest tests
```

## Setup (local dev)

需要 Node 18+ 與 git。

```bash
# 1. Clone
git clone https://github.com/weichun1008/habitnext1
cd habitnext1/web-app

# 2. Install deps
npm install

# 3. Pull env vars from Vercel (one-time)
vercel link --scope johnson-cofitmes-projects --project habitnext1
vercel env pull .env.local

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

## Database scripts

從 `web-app/` 執行。**Prisma CLI 不會自動讀 `.env.local`** — 跑 schema 操作前要先 source：

```bash
set -a && source .env.local && set +a   # 載入 env
npx prisma db push                       # 推 schema 改動到 DB
npx prisma generate                      # 重生 client（schema 變動後）
```

Seed 腳本（自動載入 env，可隨時跑，全部 idempotent）：

```bash
node scripts/audit-categories.js              # 印出所有分類與 habit 數
node scripts/seed-genesis-io.js               # 9 個標準分類
node scripts/seed-genesis-io-habits.js        # 105 個推薦 habit
node scripts/seed-women-templates.js          # 4 個花朵 templates
node scripts/seed-sleep-templates.js          # 4 個睡眠 templates
node scripts/seed-plan-categories.js          # PlanCategory backfill + 8 system rows
```

**注意**：dev 與 prod 共用同一個 Postgres，腳本會直接動到 production data。所有 seed 都是 idempotent，但仍要小心。

## Testing

```bash
cd web-app
npm test                          # 跑所有 Jest 測試（122 tests，10 秒）
npm test -- --watch              # watch mode
npm test src/__tests__/lib       # 只跑 pure helper 測試（最快）
```

## Deploy

Push 到 `main` → Vercel 自動觸發 production build：

```bash
git checkout main
git merge --ff-only feat/your-slice
git push origin main
```

Build 期間 Vercel 會跑 `prisma generate && prisma db push && next build`。1-2 分鐘後 live。

本地預跑 build（不 push schema）：
```bash
npm run build:local
```

## 文件導引

| 你是誰 / 想幹嘛 | 看這份 |
|---|---|
| **想了解產品做了什麼、未來方向** | [`docs/PRODUCT.md`](docs/PRODUCT.md) |
| **接手工程、想了解架構** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| **要深入某個功能的設計理由** | [`docs/superpowers/specs/`](docs/superpowers/specs/) |
| **要照著步驟實作** | [`docs/superpowers/plans/`](docs/superpowers/plans/) |
| **要看內容方意見 / 內容改版紀錄** | [`docs/notes/`](docs/notes/) |

## Conventions

- 分支命名：`feat/slice-<letter>-<short-name>` (例: `feat/slice-f-recurring-checklist`) 或 `fix/<topic>` / `refactor/<topic>`
- Commit message: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:` ...)
- Spec 與 Plan 文件採用 `YYYY-MM-DD-<topic>-design.md` / `.md` 命名
- 任何 schema 改動透過 `prisma db push`（不用 migration history）
- 非平凡功能走 spec → plan → execute（superpowers workflow），spec / plan 文件存進 git
- 跑測試 + build 才 push main
