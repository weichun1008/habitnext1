# habitnext1 — 交接文件索引（從這裡開始）

> 一頁看懂「哪份文件、給誰、何時讀」。最後更新 2026-06-06。
> 線上：https://habitnext1.vercel.app · Repo：https://github.com/weichun1008/habitnext1 · 本地：`web-app/`（指令多在此跑）

## 四份核心文件

| 文件 | 給誰 | 何時讀 | 一句話 |
|---|---|---|---|
| [`HANDOFF.md`](HANDOFF.md) | **接手工程師 / 需求單位** | 接手第一份必讀 | v1 上線範圍、**上線 blocker（認證/同庫/部署）**、§0.5 最新功能、程式地圖 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | 工程師 / 想深入的 PM | 開始改 code 前 | 技術棧、資料模型、慣例、API/Lib 地圖、設計決策、§0 近期增補 |
| [`PRODUCT.md`](PRODUCT.md) | PM / 設計 / 內容團隊 | 了解產品全貌時 | 是什麼、功能地圖、§0 近期更新、路線圖、內容團隊接點 |
| [`STRATEGY.md`](STRATEGY.md) | PM / 決策者 | 對齊「為什麼做、怎麼贏」 | 目標用戶、價值主張、商業模式（strawman 待拍板）、成功指標 |

**閱讀順序**：新工程師 → `HANDOFF` → `ARCHITECTURE`；新 PM/設計 → `PRODUCT` → `STRATEGY`。

## 深入單一功能

- [`superpowers/specs/`](superpowers/specs/) — 每個功能的設計 spec（為什麼這樣做、不做什麼、驗收）
- [`superpowers/plans/`](superpowers/plans/) — 對應的實作 plan（步驟、測試、commit）
- [`notes/`](notes/) — 內容團隊意見回饋、設計脈絡筆記

## 接手工程師最該先知道的三件事

1. **上線前必處理的 blocker 在 `HANDOFF.md` §4**：使用者端認證（IDOR，預計整合 cofit 會員系統，§4-1）、dev=prod 同一個 DB、部署跑 `prisma db push --accept-data-loss`。這些比任何功能取捨重要。
2. **後台 `/api/admin/*` 已有伺服器端授權**（2026-06-06），需環境變數 `ADMIN_SESSION_SECRET`（已設於 Vercel；缺則後台全 401）。
3. **共用 DB + 多 session 並行開發**：schema 只做 additive/nullable，push 前先 `git fetch && git pull`，主分支保持 schema superset。

## 快速上手

```bash
cd web-app && npm install
vercel env pull .env.local      # 取 POSTGRES_URL / ADMIN_SESSION_SECRET 等
npx prisma generate
npm test                        # ~486 tests
npm run dev                     # localhost:3000
```
