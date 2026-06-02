# Slice Q — 吃引擎 / 美食回憶 pin（Food Engine · Memory Photos）

> ✅ **已定案（2026-06-02 PM 拍板）** — 方案 **C-Q1**。
>
> PM 決策鎖定：方向 **C-Q1** · 儲存 **Vercel Blob 公開不可猜 URL（經 `/api/memory` 授權端點）** · 粒度 **城市級** · 慶祝 **只安靜計數行（掉落慶祝留 Q2）** · caption **`memoNote` 做（選填）** · **單張/完成** · **不加 profile 全域開關**（逐次 opt-in）· dev=prod **key 前綴 + teardown 腳本清理**。
> 探索 §5 / 本文 §11 的開放問題據此全數答畢。

> **執行分界（因 Blob token 尚未供應）：**
> - **Q1a（token-無關，先做）**：schema (`photoUrl`/`memoNote`)、`imageCompress` lib (TDD)、journey 讀取改動（pin 帶 `id`+`hasPhoto`、公開彙整不帶 `photoUrl`）、`GET /api/memory/[id]` 授權端點、`PolaroidPin`、`CityInfoPanel` 縮圖+計數行、`MemoryCapture` UI 殼（檔案選擇+客戶端縮圖剝 EXIF+預覽）、`PUT /api/tasks/:id` 鏡像 `memWrite`。**實際 Blob 上傳呼叫先 guard（無 token 時友善停用）。**
> - **Q1b（token-相關，待 PM 開 Vercel Blob store）**：`@vercel/blob` 客戶端直傳 handler 接線、真機上傳 smoke、生命週期刪 blob、部署。

**Date:** 2026-06-02
**Status:** APPROVED (C-Q1) — 執行中（Q1a 先行；Q1b 待 Blob token）
**Scope:** habitnext1 web-app — 在「已記錄地點的完成」上，讓使用者**自願**補一張當餐照片；照片以 polaroid 回憶 pin 落在 Slice P 的 CityScene 城市地圖，並在 CityInfoPanel 顯示縮圖。**城市級呈現、零地圖 API、座標不出前端。**

**上層脈絡：** Journey World v2（§12.5 拆 O→P→**Q**→R→S）。Slice Q = 該系列第三個 slice，讀取路徑端到端已由 Slice P 建好（[`api/journey`](../../../web-app/src/app/api/journey/route.js) → [`journeyWorld.aggregateJourney`](../../../web-app/src/lib/journeyWorld.js) → [`CityScene`](../../../web-app/src/components/journey/CityScene.jsx) → [`MemoryPin`](../../../web-app/src/components/journey/landmarks/MemoryPin.jsx)），目前只是餵空資料。

---

## 1. 背景與動機

### 1.1 一句話

讓使用者在完成（已定位的）飲食/任意習慣時，**自願**補一張當餐照片；這張照片成為 Slice P 城市地圖裡最豐富的收藏物——不是抽象分數，而是真實世界的戰利品，把「我是一個好好吃飯的人」這個身份錨定到具體的時間與地點。

### 1.2 為什麼是「最便宜的勝利」

Slice P 的讀取路徑**早已串通、只是裝飾性**：`CityScene` L81-85 已迴圈渲染 `MemoryPin` 珊瑚色點，但 pin 物件（`journeyWorld.js` L54 `{date, domain, title}`）裡沒有照片。Slice Q **只多餵一個安全欄位**，pin 就從裝飾點變成 polaroid 回憶。

| 面向 | 現況（Slice P 後） | 對 Slice Q 的意義 |
|---|---|---|
| 資料 | `TaskHistory` 已有 `lat/lng/city`（Slice O）、`@@unique([taskId, date])` | 一張照片基數（1 張/完成）與 `city` 一致，天生屬同一列 |
| 寫入 | `api/tasks/[id]` upsert 已有 `locWrite` 模式（L47-50, L64, L72） | 照片寫入**鏡像** `locWrite` → `memWrite`，DB 寫入**不需新端點** |
| 讀取 | `api/journey` 的 `select` **刻意只取 `date/city/task.*`、不取 `lat/lng`**（L15） | Slice Q 延續這條紅線；照片 bytes 走**獨立授權端點**、不烤進公開彙整 |
| pin 定位 | `CityScene` pin 是**確定性裝飾散佈**（L16-22），**從不用 `lat/lng`** | 城市級呈現**完全不動隱私**——本來就沒用座標擺東西 |
| 二進位儲存 | **零**（無 `@vercel/blob` / `next.config` / `next/image` / `sharp` / 上傳路由） | 專案**第一個**二進位儲存決策，greenfield |
| 環境 | dev 與 prod **共用一個 Neon DB**（也將共用一個 Blob store） | dev 上傳 = 真 prod 資料，清理機制**必備** |

