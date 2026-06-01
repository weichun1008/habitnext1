# Slice O — 座標基礎（Location Foundation）

**Date:** 2026-06-01
**Status:** Design — ready for plan
**Scope:** habitnext1 web-app — 在習慣完成時（opt-in）記錄「在哪裡完成」的城市級座標，存進 TaskHistory，顯示在卡片 / TaskDetailModal。這是 Journey World 遊戲化的**資料地基**（後續 Slice P 世界地圖讀它），同時本身就是行為科學價值（anchor 升級成 context cue）。

**上層脈絡：** [`docs/superpowers/notes/2026-05-28-gamification-exploration.md`](../notes/2026-05-28-gamification-exploration.md) §12（Journey World v2 決策）。Slice O = 該 §12.5 拆解的第一個 slice。

---

## 1. 背景與動機

### 1.1 兩個價值，一份資料

使用者洞察：**地點 / 場景是習慣養成的關鍵**。BJ Fogg 的 anchor（「午餐後」）是時間性觸發；加上**地點**就升級成 context-dependent cue（「午餐後 @ 公司」「睡前 @ 家」）。Context 是習慣自動化最強的線索之一。

同一份「在哪完成」資料同時餵養兩件事：
1. **行為科學**（本 slice 即見效）：使用者在 TaskDetail 看到「我都在家完成睡前儀式」→ 強化 context 連結
2. **Journey World 世界地圖**（Slice P 之後）：每個有座標的完成 = 城市插旗的燃料

### 1.2 為什麼先做這個（地基優先）

Journey World 是大方向（§12.5 拆 O→P→Q→R→S）。Slice O 是地基：
- **自帶價值**：就算世界地圖還沒做，「@台北」已經是 anchor v2，顯示在 detail / 完成流程
- **低風險**：純加欄位 + 一個 opt-in 開關 + 純前端定位 helper，不動既有流程的預設行為
- **其他全依賴它**：P 的城市節點、Q 的飲食 pin、S 的特殊地點都讀這份座標

---

## 2. v1 目標

opt-in 的使用者在完成習慣時，自動（或手動）記錄城市級地點，存進該日完成紀錄，並在卡片 + detail 顯示。**零地圖 API、零成本、隱私優先。**

### 場景

```
使用者到 Profile 開啟「記錄完成地點 📍」(預設關)
  → 瀏覽器跳一次定位授權（opt-in）
  → 之後完成習慣（打勾）時：
       - 用快取座標（>15 分鐘才重新 getCurrentPosition）
       - 離線比對最近城市中心點 → "台北"
       - 靜默存進 TaskHistory.{lat,lng,city}
  → 完成的卡片顯示「📍台北」chip
  → 比對錯 / 想改 → 點 chip → 從最近城市選 or 搜尋離線清單
  → TaskDetailModal 該日完成也顯示地點
```

---

## 3. Non-goals（v1 不做）

- ❌ **世界地圖 / 旅程分頁** — 那是 Slice P
- ❌ **飲食拍照 pin** — Slice Q
- ❌ **背景 GPS 追蹤 / 軌跡** — 只在完成當下一次性取座標
- ❌ **接任何地圖 / reverse-geocode API** — 城市名走離線比對
- ❌ **精確 GPS 顯示 / 街道級** — 只到城市級
- ❌ **走路 / 步數** — 已從整個方向移除（§12）
- ❌ **歷史完成的回溯補座標** — 只記「開啟功能後」的新完成
- ❌ **跨裝置座標同步以外的處理** — 存 DB 數字即可

---

## 4. Schema diff

```diff
model TaskHistory {
  id        String   @id @default(cuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  date      String   // YYYY-MM-DD
  completed Boolean  @default(false)
  value     Int      @default(0)
  subtaskCompletions Json?
+ // ★ Slice O — 「在哪完成」城市級座標（opt-in）。只存數字 + 離線比對的城市名，
+ // 不接地圖 API、不做背景追蹤。null = 沒記錄（功能關或無授權）。
+ lat       Float?
+ lng       Float?
+ city      String?  // 離線比對最近城市中心點的結果，如 "台北"。可被使用者手動覆寫。

  @@unique([taskId, date])
}

model User {
  ...
+ trackLocation Boolean @default(false)  // ★ Slice O — opt-in 記錄完成地點
}
```

