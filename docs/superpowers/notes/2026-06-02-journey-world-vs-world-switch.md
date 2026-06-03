# Journey World 地圖 ↔ World Switch 邊界協調備忘

> 日期 2026-06-02 · 給跨 session 工程師 / PM。釐清「旅程世界地圖」(Slice O/P/Q) 與「World Switch」(並行 session) 兩個機制的關係與已定邊界，避免認知分歧。

## 兩個機制是什麼

| | Journey World 地圖（Slice O/P/Q）| World Switch（並行 session）|
|---|---|---|
| 是什麼 | 把「在哪完成習慣」累積渲染成城市地圖（城市等級、領域旗艦、美食 pin）| 可切換的遊戲化世界系統：home 居家 / figure 公仔 / **journey 旅程** |
| 資料 | `TaskHistory.lat/lng/city`（O）、`photoUrl/memoNote`（Q）| `User.activeWorld`、`TaskHistory.world`（完成當下世界快照）|
| 程式 | `/api/journey`、`lib/journeyWorld.js`、`components/journey/*` | `lib/worldScope.js`、profile API 的 activeWorld、MainApp 蓋章 |

**關係**：World Switch 的三世界之一「journey」**就是** Journey World 地圖。它是三世界中**唯一需要記地點**的（home/figure 純完成數、零定位門檻）。換句話說 Journey World 是 World Switch 的「進階、要地點」那一層。

## ★ 已定邊界決策（2026-06-02）

### 1. 命名區分（兩件事，勿混）
- `activeWorld === 'journey'`：使用者**當下在玩**的世界（影響新完成被蓋上的 `world` 值）。
- `GET /api/journey`：**跨世界累積**的唯讀地圖 API。與 `activeWorld` 無耦合。

### 2. `/api/journey` 刻意「不」依世界過濾 —— 維持跨世界累積
旅程地圖顯示**所有世界累積**的地點（不管完成時 `activeWorld` 是什麼），是一張跨世界的真實回憶地圖。

**理由**：
- journey 是唯一記地點的世界 → home/figure 幾乎無地點資料可「洩漏」到地圖。
- 把真實世界回憶按遊戲世界切碎，違背 Slice O/P「地點＝anchor、珍惜累積」的初衷。
- 共同序章（`world IS NULL`，機制上線前的完成）本來就三世界共享，地圖一併涵蓋最自然。

**若未來產品改主意**（要「只顯示 journey 世界的完成」）：在 `/api/journey` 的 prisma `where` 併入 `worldScope.worldScopedWhere('journey')` 即可（一行），其餘不動。已在 route.js 留註解指路。

### 3. 照片（Slice Q）是世界無關
照片附在 `TaskHistory` 列上，與該列的 `world` 無關；地圖上不分世界顯示。真實回憶不該被遊戲世界限定。

## 共用的良性模式
World Switch 的 `worldWrite`（完成蓋章 `world`）**鏡像** Slice O 的 `locWrite` / Slice Q 的 `memWrite`——同一套「provided 才寫、不覆蓋既有」的條件寫入。三者在 `api/tasks/[id]` upsert 並列，互不干擾。

## 部署/DB 注意（已解決的歷史問題）
dev=prod 共用 Neon。並行 session 已把 `prisma db push --accept-data-loss` 加進部署流程，使每次 deploy 自動把 DB 同步成 main 的 schema。**前提**：所有人的 schema 變更都要進 main（否則 `--accept-data-loss` 會砍掉不在當前 deploy schema 裡的欄位）。Slice O/P/Q 的欄位皆已在 main schema，安全。

## 現況快照
- 已上線 main/production：Slice O（座標）、P（旅程世界地圖）、Q1a（美食 pin 管線，上傳 guard）、World Switch 地基。
- 未做：Q1b（真正 Blob 上傳，待開 Vercel Blob store）、World Switch 的世界選擇器 UI（W5/W6）、home/figure 世界視圖（H2/F2）。
