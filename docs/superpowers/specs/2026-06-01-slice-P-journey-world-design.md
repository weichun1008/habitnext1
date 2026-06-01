# Slice P — 旅程世界：建構你的城市（唯讀）Design Spec

> 狀態：草稿待 review · 日期 2026-06-01 · 依賴 Slice O（座標基礎，已合併 main `bdf0c18`）
> 視覺脈絡：見 `docs/superpowers/notes/2026-05-28-gamification-exploration.md` §12 + 本 slice 的 4 張 mockup（`notes/assets/2026-06-01-sliceP-*.html`）

## 0. 一句話

把使用者「在哪裡完成習慣」的累積，渲染成一座**會越蓋越美、永遠玩不完的城市**——側邊欄新增「旅程」分頁，純 SVG、零地圖 API、**完全唯讀**（所有等級/數量都從既有 `TaskHistory` 算出來，不新增 schema）。

## 1. 範圍

### 做（Slice P）
- 側邊欄新增 `journey`（旅程）view。
- **主層＝你的主城市**（完成數最多的城市）：聚落自由生長的 SVG 城市，依完成次數長出領域旗艦地標 + 一座座建築 + 城市階級。
- **次層＝世界**：你有資料的所有城市縮影；點一座 → 進該城市的主層細節。
- **領域旗艦**：9 大 GENESIS+IO 各一種建築原型 × 3 階升級（封頂＝精通）。
- **建築數量**：同領域不封頂，依完成次數一座座加蓋（款式輪替）。
- **城市階級**：村→鎮→都市→大都會→…（門檻可續加，不會玩完）。
- **回憶 pin**：有記座標的習慣完成 → 城市裡插旗（顯示日期/習慣/領域）。
- `categoryToDomain()` 正規化 lib + 純函式 `journeyWorld` 衍生 lib（TDD）。
- 聚合 API（依城市 + 依領域算完成數）。
- 空狀態（無座標資料 → 引導開啟 Slice O 開關 / 完成第一個習慣）。

### 不做（後續 slice，本 slice 只先佔視覺位）
- 拍照回憶 pin（吃引擎）＝ **Slice Q**。
- 達人計劃 + 親簽徽章護照 ＝ **Slice R**。
- ★ 加成解鎖（特殊地點/稀有建築的真正解鎖邏輯）＝ **Slice S**（P 只畫 placeholder ★）。
- 行政區/餐廳級精細地圖、真實地圖底 ＝ 未來與 Slice Q 整合時再談（raw `lat/lng` 已存，屆時不丟資料）。
- 任何寫入：P 不改 `TaskHistory`、不新增使用者可改狀態。**純讀。**

## 2. 架構

```
側邊欄 currentView='journey'
  → <JourneyView>
       ├─ 第1層 <WorldOverview>      你有資料的城市縮影（主城市最大）
       │     └─ 點城市 → setSelectedCity → 第2層
       └─ 第2層 <CityScene city=...> 聚落 SVG（旗艦+建築+pin）+ 城市資訊面板
```

- 沿用現有 `setCurrentView(...)` sidebar 模式（不引入 bottom-tab；與 daily/manage/stats/badges 一致）。
- 預設進入時：若使用者只有 1 座城市（多數情況）→ 直接顯示該城市第 2 層，第 1 層收成頂部一排小膠囊（可切換城市）。多城市才顯示完整第 1 層世界。
- **主城市 = 該使用者「有座標的完成數」最多的城市**（自動判定，不需使用者設定）。其餘＝旅行城市。

## 3. 資料來源與衍生（零 schema 變更）

### 3.1 輸入
- `TaskHistory` where `completed = true AND city IS NOT NULL`，欄位：`date, city, lat, lng, taskId`。
- join `Task` 取 `category, title`。
- **隱私**：`trackLocation` 關 / 未授權 → 沒有 city 的完成不進地圖（符合 Slice O「只有 opt-in 才記」）。

### 3.2 `categoryToDomain(category)` — 髒值正規化（新 lib，TDD）
`Task.category` 現況混雜（實測）：domain 名（`飲食`/`運動`/`壓力與睡眠`…）、icon key（`moon`/`dumbbell`/`apple`/`briefcase`/`sun`/`droplet`/`footprints`/`yoga`/`star`）、emoji（`🏃`/`🧘`）。