**Migration**：兩個都 nullable / 有 default，既有 row 不受影響。`prisma db push` 即可。

**為什麼存在 TaskHistory 而非 Task**：一個 task 多天完成 → 多筆 history → 各有各的地點。語意 = 「你在 X 日、在哪裡完成了這個習慣」。存 Task 上會被覆蓋、語意錯。

---

## 5. 元件與架構

### 5.1 新建

| 路徑 | 責任 |
|---|---|
| `web-app/src/lib/cities.js` | 離線城市中心點 JSON（~幾百個）+ `nearestCity(lat, lng)` 最近鄰居 + `searchCities(q)` |
| `web-app/src/lib/__tests__/cities.test.js` | nearestCity / searchCities 的 TDD |
| `web-app/src/lib/geolocation.js` | `getCachedPosition({ maxAgeMs })` 包裝 `navigator.geolocation.getCurrentPosition`，快取 + 權限處理 |
| `web-app/src/components/taskCard/LocationChip.jsx` | 「📍台北」chip + 點開的城市選擇 popover（最近城市 + 搜尋）|

### 5.2 修改

| 路徑 | 改動 |
|---|---|
| `web-app/prisma/schema.prisma` | TaskHistory 加 lat/lng/city；User 加 trackLocation |
| `web-app/src/app/api/tasks/[id]/route.js` | PUT 的 historyUpdate 接受 `lat`/`lng`/`city` 寫進 TaskHistory upsert |
| `web-app/src/app/api/user/profile/route.js`（或現有 profile 更新端點）| 接受 `trackLocation` 更新 |
| `web-app/src/components/MainApp.jsx` | `handleUpdateProgress`('toggle') 完成時：若 `user.trackLocation` → 取快取座標 → nearestCity → 帶 lat/lng/city 進 historyUpdate |
| `web-app/src/components/TaskCard.jsx` | 完成的卡片渲染 `<LocationChip>`（有 city 時）|
| `web-app/src/components/TaskDetailModal.jsx` | 該日完成顯示地點 + 可改 |
| `web-app/src/components/ProfileModal.jsx` | 加「記錄完成地點 📍」opt-in 開關（含隱私說明）|

### 5.3 離線城市清單

`lib/cities.js` 內建 curated JSON。涵蓋：
- **台灣**：全 22 縣市 + 主要鄉鎮（~30）
- **主要亞洲城市**：東京/大阪/首爾/香港/新加坡/曼谷/上海/北京…（~40）
- **全球主要城市 / 首都**：紐約/倫敦/巴黎/雪梨…（~60）

每筆：`{ name: '台北', lat: 25.03, lng: 121.56, country: 'TW' }`。`nearestCity` = haversine 最近鄰居。總量 ~130-150，bundle 體積 < 10KB，零 API。

> 涵蓋不到的偏遠地點 → nearestCity 仍回最近的城市（可能偏），使用者可手動改。v2 可擴充清單。

---

## 6. 資料流（完成習慣時）

```
使用者打勾完成
  ↓
MainApp.handleUpdateProgress(task, 'toggle')
  ↓
if (user.trackLocation) {
   pos = await getCachedPosition({ maxAgeMs: 15*60*1000 })   // lib/geolocation
   if (pos) {
      city = nearestCity(pos.lat, pos.lng)                   // lib/cities
      historyUpdate = { date, completed:true, value, lat, lng, city }
   } else {
      historyUpdate = { date, completed:true, value }        // 無授權 → 不帶座標
   }
} else {
   historyUpdate = { date, completed:true, value }            // 功能關 → 不帶座標
}
  ↓
PUT /api/tasks/:id { historyUpdate }   // upsert TaskHistory 含 lat/lng/city
  ↓
卡片顯示 📍台北 chip
```