### 1.3 為什麼是方案 C 的 Q1（而非 A 或 B）

- **純 A** 把照片 URL 烤進公開彙整；日後若食物照要簽章私有存取，會逼著改 `aggregateJourney`——重工。
- **純 B** 一次吞下首個二進位承諾 + egress/隱私成本 + 全新「美食圖層」+ 讓 CityScene 可動畫，而且**仍交付不出 GPS 餐廳 pin**（那要開 P 留下的座標閘門）。在還沒驗證有人願意拍照前投入 12-16 任務，賭注太大。
- **C 的 Q1** 交付物幾乎=A，但多花極少成本切對兩道縫，讓 B（v2 吃引擎全貌）**無重工**接上。詳見 §3。

---

## 2. v1（Q1）目標

opt-in 使用者在**已記錄地點的完成**上，自願附一張當餐照片；照片落地成城市級 polaroid pin + CityInfoPanel 縮圖 + 安靜「已收進旅程」確認 + 安靜「第 N 個回憶」計數行。**零地圖 API、座標不出前端、照片 bytes 走授權端點。**

### 場景

```
使用者完成一個（已 trackLocation 記到城市的）習慣
  → 完成卡片出現安靜的次要 affordance：ImagePlus「拍下這餐」（可略過，零成本）
  → 點開 → 原生檔案選擇器（capture="environment"，非自訂相機）
  → 客戶端 canvas 縮圖到 ~1280px / JPEG ~0.8（同時剝除 EXIF/GPS、烘正方向）
  → 直傳 Vercel Blob → 得到 blob URL
  → 靜默存進 TaskHistory.photoUrl（+ 選填 memoNote）
  → 安靜 toast「已收進旅程」（不計分、不慶祝）
  → 旅程分頁該城市的 CityScene：該完成變成 PolaroidPin（縮圖貼片）
  → CityInfoPanel「最近紀錄」該列出現縮圖、可點放大
  → 城市資訊出現安靜計數行「台北 · 8 個美食回憶」
```

---

## 3. 兩道承重縫（C 與 A 的唯一差異 · 讓 B 無重工）

1. **公開彙整只帶 `hasPhoto` 布林 + 穩定 `id`，照片 bytes 走授權端點。**
   `api/journey` 的 pin 物件**不帶 `photoUrl`**；圖片 bytes 由新的 `GET /api/memory/[historyId]` 授權後 302 轉址（或串流）。→ 日後把 Blob 換成簽章/短效 URL，**不必碰 `aggregateJourney`**。
2. **pin 物件從 Q1 就帶穩定 `id`（= `TaskHistory.id`）。**
   慶祝、點擊開圖、Q2 的圖層都有可定址目標。`journeyWorld.aggregateJourney` 的 pin 形狀從 `{date, domain, title}` 升級為 `{id, date, domain, title, hasPhoto}`。

> 這兩道縫是 C 比純 A 多出的全部成本：一個布林欄位 + 一個授權端點 + pin 帶 id。其餘交付物與 A 相同。

---

## 4. Non-goals（Q1 不做 · 全部留給 Q2 / 探索 §5）