解析順序：
1. 若 `category` ∈ 9 大 domain 名 → 回傳自己。
2. 否則用 `DOMAIN_TO_ICON_KEY`（constants.js）的**反查表**：icon key → domain。
3. 否則查一張小 emoji→domain 對照（`🏃→運動`、`🧘→心靈`、`🍽/🍱→飲食`…，能對就對）。
4. 都對不到 → `'other'`（仍算城市總數 + 長通用房子，但不歸任何領域旗艦）。

9 大 domain（正典 `prisma/seed/genesis-io.json`）：基因與腸道 / 環境 / 飲食 / 運動 / 壓力與睡眠 / 社交互動 / 心靈 / 認知與智慧 / 職涯與平衡。

### 3.3 `journeyWorld` 衍生（新 lib，純函式，TDD）
輸入：`[{city, domain, date, lat, lng, title}]`（已 resolve domain 的完成清單）。輸出：

```js
{
  homeCity: '台北',
  cities: [{
    city, total,                 // total = 該城市完成總數
    tier,                        // cityTier(total) → 'empty'|'village'|'town'|'city'|'metropolis'|...
    domains: [{ domain, count, flagshipLevel, buildingCount }],
    pins: [{ date, domain, title }]   // 最近 N 筆，第2層列表用
  }],
}
```

可調參數（集中在 lib 頂部常數，spec 給初值、日後微調）：
- `cityTier(total)`：`0→empty`、`1-9→village`、`10-29→town`、`30-79→city`、`80-199→metropolis`、`200+→megacity`（門檻可續加）。
- `flagshipLevel(domainCount)`：`0→0`、`1-9→1`、`10-29→2`、`30+→3`（**封頂 Lv3**）。
- `buildingCount(domainCount)`：`floor(domainCount / 5)`（**不封頂**；每 5 次 +1 棟）。
- `buildingStyleIndex(domain, n)`：決定第 n 棟的款式（輪替 3-4 種防重複），純函式。

### 3.4 確定性佈局（重要）
同一份資料 → 永遠長出同一座城（不可每次 render 亂跳）。
- 建築位置用 **seeded 佈局**：seed = hash(city + domain + index)，產生環繞中央廣場的偏移座標。**禁用 `Math.random()`**（render 期）。
- 旗艦固定錨在各領域的扇區；通用房子/樹填空隙。
- lib 提供 `layoutCity(cityData) → [{kind, domain, x, y, scale, styleIndex}]`，component 只負責畫。

## 4. 視覺系統

- 調性 A（已定案）：teal `#0d9488` + coral `#f97362` + amber `#f59e0b` + cream `#fdfbf7`；Outfit + Noto Sans TC；圓潤 SVG。
- 領域建築用**各領域既有代表色**（`genesis-io.json` 的 color，與 IconRenderer 一致）：基因與腸道#6366F1 / 環境#10B981 / 飲食#F97316 / 運動#EF4444 / 壓力與睡眠#8B5CF6 / 社交#F43F5E / 心靈#0EA5E9 / 認知#3B82F6 / 職涯#64748B。
- 9 領域旗艦原型 × 3 階（見 `notes/assets/2026-06-01-sliceP-domain-landmarks.html`）：
  - 基因與腸道＝幼苗→花圃→玻璃溫室果園
  - 環境＝一棵樹→小樹林→森林公園+湖
  - 飲食＝攤位→市集→美食廣場
  - 運動＝跑道→球場→巨蛋
  - 壓力與睡眠＝暗塔→點燈→燈塔光束
  - 社交互動＝長椅→咖啡館→熱鬧廣場
  - 心靈＝石燈→枯山水→冥想塔
  - 認知與智慧＝書攤→圖書館→天文台
  - 職涯與平衡＝工坊→辦公樓→鐘樓
- pin＝coral 圓點（白心）；★＝amber，Slice S placeholder（不可點/標「即將推出」）。
- 個別習慣**可選**小招牌：建築旁掛該習慣 lucide icon（用既有 IconRenderer）。P 先實作領域層，小招牌列為 nice-to-have（plan 內標可砍）。

## 5. 兩層互動

- **第1層 世界**：所有有資料城市的縮影（圓/小島，大小＝完成數），主城市最大。`<= 1` 城市時收成頂部膠囊列。
- **第2層 城市**：聚落 SVG（旗艦+建築+pin）＋右側/下方資訊面板：
  - 城市名 + 階級 + 總完成數（含「再 N 次升大都會」進度）。
  - 領域清單：每領域 icon + 名 + 旗艦 Lv + 建築數（例「運動 · 巨蛋 Lv3 · 13 棟」）。
  - 最近回憶 pin 列表（日期 · 習慣 · 領域）。
