# HabitNext

A habit-tracking web app grounded in behavior science — BJ Fogg's Tiny Habits (Anchor + Behavior + Celebration) and James Clear's Atomic Habits (Identity-driven change), organized around the GENESIS+IO 9-domain health model.

**Live:** [habitnext1.vercel.app](https://habitnext1.vercel.app)
**Repo:** [github.com/weichun1008/habitnext1](https://github.com/weichun1008/habitnext1)

---

## What you can do today

1. **Explore habits** by 9 health domains（基因與腸道 / 環境 / 飲食 / 運動 / 壓力與睡眠 / 社交互動 / 心靈 / 認知與智慧 / 職涯與平衡）
2. **Pick a habit** from 90+ curated recommendations，每個有 3 個難度（入門 / 進階 / 挑戰）
3. **Attach an anchor**：選一個既有習慣或內建生活時刻（30+ 個，分早晨/中午/晚上/工作/通勤/任意時刻）做為觸發點
4. **Track checklists with daily reset**：每餐都要做某事這類 multi-step habit 每天獨立、不會累積到隔天
5. **Edit subtasks Google-Calendar-style**：刪除一個 subtask 可選「從今天起不再出現」或「永久刪除含歷史」

## Behavioral-science core

| 概念 | 來源 | 在 app 裡的位置 |
|---|---|---|
| Anchor (錨點) | BJ Fogg — Tiny Habits | `Task.cue` 欄位，顯示在 TaskCard 標題上方 |
| Behavior (微行為) | BJ Fogg | OfficialHabit + `Task.title` |
| Identity (身分認同) | James Clear — Atomic Habits | ⏳ Slice E (尚未實作) |
| 9 GENESIS+IO 面向 | 整全健康模型 | 9 個 HabitCategory，icon + 配色 |

---

## Tech stack

- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS, lucide-react
- **Backend**: Next.js API Routes (Node.js)
- **Database**: Vercel Postgres (Prisma 5)
- **Testing**: Jest + React Testing Library
- **Deploy**: Vercel auto-deploy on push to `main`
- **Auth**: phone + bcrypt password (light-weight, no JWT/session middleware)

## Repo layout

```
habitnext1/
├── README.md                   # 你正在讀的這份
├── docs/
│   ├── PRODUCT.md             # 功能地圖（非工程師）
│   └── superpowers/
│       ├── specs/             # 每個 slice 的設計 spec（工程師讀）
│       ├── plans/             # 每個 slice 的實作步驟
│       └── notes/             # Review / 內部紀錄
└── web-app/                   # Next.js app
    ├── prisma/
    │   ├── schema.prisma      # DB schema
    │   └── seed/              # JSON seed data
    ├── scripts/               # Node 維運腳本 (audit, seed, migrate)
    └── src/
        ├── app/               # App Router pages + API routes
        ├── components/        # React components
        ├── lib/               # Pure utility modules
        └── __tests__/         # Jest tests
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

從 `web-app/` 執行（會自動讀 `.env.local`）：

```bash
node scripts/audit-categories.js              # 印出所有分類與 habit 數
node scripts/seed-genesis-io.js               # 種 9 個標準分類（idempotent）
node scripts/seed-genesis-io-habits.js        # 種 92 個推薦 habit（idempotent）
node scripts/migrate-categories.js            # 將既有 OfficialHabit 移到標準分類
node scripts/migrate-subtasks-format.js       # 升級 subtask 物件結構（Slice F 一次性）
```

**注意**：dev 與 prod 共用同一個 Postgres，腳本會直接動到 production data。

## Testing

```bash
cd web-app
npm test                          # 跑所有 Jest 測試
npm test -- --watch              # watch mode
npm test src/__tests__/lib       # 只跑 pure helper 測試
```

## Deploy

Push 到 `main` → Vercel 自動觸發 production build：

```bash
git checkout main
git merge --ff-only feat/your-slice
git push origin main
```

Build 期間 Vercel 會跑 `prisma generate && prisma db push && next build`。1-2 分鐘後 live。

## 文件導引

- 想了解產品做了什麼、未來方向 → [`docs/PRODUCT.md`](docs/PRODUCT.md)
- 想深入某個 slice 的設計 → [`docs/superpowers/specs/`](docs/superpowers/specs/)
- 想看實作步驟（含 commit message 範例）→ [`docs/superpowers/plans/`](docs/superpowers/plans/)

## Conventions

- 分支命名：`feat/slice-<letter>-<short-name>` (例: `feat/slice-f-recurring-checklist`)
- Commit message: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:` ...)
- Spec 與 Plan 文件採用 `YYYY-MM-DD-<topic>-design.md` / `.md` 命名
- 任何 schema 改動透過 `prisma db push`（不用 migration history）