- ❌ **餐廳級真實座標 pin** — 需開 Slice P 留下的 `lat/lng`→前端閘門，與 Slice O「Zero map API / 座標不出前端」紅線抵觸。**預設不開**；raw 座標維持「已存但未呈現」。（探索 §5 Q2）
- ❌ **「美食圖層」toggle**（base 聚落 ⇄ 餐廳細節 overlay）— P §12 只是**設計意圖、非現有程式碼**；CityScene 今天無圖層抽象。留 Q2。
- ❌ **掉落 + spring 慶祝 toast**（「這是你在台北的第 8 個回憶 · 8/15」動畫）— Q1 只出**安靜計數行**；先驗證有人願拍，再工程化慶祝（避免過早遊戲化）。留 Q2。
- ❌ **自訂 `getUserMedia` 相機流程** — Q1 只用原生 `<input capture>`，零自訂相機工作。
- ❌ **單一完成多張照片** — Q1 一列一張（inline `photoUrl`）。多張 → 升級到 `Memory` 關聯（探索 §5 Q4），本身是加法式 migration，留未來。
- ❌ **caption 之外的後設資料** — 不存標籤、評分、餐點分類。
- ❌ **歷史完成回溯補照片** — 只記「開啟後」的新附加（與 Slice O 同調）。
- ❌ **`next/image` 優化 / `next.config` `remotePatterns`** — 刻意用純 `<img>`，避免新建設定檔。

---

## 5. 已敲定的設計決策（在「採用方案 C-Q1」前提下）

| # | 議題 | 決定 | 為何 |
|---|---|---|---|
| 1 | 照片住哪 | `TaskHistory.photoUrl String?`（每日完成紀錄、inline） | 與 `lat/lng/city` 同列、同基數；不過早建關聯 |
| 2 | bytes 存哪 | **Vercel Blob 客戶端直傳** | 原生於 Vercel；繞過 ~4.5MB serverless body 上限；存 URL 字串直塞 `photoUrl` |
| 3 | 隱私剝除 | **客戶端 canvas 縮圖 ~1280px / JPEG ~0.8** | 一石三鳥：壓到 body 限制下 + **免費剝除 EXIF（含 GPS）** + 砍 egress |
| 4 | 方向 | canvas 烘焙前**先讀 orientation EXIF** 再旋轉 | canvas 重編碼會丟方向 EXIF，不處理照片會躺著 |
| 5 | 渲染 | 純 `<img src>` | 避免新建 `next.config` + `remotePatterns` |
| 6 | 公開彙整暴露什麼 | 只 `hasPhoto` 布林 + 穩定 `id`，**不帶 `photoUrl`** | 承重縫①：日後換簽章 URL 不碰 aggregate |
| 7 | bytes 怎麼取 | `GET /api/memory/[historyId]` 授權後轉址 | 唯一吐 blob URL 的點，可換實作 |
| 8 | 捕捉 UX | 完成列上安靜次要 `ImagePlus` + 原生 `<input capture>` | opt-in、零摩擦、無自訂相機 |
| 9 | 確認 | 安靜「已收進旅程」toast | 零懲罰、不計分 |
| 10 | 慶祝 | Q1 只安靜計數行；掉落慶祝留 Q2 | 先驗證需求再工程化慶祝 |
| 11 | caption | `memoNote String?`（選填，純文字、短） | 幾乎免費，豐富回憶；不做也可（見 §6 註） |
| 12 | dev=prod 清理 | key 前綴 + 手動 / teardown 腳本 | 必備，非 nice-to-have |

> 探索 §5 的 Q1/Q3/Q5 在此被預設答為「公開但不可猜的 Blob URL（經授權端點）／原生檔案選擇器／安靜計數行」。**這些是 DRAFT 假設，PM 可推翻。**

---

## 6. Schema diff

```diff
model TaskHistory {
  id                 String  @id @default(cuid())
  taskId             String
  task               Task    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  date               String // YYYY-MM-DD
  completed          Boolean @default(false)
  value              Int     @default(0)
  subtaskCompletions Json?
  // ★ Slice O — 城市級座標（opt-in）
  lat                Float?
  lng                Float?
  city               String?
+ // ★ Slice Q — 美食回憶照片（opt-in）。存 Vercel Blob 的 URL 字串；bytes 不在 DB。
+ // null = 未附照片。剝除 EXIF/GPS 後上傳，城市級紅線不變。
+ photoUrl           String?
+ memoNote           String?  // 選填短 caption；不做多張、不做標籤

  @@unique([taskId, date])
}
```