**快取策略**：`getCachedPosition` 在 module-level 存上次座標 + 時間戳；15 分鐘內直接回快取，不再叫 `getCurrentPosition`（避免每次打勾都觸發定位、省電省權限彈窗）。

---

## 7. 隱私（硬性）

1. **預設關**：`User.trackLocation` default false。完全不影響不開啟的使用者。
2. **明確 opt-in**：開啟時 Profile 顯示說明「僅在你完成習慣時記錄城市、只存座標數字、不會背景追蹤你的位置」。
3. **只存數字 + 城市名**：DB 不存地址、不 reverse-geocode、不打任何外部 API。
4. **不放 URL**：座標永不進 query string / route param。
5. **可關可改**：隨時關閉開關（停止記錄，已存的不動）；每筆地點可手動覆寫。
6. **瀏覽器權限**：用標準 `navigator.geolocation`，瀏覽器自己的權限機制把關；拒絕 → 靜默 fallback（不記座標、不報錯騷擾）。

---

## 8. 已敲定的設計決策

| # | 議題 | 決定 |
|---|---|---|
| 1 | 座標住哪 | TaskHistory.{lat,lng,city}（每日完成紀錄）|
| 2 | 城市名怎麼來 | 內建離線城市中心點 JSON + 最近鄰居（零 API）|
| 3 | 何時抓座標 | 全局 opt-in 開關（預設關）+ 快取座標（15 分鐘 TTL）+ 靜默存 |
| 4 | 抓不到 / 拒絕授權 | 靜默 fallback：不記座標、不報錯；使用者可事後手動點 chip 補 |
| 5 | 顯示位置 | 完成卡片 chip「📍城市」+ TaskDetailModal 該日 |
| 6 | 手動 fallback | 點 chip → 最近城市清單 + 搜尋離線清單 |
| 7 | 城市清單範圍 | 台灣全 + 主要亞洲 + 全球主要，~130-150 筆 |
| 8 | 隱私 | 預設關、opt-in、只存數字、不背景追蹤、不進 URL |

---

## 9. Acceptance Criteria

- [ ] `prisma/schema.prisma`：TaskHistory 加 lat/lng/city + User 加 trackLocation；`prisma db push` 乾淨
- [ ] `lib/cities.js`：130+ 城市 JSON + `nearestCity` + `searchCities`，TDD 綠
- [ ] `lib/geolocation.js`：`getCachedPosition` 快取 + 權限 graceful fallback
- [ ] Profile 有「記錄完成地點 📍」開關（預設關 + 隱私說明），存進 `User.trackLocation`
- [ ] 開啟後完成習慣 → TaskHistory 寫入 lat/lng/city（驗 DB）
- [ ] 關閉 / 拒絕授權 → 完成習慣不寫座標、無報錯
- [ ] 完成卡片顯示「📍城市」chip；點 chip 可改城市
- [ ] TaskDetailModal 該日完成顯示地點
- [ ] 既有使用者（trackLocation=false）行為完全不變、無 regression
- [ ] 全測試綠 + build 過

---

## 10. 留實作前的細節（不影響 spec）

1. **getCachedPosition 的精度旗標**：`enableHighAccuracy: false`（城市級不需要高精度、省電、快）；timeout 8s。
2. **LocationChip popover 的「最近城市」**：取使用者近期出現過的 city（從 TaskHistory distinct city）+ 當前座標 nearestCity 前幾名。
3. **Profile 開關第一次開啟**：要不要立刻觸發一次 getCurrentPosition 確認授權？建議要（讓使用者當下看到瀏覽器權限彈窗、確認可用），但失敗不擋開關。
4. **city 手動覆寫後**：是否鎖住不再被自動比對覆蓋？v1：手動改了就以手動為準（該筆 history 不再自動覆寫）。
5. **cofit webview 環境**：webview 可能無 geolocation 權限 → 一律走手動 fallback；不報錯。
