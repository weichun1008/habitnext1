# habitnext1 — 正式上線 Scope & 工程交接文件

> 日期 2026-06-05 · 給接手的工程師 / 需求單位。
> 一句話：這份文件界定「**v1 正式上線要硬化/QA 的範圍**」、「**PM 端持續精進、不在上線硬化範圍的新功能**」、以及「**工程師必須在上線前處理的 blocker**」。

---

## 0. TL;DR（先看這段）

- **產品本體 = 行為科學習慣追蹤器**（每日追蹤 + 嚮往/Focus Map/身分/錨點 + 模板 + 科學佐證）。這塊成熟、是上線主體，請優先 QA/硬化。
- **遊戲化世界層**（旅程城市地圖 / 公仔世界 / 世界切換 / 美食回憶照片 / 完成地點）＝**PM 端持續精進中的新功能**，會繼續改、**留在 build 裡不隱藏**。它**不是 v1 的硬化重點**，工程師不需為它做上線級 QA，但**動到共用區（MainApp/TaskCard/schema）前請先跟 PM 協調**。
- **真正的上線 blocker 是工程面**（見 §4）：認證/授權、dev=prod 同庫、部署 `--accept-data-loss`、legacy/admin 對外權限。**這些比任何功能取捨都重要，請列為上線前必處理。**

---

## 1. 產品與技術棧

- **產品**：habitnext1 — 行為科學導向的習慣養成 App（未來併入 cofit）。核心理論：BJ Fogg Tiny Habits（錨點/行為群/Focus Map）、James Clear 身分認同、GENESIS+IO 九大健康領域。
- **Stack**：Next.js 14（App Router）· React 18 · Tailwind · lucide-react（**UI 一律用 lucide、不用 emoji**）· Prisma 5 + Vercel/Neon Postgres · Jest + RTL（目前 ~401 tests 綠）。
- **Production**：`https://habitnext1.vercel.app` · Vercel `johnson-cofitmes-projects/habitnext1` · GitHub `weichun1008/habitnext1`，push `main` 自動部署。
- **App 結構**：登入後是單頁 client app（`src/components/MainApp.jsx` 為樞紐），以 `currentView` 切換每日/計畫/日曆/統計/世界/旅程/成就等視圖。

---

## 2. ✅ v1 上線範圍（成熟核心 — 請 QA / 硬化這塊）

這是產品的價值主體、不依賴美術、可直接面向使用者：

- **每日追蹤**：三種任務型態（二元 / 量化 +/- / 清單子任務）、完成動畫（打勾停在原地 ~1.5s 再移入「已完成」）、streak、週/日期瀏覽（WeekStrip）。
- **計畫總覽 / 日曆 / 統計**（`/api/stats`）。
- **嚮往系統**（Aspiration，Slice K）：從「為了什麼」出發 → 推薦習慣。
- **Focus Map 評分**（Slice L）：候選池 → Impact×Ability 評分 → 啟用「黃金行為」。
- **身分宣告**（identity）、**錨點**（cue / anchor）。
- **模板**：花朵人格 / 睡眠 14 天模板（TemplateExplorer / TemplateDetailPanel）。
- **科學佐證**：HabitInsight brief + 證據力指標（Slice N）。
- **任務卡操作**（Slice M）：暫停 / 隱藏 / 刪除 / 排序 / swipe。
- **個人資料**（ProfileModal）、輕量註冊/登入。
- **Admin 後台**（`/admin/*`）：習慣庫、模板、分類、專家、指派、使用者管理。

**對應 API**（穩定）：`/api/tasks*`、`/api/aspirations*`、`/api/stats`、`/api/habits*`、`/api/templates/public`、`/api/plan-categories`、`/api/user/profile`、`/api/auth/*`、`/api/admin/*`。

---

## 3. 🚧 持續精進中的新功能（留在 build、不隱藏、非 v1 硬化重點）

PM 會繼續迭代這層；**工程師不需為它做上線級打磨**，但它仍會出現在線上。動到共用檔案前先跟 PM 對齊。

| 功能 | 狀態 | 備註 |
|---|---|---|
| **完成地點**（Slice O）| 已上線、opt-in | `TaskHistory.lat/lng/city` + `User.trackLocation`；座標只存數字、離線比對城市、不出前端/URL |
| **旅程世界城市地圖**（Slice P）| 已上線、唯讀 | `/api/journey`、`lib/journeyWorld.js`、`components/journey/*`；**SVG 是手刻佔位，待插畫師升級** |
| **世界切換 + 公仔世界**（World Switch / Figure）| 已上線 | `User.activeWorld`、`TaskHistory.world`、`lib/worldScope.js`、`WorldPicker`、`FigureWorldView`、動畫 `FigureCreature`；**居家世界仍是「即將推出」佔位** |
| **美食回憶照片**（Slice Q1a）| 管線完成、**上傳停用** | `TaskHistory.photoUrl/memoNote`、`/api/memory/[id]`、`imageCompress`（剝 EXIF/GPS）。**真正上傳（Q1b）未接** → 需開 **Vercel Blob store**（計費）+ 解 `handleAttachPhoto` 的 guard。點「記錄這餐」目前是優雅 no-op。 |