**User 不加任何欄位。** 探索文件指出「照片 affordance 掛在已定位的完成上、沿用 Slice O 的 opt-in 心智」——附照片本身就是逐次 opt-in（使用者刻意點 + 刻意選檔），無需全域開關。是否要一個獨立的「啟用美食回憶」profile 開關，列為 §11 待 PM 決策（預設**不加**，最小 schema）。

**Migration**：兩欄皆 nullable、無 default 變更，既有 row 不受影響。`prisma db push` 即可。`memoNote` 若 PM 認為 Q1 不需要 caption，可一併移除，降到**單欄** `photoUrl` 的純加法 delta。

---

## 7. 元件與架構

### 7.1 新建

| 路徑 | 責任 |
|---|---|
| `web-app/src/lib/imageCompress.js` | `compressImage(file, { maxEdge:1280, quality:0.8 })` → 讀 orientation EXIF、烘正方向、canvas 重編碼 JPEG、回 `Blob`。**重編碼 = 剝除所有 EXIF（含 GPS）**。 |
| `web-app/src/lib/__tests__/imageCompress.test.js` | TDD：方向矩陣（1/3/6/8）、輸出尺寸上限、輸出無 EXIF（測 marker 不存在）。 |
| `web-app/src/app/api/memory/[historyId]/route.js` | `GET` — 驗證該 history 屬請求者後，回 `photoUrl`（302 轉址或代理串流）。**唯一吐 blob URL 的點**（承重縫①）。可選 `DELETE` — 移除照片 + 刪 blob。 |
| `web-app/src/app/api/upload/route.js`（或 Blob client-upload handler） | Vercel Blob 客戶端直傳所需的 server token handler（`handleUpload`），含 key 前綴 `mem/{userId}/{historyId}`、size/type 白名單。 |
| `web-app/src/components/journey/landmarks/PolaroidPin.jsx` | `MemoryPin` 的兄弟：有照片的 pin 渲染 polaroid 縮圖貼片（白框 + `<image href>` 縮圖 + 珊瑚別針）。無照片仍用 `MemoryPin`。 |
| `web-app/src/components/journey/MemoryCapture.jsx` | 完成列上的安靜 `ImagePlus` affordance + 原生 `<input type="file" accept="image/*" capture="environment">` + 上傳中態 + 「已收進旅程」toast。 |

### 7.2 修改

| 路徑 | 改動 |
|---|---|
| `web-app/prisma/schema.prisma` | `TaskHistory` 加 `photoUrl` (+ `memoNote`) |
| `web-app/package.json` | 加 `@vercel/blob`（目前無） |
| `web-app/src/app/api/tasks/[id]/route.js` | upsert **鏡像 `locWrite` → `memWrite`**：`if (photoUrl !== undefined) memWrite.photoUrl = photoUrl`（+ memoNote），spread 進 update/create。**不需新寫入端點。** |
| `web-app/src/app/api/journey/route.js` | `select` 加 `id: true, photoUrl: true`；map 出 `hasPhoto: !!h.photoUrl`、`id: h.id`。**仍不取 `lat/lng`。`photoUrl` 不進回傳 payload**（只用來算布林）。 |
| `web-app/src/lib/journeyWorld.js` | `aggregateJourney` pin 形狀 L54 升級：`c.pins.push({ id: r.id, date, domain, title, hasPhoto: r.hasPhoto })`；`PIN_LIMIT` 維持 12。 |
| `web-app/src/components/journey/CityScene.jsx` | `pinNodes` 迴圈 L81-85 分支：`pin.hasPhoto ? <PolaroidPin .../> : <MemoryPin .../>`；`PolaroidPin` 的 `src` = `/api/memory/${pin.id}`。散佈邏輯（L16-22）不動。 |
| `web-app/src/components/journey/CityInfoPanel.jsx` | 「最近紀錄」列（L54-67）：`p.hasPhoto` 時前置縮圖 `<img src={/api/memory/${p.id}}>`，可點放大；底部加安靜計數行「{city} · {pins.filter(p=>p.hasPhoto).length} 個美食回憶」。 |
| `web-app/src/components/TaskCard.jsx` | 已定位完成的卡片（`locationByDate[date]` 有值）旁掛 `<MemoryCapture>`。 |
| `web-app/src/components/MainApp.jsx` | 新 handler `handleAttachPhoto(task, dateStr, file)`：`compressImage` → Blob 直傳 → `PUT /api/tasks/:id { historyUpdate: { date, completed:true, value, photoUrl } }`（鏡像 `handlePickLocation` L449-468 的形狀）；樂觀更新本地 `photoByDate`。 |

