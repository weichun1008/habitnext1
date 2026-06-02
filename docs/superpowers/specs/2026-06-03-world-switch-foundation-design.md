# World Switch Foundation — 世界切換共用基礎（Design + Plan）

> 狀態：草稿待 review + 三方對齊 · 日期 2026-06-03
> 被依賴方：居家世界（`docs/home-world-design` H1）、公仔世界（`docs/figure-world-design` F1）、旅程世界（Slice P，可選擇性 retrofit）
> 契約來源：居家 spec §1 + 公仔 spec §1（兩者逐字一致）。本文把它**收斂成單一可實作的基礎**，明確「這塊由誰做一次、三方共用」。

## 0. 一句話 + 為什麼獨立成一個 PR

三個遊戲化世界（旅程 / 居家 / 公仔）共用同一套「目前 active 哪個世界 + 完成歸哪個世界 + 怎麼選/切」的底層機制。居家 H1 與公仔 F1 **是同一塊東西**。若兩個 session 各做一套，會撞 schema、撞 World Picker、撞完成寫入邏輯。

→ **把這塊抽成一個獨立 PR（本文件），先 merge 進 main，三個世界再各自在它之上獨立開發。** 這是本文件存在的唯一理由。

## 1. 契約（authoritative — 三世界都依此）

### 1.1 Schema

```diff
model User {
+ activeWorld String?   // null = 還沒選世界（首次迎賓）。選後 'home' | 'figure' | 'journey'
}
model TaskHistory {
+ world String?   // 完成當下 activeWorld 的快照；null = 此機制上線前 / 選世界前
}
```

### 1.2 共同序章（Prologue）【定案】

選世界前的完成（`world IS NULL`）＝所有世界共享的起步基礎。

```
某世界完成數 = count(world IS NULL) + count(world = '該世界')
```

效果：(1) 選前努力不白費 (2) 晚選不吃虧 → 首次不強迫選 (3) 切新世界從序章規模起步、仍像重新經營。

### 1.3 World Picker（共用元件，兩情境）

| 情境 | 觸發 | 樣式 |
|---|---|---|
| 首次選擇 | 點「世界」入口時 `activeWorld === null` | 全屏迎賓：並排居家/公仔/旅程，各一句介紹＋預覽縮圖，選一個 → 寫 `activeWorld` |
| 之後切換 | 世界畫面內切換控制 | 同元件、輕量清單/膠囊，顯示各世界當前規模，隨時可切、不限頻、零確認 |

- 首次不強迫（工具優先）；使用者主動點側邊欄「世界」才出現迎賓。
- 切換 ＝ 純改 `User.activeWorld` 的單一 API；Picker 不含各世界渲染邏輯。

## 2. 範圍

### 做（本基礎 PR）
- Schema：`User.activeWorld` + `TaskHistory.world`（§3）。
- 完成寫入時蓋 `world` 快照（§4，比照 `locWrite`/`memWrite`）。
- 切換/設定 active world 的 API（§7）。
- **World 註冊表 + World Picker 共用元件**（§5）。
- **per-world 完成數聚合 helper**（§6，`worldScopedWhere(world)` 純函式 + TDD）——三世界共用，不各寫一份。
- 側邊欄「世界」入口 wiring（點了 → Picker；已選 → 進 active 世界的 view）。
- Backfill：既有 row `world = null`（天然就是序章，無需腳本，§8）。

### 不做（各世界自己）
- ❌ 居家房間 / 公仔萌寵 / 旅程城市的**渲染** — 各世界 spec 的 H2+/F2+/既有。
- ❌ 各世界的解鎖/成長 lib（`homeWorld.js`/`figureWorld.js`/`journeyWorld.js`）— 各自寫，但都呼叫本基礎的 `worldScopedWhere`。
- ❌ 旅程世界改讀 world-scoped（可選 retrofit，非本 PR 必須；旅程現況「看所有有 city 的完成」可繼續，未來再決定要不要也分流）。

## 3. Schema diff

```diff
model User {
  ...
+ activeWorld String?   // ★ World Switch — null=未選；'home'|'figure'|'journey'
}

model TaskHistory {
  ...
+ world String?         // ★ World Switch — 完成當下 activeWorld 快照；null=序章
  @@unique([taskId, date])
}
```

- 兩者 nullable / 無 default → 既有 row 不受影響，`prisma db push` 即可（對齊 Slice O/Q 加欄位手法）。
- ⚠️ **Prisma gotcha 檢查**（依 memory）：`activeWorld` 加在 `User`（不是 Expert）；`world` 加在 `TaskHistory`（不是 Task）。完成寫入後 round-trip 驗 DB 真的有寫（不是 200 OK 就算）。

## 4. 完成寫入：蓋 world 快照

現況 `PUT /api/tasks/[id]` 已有 `locWrite`/`memWrite` pattern（route.js L41-80）。**比照加 `worldWrite`**：

```js
// historyUpdate 解構多收一個 world
const { date, completed, value, subtaskCompletions, lat, lng, city, photoUrl, memoNote, world } = historyUpdate;
// 比照 locWrite / memWrite
const worldWrite = {};
if (world !== undefined) worldWrite.world = world;
// upsert create / update 都 spread ...worldWrite
```

- **誰提供 world 值**：`MainApp.handleUpdateProgress('toggle')` 完成時，帶上 `user.activeWorld`（可能為 null → 寫 null = 序章，完全 OK）。
- 與 location（Slice O）同一個寫入點，順手多帶一個欄位，不新增端點。
- 只在「完成（toggle 成 true）」時蓋；取消完成不需要動 world。

## 5. World 註冊表 + Picker 共用元件

### 5.1 註冊表（`lib/worlds.js`，純資料）