設計脈絡文件：`docs/superpowers/notes/2026-06-02-journey-world-vs-world-switch.md`、各 `docs/superpowers/specs/2026-06-0*-slice-*.md`。

---

## 4. ⚠️ 工程師負責的上線 Blocker（**v1 對外前必處理**）

> 這幾項不是「功能要不要做」，是「會不會出事」。比 scope 取捨重要得多。

1. **認證 / 授權太輕**
   - 現況：phone + bcrypt 密碼，**無 session / JWT middleware**；前端把 `userId` 直接放 query string。
   - 風險：多數使用者資料 API（`/api/tasks?userId=`、`/api/journey?userId=`、`/api/memory/[id]?userId=`、`/api/user/profile`…）**信任 client 傳來的 userId** → 任何人知道他人 `userId`（+ `historyId`）即可讀/改其資料（IDOR）。
   - 上線前：導入 session（server 端解析身分），所有 user 資料 API 改從 session 取 userId，不信任 query。

2. **dev = prod 共用同一個 Postgres**
   - 風險：開發/seed 腳本直接動到正式資料。
   - 上線前：分離 production DB（獨立連線字串 / 獨立 Neon 專案）。

3. **部署 build 跑 `prisma db push --accept-data-loss`**（見 `package.json` `build` script）
   - 風險：每次部署讓 DB 嚴格吻合該 commit schema，**會 drop 不在 schema 的欄位 + 資料遺失**；跨並行分支 schema 不同步時尤其危險。
   - 上線前：production 改用 **Prisma migrations**（`migrate deploy`），移除 `--accept-data-loss`；schema 變更走 migration review。

4. **Legacy / Admin 對外權限**
   - 確認 `/admin/*` 後台與舊 DTx 實驗路由在正式環境的存取控制（admin auth 是否足夠、是否該限制 IP/角色）。

5. **環境變數與第三方**
   - `POSTGRES_URL`（注意 CLI build 期需此變數）；未來開 Vercel Blob 需 `BLOB_READ_WRITE_TOKEN`。

---

## 5. 已知技術債 / 協調注意（非 blocker，但交接要知道）

- **多 session / worktree 並行開發**：歷史上同一 DB + 同一 repo 多人/多 agent 並行，務必協調 schema 與分支（用 PR、勿直接在共用主目錄改）。
- `MainApp.jsx` 已相當大（樞紐元件），後續可考慮拆分（completion-flow、journey fetch、world handlers）。
- Slice Q：`handleAttachPhoto` 內有註解掉的 Q1b 上傳 scaffold；`@vercel/blob` 以 `webpackIgnore` 動態匯入待安裝。
- 既有小 nit：`/api/journey` 對 World Switch **刻意不依世界過濾**（跨世界累積，設計決策見 notes）；公仔卡背景點擊只選不導航。
- 旅程/公仔世界的 SVG 為工程手刻佔位 → **正式美術需插畫師**。

---

## 6. 環境 / 指令 / 測試

```bash
cd web-app
npm install
vercel env pull .env.local              # 取 POSTGRES_URL 等（一次性）
npm run dev                             # localhost:3000
npm test                               # Jest（~401 tests）
npm run build:local                    # 本地 build（不跑 db push）
# 部署：push main → Vercel 自動 build（build script 含 prisma db push --accept-data-loss，見 §4.3）
```

- Prisma CLI 讀 `.env`（非 `.env.local`）；本地跑 prisma 指令先載入：`set -a && . ./.env.local && set +a`。
- 既有總覽文件：`docs/PRODUCT.md`、`docs/ARCHITECTURE.md`。

---

## 7. 程式地圖（重點檔案）

- **樞紐**：`src/components/MainApp.jsx`（state、completion flow、各視圖切換、fetch）、`src/components/AppHeader.jsx`（手機導覽）。
- **任務卡**：`src/components/TaskCard.jsx`、`taskCard/*`、`TaskDetailModal.jsx`、`TaskFormModal.jsx`。
- **嚮往/Focus**：`AspirationPicker`、`AspirationRecommendationPanel`、`FocusMapModal`、`focusMap/*`、`lib/aspirations.js`、`lib/focusMap.js`。
- **遊戲化**：`components/journey/*`（CityScene/JourneyView/CityInfoPanel/WorldOverview/MemoryCapture）、`components/worlds/*`（WorldPicker/FigureWorldView/FigureCreature）、`lib/journeyWorld.js`、`lib/worldScope.js`、`lib/categoryToDomain.js`、`lib/cities.js`、`lib/geolocation.js`、`lib/imageCompress.js`、`lib/worlds.js`、`lib/figureWorld.js`。
- **Schema**：`prisma/schema.prisma`（14 models：User/Task/TaskHistory/Aspiration/AspirationHabit/PlanCategory/PlanFamily/OfficialHabit/HabitInsight/HabitCategory/Template/Assignment/Expert/ExpertTitle）。
- **測試**：`src/__tests__/**`。

---

**結論**：v1 上線 = §2 的行為科學核心（請 QA/硬化）＋ §4 的工程 blocker（必修）。§3 的世界/地圖/照片是 PM 持續精進的新功能，留在線上、但不是 v1 的打磨對象。