### 7.3 不碰

- `lat/lng` 讀取路徑（journey select 維持剝座標）。
- `CityScene` 的確定性散佈演算法（pin 位置仍裝飾性、不用座標）。
- `JourneyView` / `WorldOverview` 的圖層 / 慶祝（Q2）。
- `next.config.*`（仍不存在）、`next/image`、`sharp`。

---

## 8. 資料流

### 8.1 附加照片（寫入）

```
使用者在已定位完成的卡片點 ImagePlus
  ↓ 原生 <input capture> 選檔
MemoryCapture → compressImage(file)              // lib/imageCompress：縮圖 + 剝 EXIF + 烘方向
  ↓ 得乾淨 Blob（無 GPS）
Vercel Blob client upload (key: mem/{userId}/{historyId})
  ↓ 得 blobUrl
MainApp.handleAttachPhoto:
  PUT /api/tasks/:id { historyUpdate: { date, completed:true, value, photoUrl: blobUrl } }
  ↓ upsert TaskHistory（memWrite.photoUrl）       // 鏡像 locWrite
安靜 toast「已收進旅程」+ 樂觀更新本地縮圖
```

### 8.2 呈現（讀取 · 座標不出後端）

```
GET /api/journey?userId
  ↓ select { id, date, city, photoUrl, task:{category,title} }   // 仍不取 lat/lng
  ↓ map → { id, city, domain, date, title, hasPhoto:!!photoUrl } // photoUrl 不進 payload
aggregateJourney → pins:[{ id, date, domain, title, hasPhoto }]
  ↓
CityScene: hasPhoto ? <PolaroidPin src=/api/memory/:id> : <MemoryPin>
CityInfoPanel: hasPhoto 列前置縮圖 + 計數行
  ↓ 縮圖 src 觸發 GET /api/memory/:id
GET /api/memory/:id → 驗 ownership → 302 → blobUrl
```

**關鍵**：公開彙整 payload 內**永遠沒有 `photoUrl`**；bytes 只能經 `/api/memory/:id` 取得（承重縫①）。

---

## 9. 隱私（硬性）

1. **雙重 opt-in**：照片只出現在**已定位完成**（已需 Slice O `trackLocation`）+ 使用者**刻意**附加（刻意點 + 刻意選檔）。略過零成本。
2. **EXIF / GPS 強制剝除**：canvas 重編碼移除所有 EXIF（含手機照片的精確 GPS）。**這是 Slice O 城市級紅線的延伸**——否則手機照會把街道級 GPS 偷渡回伺服器，打穿城市級姿態。為**正確性關鍵**，須實測（§10 測試）。
3. **座標仍不出前端 / URL**：城市級用確定性散佈，從不用 `lat/lng`；`api/journey` select 仍不取座標。餐廳級（會開閘門）明列 Non-goal。
4. **照片 bytes 不進公開彙整**：`photoUrl` 不出現在 journey payload；只經授權端點 `/api/memory/:id`（驗 ownership）。
5. **「公開但不可猜」URL 的誠實限制**：blob URL 一旦在 `<img src>` 必然外露於該使用者瀏覽器（security-through-obscurity）。**若 PM 認定食物照為真正隱私 → 需簽章 / 短效存取（跳級 S3/Cloudinary，成本/工時上升）**——承重縫①讓此替換不必改 aggregate。列為 §11 必答。
6. **生命週期清理（必接，否則孤兒 blob = 成本 + 隱私責任）**：
   - 使用者移除照片 → 刪 blob + 清 `photoUrl`。
   - 解除完成 / 刪任務（`onDelete: Cascade` 刪 history）→ 連帶刪對應 blob。
   - 重新附照片覆蓋 → 刪舊 blob。