```js
// 每個世界提供 Picker 需要的中繼資料；渲染邏輯不在這
export const WORLDS = [
  { key: 'home',    name: '居家世界', blurb: '把完成的習慣佈置成溫馨的家', thumb: <HomeThumb/> },
  { key: 'figure',  name: '公仔世界', blurb: '養一隻會隨習慣長大的萌寵',   thumb: <FigureThumb/> },
  { key: 'journey', name: '旅程世界', blurb: '完成習慣點亮你的城市地圖',   thumb: <JourneyThumb/> },
];
```

- 各世界 session 各自提供自己那筆（thumb 元件 + scaleSummary 取得方式）。基礎 PR 先放 placeholder thumb，各世界 H2/F2 再替換。

### 5.2 `<WorldPicker>` 共用元件

- props：`mode='welcome'|'switch'`、`current`、`onPick(key)`。
- `welcome`：全屏並排（activeWorld null 時）；`switch`：輕量清單（顯示各世界 scale summary）。
- `onPick` → 呼叫 §7 API 改 activeWorld → 進該世界 view。

## 6. per-world 聚合 helper（共用純函式）

```js
// lib/worldScope.js — 三世界共用，避免各寫各的序章公式
// Prisma where 片段：序章(null) + 該世界
export function worldScopedWhere(worldKey) {
  return { OR: [{ world: null }, { world: worldKey }] };
}
// 給聚合 API 用：where = { task: { userId }, completed: true, ...worldScopedWhere('home') }
```

- TDD：null-only（純序章）、混合、空。
- 居家/公仔/（未來旅程）的聚合 API 都 `import { worldScopedWhere }`，**序章公式只有一份**。

## 7. 切換 / 設定 API

```
PATCH /api/user/profile  (或既有 user 更新端點)
  body: { activeWorld: 'home'|'figure'|'journey' }
  → 更新 User.activeWorld，回新值
```

- 沿用既有 profile 更新端點（避免新端點）；驗證 activeWorld ∈ 合法 key。
- 零確認、不限頻（零懲罰哲學）。

## 8. Backfill / migration

- 既有 `TaskHistory` row → `world` 自動 null ＝ 序章，**無需腳本**。
- 既有 `User` → `activeWorld` 自動 null ＝ 未選 → 下次點「世界」入口走迎賓。完全平滑。

## 9. 實作 plan（tasks）

| # | 任務 | 檔案 | 備註 |
|---|---|---|---|
| **W1** | schema 加 `User.activeWorld` + `TaskHistory.world`；`prisma db push` + generate | `prisma/schema.prisma` | nullable，無 default |
| **W2** | 完成寫入蓋 world（`worldWrite` 比照 locWrite/memWrite） | `api/tasks/[id]/route.js` | 多解構 + spread |
| **W3** | MainApp 完成時帶 `user.activeWorld` 進 historyUpdate | `MainApp.jsx` | toggle 完成路徑 |
| **W4** | `lib/worldScope.js` `worldScopedWhere()` + TDD | 新 lib | 序章公式單一來源 |
| **W5** | `lib/worlds.js` 註冊表 + `<WorldPicker>`（welcome+switch） | 新 lib + 新元件 | placeholder thumb |
| **W6** | 側邊欄「世界」入口 wiring（null→welcome；已選→active world view） | `MainApp.jsx` + sidebar | active world 的 view 由各世界 PR 提供，先可掛 placeholder |
| **W7** | `PATCH activeWorld` API + 驗證 | `api/user/profile/route.js` | 沿用既有端點 |
| **W8** | 測試（worldScope 單元 + 完成寫入帶 world 的 round-trip）+ build | — | round-trip 驗 DB（prisma gotcha） |

- W1–W4、W7、W8 是純基礎、無視覺爭議，可一個 PR 完成。
- W5/W6 的 Picker 需各世界提供 thumb/summary → 先 placeholder，各世界 PR 再補（不阻塞基礎 merge）。

## 10. 擁有權建議（協調重點）⚠️

1. **由先動工的一方做這個基礎 PR**（W1–W8），merge 進 main。
2. merge 後三世界各自獨立：
   - 居家世界從 H2 起（`homeWorld.js` 呼叫 `worldScopedWhere('home')`）。
   - 公仔世界從 F2 起（`figureWorld.js` 呼叫 `worldScopedWhere('figure')`）。
   - 旅程世界（Slice P）現況不變；要不要 retrofit 成 world-scoped 之後再說。
3. **三個 session 先確認**：(a) 採用本文件當基礎契約 (b) 誰做這個 PR (c) schema 命名最終 = `activeWorld` / `world`（本文件、居家 spec、公仔 spec 已一致）。
4. 做之前**務必先開 worktree**（並行 session、prisma gotchas 雙重風險）。

## 11. Acceptance Criteria

- [ ] 本文件三方（居家/公仔/旅程 session 或 PM）確認當基礎契約
- [ ] 指定一方實作 W1–W8、單一 PR merge main
- [ ] `prisma db push` 乾淨；既有 row 不受影響（round-trip 驗）
- [ ] `worldScopedWhere` TDD 綠
- [ ] WorldPicker welcome + switch 兩情境可用（placeholder thumb 可接受）
- [ ] 完成習慣後 `TaskHistory.world` 正確蓋 active world（或 null）— 驗 DB
- [ ] 既有使用者（activeWorld null）行為不變、無 regression

## 12. 待 PM / 跨 session

1. **誰實作基礎 PR**（§10.1）— 三世界誰先動誰做，或指定一方。
2. **旅程世界要不要 retrofit 成 world-scoped** — 非必須；現況可留。
3. 公仔 §9.4（多物種同池 vs 獨立池）、居家 §9.5（區域格位數）等是各世界自己的開放問題，與本基礎無關。