- 返回第1層按鈕（多城市時）。

## 6. 空狀態（分兩種）
- **`trackLocation` 關 / 從沒記過座標**：一塊標好「？」的空地 + 文案「打開『記錄完成地點』，開始建造屬於你的城市」+ 按鈕跳 ProfileModal 設定（不直接改設定，只導引）。
- **開了但今天還沒完成**：空地 + 城市名 placeholder + 「完成第一個習慣，這裡會長出你的城市」。
- 零懲罰語氣：永遠是「會長出」而非「你還沒做」。

## 7. 導覽與版位
- sidebar 新增按鈕「旅程」，icon `Map`（lucide），插在「統計」與「成就」之間。
- `currentView` 新增 `'journey'`；mobile 沿用現有 drawer 行為。
- AppHeader 標題對應「旅程」。

## 8. 元件與檔案

新增：
- `web-app/src/lib/categoryToDomain.js`（+ test）— 髒值→9 domain / 'other'。
- `web-app/src/lib/journeyWorld.js`（+ test）— tier/flagship/buildingCount/styleIndex/layoutCity 純函式。
- `web-app/src/app/api/journey/route.js` — GET `?userId=` 回傳聚合好的 `journeyWorld` 結構。
- `web-app/src/components/journey/JourneyView.jsx` — 容器（管第1/2層切換）。
- `web-app/src/components/journey/WorldOverview.jsx` — 第1層。
- `web-app/src/components/journey/CityScene.jsx` — 第2層 SVG 城市（吃 layoutCity 輸出）。
- `web-app/src/components/journey/landmarks/` — 9 領域旗艦 SVG（各含 3 階）+ 通用房子/樹 + pin。
- `web-app/src/components/journey/CityInfoPanel.jsx` — 城市/領域/pin 資訊面板。
- `web-app/src/components/journey/JourneyEmptyState.jsx`。

修改：
- `MainApp.jsx` — sidebar 新增「旅程」按鈕 + `journey` view 分支 + fetch journey 資料。
- `AppHeader.jsx` — 標題對應。

## 9. API
`GET /api/journey?userId=<id>`：
1. 查該 user `completed && city != null` 的 TaskHistory + join Task(category,title)。
2. `categoryToDomain` 逐筆 resolve。
3. `journeyWorld(rows)` 聚合 → 回傳第 3.3 結構。
- 唯讀；無 query 參數含座標；不回傳原始 lat/lng 到前端（pin 只需 city/domain/date，**座標不出 API**——隱私延續 Slice O）。

## 10. 測試（TDD）
- `categoryToDomain`：9 domain 名原樣、icon key 反查、emoji、未知→'other'、空值。
- `journeyWorld`：tier 邊界（0/1/9/10/29/30/79/80/200）、flagshipLevel 封頂於 3、buildingCount = floor(/5) 不封頂、空輸入、多城市 homeCity 取最大、pins 取最近 N。
- `layoutCity`：同輸入兩次呼叫輸出相同（確定性）、建築數對得上 buildingCount、無重疊基本檢查。
- 元件：JourneyView 空狀態 render、CityScene 給定資料渲染對應數量 landmark（RTL）。

## 11. 隱私（延續 Slice O 硬約束）
- 地圖只到**城市級**；原始 `lat/lng` 不離開後端、不進 DOM、不進 URL。
- 只渲染使用者自己 opt-in 記下的資料；關閉開關不影響已存資料但地圖回到空狀態引導。

## 12. 未來接縫（不在本 slice 實作，但設計不擋路）
- **Q 美食層**：點進城市可疊一層餐廳級美食 pin（raw 座標已存）。CityScene 預留「圖層」概念。
- **R 達人/徽章**：城市裡可加「嚮導路線」目的地 + 護照。
- **S 加成**：★ placeholder 接真正解鎖（稀有建築/特殊地點）。

## 13. 驗收
- 有座標資料的帳號進「旅程」→ 看到主城市、領域旗艦等級正確、建築數 = floor(count/5)、城市階級正確。
- 無資料帳號 → 友善空狀態 + 導引。
- 重新整理城市佈局不變（確定性）。
- 全 jest 綠 + build 綠 + production 部署後實機驗證。
- 座標不出現在任何前端可見處（DOM/network/URL 抽查）。