7. **dev=prod**：dev 上傳即真 prod 資料；key 前綴 `mem/{userId}/{historyId}` + 手動 / teardown 清理腳本（§11 Q7）。

---

## 10. 測試

**單元（TDD · imageCompress 是正確性核心）**
- `imageCompress`：方向矩陣（EXIF orientation 1/3/6/8 → 輸出像素方向正確）。
- `imageCompress`：長邊 > 1280 → 縮到 ≤1280；長邊 < 1280 → 不放大。
- `imageCompress`：輸出 JPEG **不含 EXIF marker**（驗 GPS/orientation segment 不存在）= 隱私關鍵斷言。
- `journeyWorld.aggregateJourney`：pin 形狀含 `id` + `hasPhoto`；`PIN_LIMIT` 仍 12；混合 hasPhoto/無照片排序穩定。

**整合 / API**
- `PUT /api/tasks/:id` 帶 `photoUrl` → upsert 寫入；不帶 → 既有 `photoUrl` 不被清掉（鏡像 locWrite 語意）。
- `GET /api/journey`：回傳含 `hasPhoto`/`id`、**payload 內無 `photoUrl`、無 `lat`、無 `lng`**（隱私 regression 斷言）。
- `GET /api/memory/:id`：屬本人 → 取得；非本人 → 401/404。
- 生命週期：刪 history / 覆蓋照片 → 對應 blob 被刪（孤兒檢查）。

**瀏覽器冒煙（verification-before-completion）**
- 真機拍直式照片 → 上傳 → CityScene PolaroidPin 與 CityInfoPanel 縮圖**方向正確**（非躺平）。
- 略過附照片的完成 → 行為與 Slice P 完全相同、無 regression。
- 未開 `trackLocation` 的使用者 → 看不到 MemoryCapture affordance。

---

## 11. 待 PM 決策（核准本 DRAFT 前必答 · 對應探索 §5）

1. **方向**：採方案 **C-Q1（本 spec）**？還是 A（最快、日後重工風險）／ B（願景全貌、最重、需隱私簽核）？**若非 C-Q1，本 spec 作廢。**
2. **隱私姿態（決定底座）**：接受「公開但不可猜」Blob URL（經 `/api/memory` 授權端點）？還是食物照為真正隱私、要簽章 / 短效存取（→ 跳級 S3/Cloudinary，成本/工時上升）？
3. **caption**：要 `memoNote` 嗎？不要 → schema delta 降到單欄 `photoUrl`。
4. **多張照片**：Q1 確定一列一張（inline）？若預期多張，現在就該升級 `Memory` 關聯（避免日後 migration）。
5. **獨立 profile 開關**：要不要一個全域「啟用美食回憶」開關（→ `User` 加一欄）？預設**不加**（逐次 opt-in 已足）。
6. **計數行 vs 慶祝**：Q1 確定只安靜計數行、掉落 spring 慶祝留 Q2？
7. **dev=prod 清理**：接受 key 前綴 + 手動 / teardown 腳本的最小清理故事？

---

## 12. Acceptance Criteria（Q1）

- [ ] `schema.prisma`：`TaskHistory` 加 `photoUrl`（+ 視 §11 Q3 的 `memoNote`）；`prisma db push` 乾淨；既有 row 不變。
- [ ] `package.json`：加 `@vercel/blob`。
- [ ] `lib/imageCompress.js`：縮圖 + 方向烘焙 + EXIF/GPS 剝除，TDD 綠（含「輸出無 EXIF」斷言）。
- [ ] Vercel Blob 客戶端直傳可用（key 前綴 `mem/{userId}/{historyId}`、type/size 白名單）。
- [ ] `PUT /api/tasks/:id` 鏡像 `locWrite` 寫入 `photoUrl`；不帶不清空。
- [ ] `GET /api/journey`：回 `id` + `hasPhoto`；**payload 無 `photoUrl` / `lat` / `lng`**（隱私斷言綠）。
- [ ] `GET /api/memory/:id`：ownership 驗證；非本人擋下。
- [ ] `MemoryCapture` 只在已定位完成顯示；原生檔案選擇器；上傳中態 + 安靜「已收進旅程」toast。
- [ ] `CityScene`：`hasPhoto` 的 pin 渲染 `PolaroidPin` 縮圖（方向正確）；其餘仍 `MemoryPin`；散佈不變。
- [ ] `CityInfoPanel`：有照片列顯示縮圖可放大 + 安靜計數行。
- [ ] 生命週期：移除照片 / 刪 history / 覆蓋 → blob 不留孤兒。
- [ ] 略過附照片 / 未開 trackLocation 的使用者：行為與 Slice P 完全一致、無 regression。
- [ ] 全測試綠 + build 過 + 真機方向冒煙過。

---

## 13. 未來接縫（Q2 / 之後 · 不在本 spec）

- **掉落 + spring 慶祝 toast**（「這是你在台北的第 8 個回憶 · 8/15」）掛 `JourneyView`。pin 已帶穩定 `id`，慶祝有可定址目標。
- **美食圖層 toggle**（base 聚落 ⇄ 餐廳細節 overlay）：真正蓋出 CityScene 的圖層抽象（P §12 只是意圖）。
- **餐廳級真實座標 pin**：開 Slice P 留下的 `lat/lng`→前端閘門——**需 PM 對「座標不出前端」紅線的明確簽核**。raw 座標已存在伺服器，維持「已存未呈現」直到此決策。
- **簽章 / 短效照片存取**：若隱私升級，把 `/api/memory/:id` 的實作從 Blob 302 換成簽章 URL——**不必碰 `aggregateJourney`**（承重縫①的回報）。
- **多張照片**：升級 `TaskHistory.photoUrl` → `Memory` 關聯（反向關聯虛擬，加法式 migration）。

---

## 14. 守則檢查

| 守則 | 是否遵守 | 說明 |
|---|---|---|
| opt-in 隱私 | ✅ | 雙重 opt-in（已定位完成 + 刻意附加）；略過零成本。 |
| 座標不出前端 / URL | ✅（城市級） | 確定性散佈、不用 `lat/lng`；journey select 仍剝座標。餐廳級明列 Non-goal / Q2。 |
| 無 emoji、用 lucide | ✅ | UI icon 用 `ImagePlus` / `Camera` / `MapPin` / `Image` / `Check`；文件與 UI 皆無 emoji。 |
| 零懲罰 | ✅ | 無 streak / 點數；未拍照的完成仍是完整完成；空城市不責備；安靜「已收進旅程」只確認不計分。 |
| 行為科學 > 遊戲化 | ✅ | 身份錨定 + 可見進度 + 自主性；慶祝刻意配給到 Q2。**誠實限制**：本機制為回憶/慶祝輔助、間接支持習慣養成，不過度宣稱有針對此機制的行為改變實證。 |
| 風險旗標 | ⚠️ | (1) 公開 Blob URL 隱私弱化需 PM 簽核；(2) EXIF/方向剝除是正確性關鍵、須實測；(3) blob 生命週期清理必接，否則孤兒 = 成本+隱私責任；(4) egress 隨瀏覽量成長，縮圖只緩解非根治。 |

---

**關鍵整合檔案（Slice P 樹）**：`web-app/prisma/schema.prisma`（`TaskHistory` L152-166）、`web-app/src/app/api/tasks/[id]/route.js`（upsert / locWrite L47-72）、`web-app/src/app/api/journey/route.js`（剝座標 select L13-23）、`web-app/src/lib/journeyWorld.js`（pin 形狀 L54、`PIN_LIMIT` L14）、`web-app/src/components/journey/CityScene.jsx`（pin 渲染 L81-85、散佈 L16-22）、`web-app/src/components/journey/landmarks/MemoryPin.jsx`（→ `PolaroidPin` 兄弟）、`web-app/src/components/journey/CityInfoPanel.jsx`（最近紀錄 L54-67）、`web-app/src/components/MainApp.jsx`（opt-in 捕捉 / `handlePickLocation` L408-468）、`web-app/package.json`（尚無 `@vercel/blob`）。今日不存在 `next.config.*` 與任何上傳路由。
