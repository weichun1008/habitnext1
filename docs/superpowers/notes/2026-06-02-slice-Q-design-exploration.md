# Slice Q 設計探索文件（草案 · 待 PM 決策）

> 本文是**探索文件**，不是最終規格。目的是把三條可行路線攤在桌上，連同誠實的取捨與風險，讓 PM 拍板方向後再進入 `/write-plan`。
> 產出來源：2026-06-02 多代理 workflow（研究 → 3 方案 → 綜合）。配套：`assets/2026-06-02-slice-Q-mockup.html`、draft spec `specs/2026-06-02-slice-Q-food-engine-design.md`。

---

## 1. 一句話：Slice Q 是什麼

**Slice Q 是「吃引擎 / 美食回憶 pin」——讓使用者在完成飲食習慣時，自願補上一張當餐照片，這張照片以「拼貼（polaroid）回憶」的形式落在 Slice P 城市地圖上，成為地圖裡最豐富的收藏物，餵養整個城市旅程世界。**

照片是真實世界的戰利品，不是抽象分數；它把「我是一個好好吃飯的人」這個身份，錨定到具體的時間與地點上。

---

## 2. 現況與已有資產

> 重點：**餐廳級粒度的資料其實已經在了**——我們現在缺的是「照片」與「呈現」，不是「定位」。

| 面向 | 現況 | 對 Slice Q 的意義 |
|---|---|---|
| **資料模型** | `TaskHistory` 在 Slice O 已存 `lat Float?` / `lng Float?` / `city String?`，且有 `@@unique([taskId, date])`（一次完成一列） | **raw lat/lng 早已落地**——餐廳級定位的原始資料已存在伺服器端，從未刪除、只是未呈現。一張照片的基數（1 張/完成）與 `lat/lng/city` 完全一致，天生屬於同一列。 |
| **隱私姿態（Slice O 立下）** | 座標只以 `Float?` 數字存在伺服器；`/api/journey` 的 `select` **刻意只取 `date, city, task.*`，從不取 `lat/lng`**；座標不出前端、不進 URL、不進 DOM | Slice Q 必須延續這條紅線。餐廳級定位是**唯一**需要讓 `lat/lng` 跨到前端的功能——這是 P 明確留給後續的隱私決策（「屆時再談」）。 |
| **讀取路徑（已接好但「裝飾性」）** | 三段已串通：`/api/journey` select → `aggregateJourney`（`lib/journeyWorld.js` 推出 `{date, domain, title}` pin 物件、`PIN_LIMIT=12`）→ `CityScene.jsx`（`pinNodes` 迴圈渲染 `MemoryPin` 珊瑚色點） | **最便宜的勝利**：讀取路徑端到端已存在，只是餵的是空資料。Slice Q 多餵一個安全欄位，pin 就能變豐富。 |
| **pin 定位方式** | `CityScene` 是單一扁平 `<svg>`；pin 位置是**確定性的裝飾散佈**（cosmetic scatter），**不是真實座標** | 城市級呈現**完全不需要動隱私**——因為從來就沒用 `lat/lng` 來擺放任何東西。 |
| **「圖層」概念** | P 規格 §12 **預留**了 CityScene 的「圖層」概念（base 聚落 ⇄ 餐廳細節 overlay） | 這只是**設計意圖、不是現有程式碼**。CityScene 今天沒有圖層抽象。要做餐廳級必須真的把這層蓋出來。 |
| **寫入路徑** | `api/tasks/[id]/route.js` 的 upsert 已有 `locWrite` 模式：`if (lat !== undefined) locWrite.lat = lat` 然後 spread 進 update/create | 照片寫入可**完全鏡像** `locWrite` → `memWrite`，**DB 寫入不需要新端點**。 |
| **二進位儲存基礎建設** | **零**——沒有 `@vercel/blob`、沒有 `next.config`、沒有 `next/image`、沒有 `sharp`、沒有任何上傳路由 | 這是專案**第一個二進位儲存決策**，等於 greenfield，無既有模式需相容。 |
| **環境風險** | dev 與 prod **共用一個 Neon DB**（未來也將共用一個 Blob store） | dev 上傳的每張測試照片都是真正的 prod 資料——清理機制是**必備**，不是 nice-to-have。 |
| **完成側 UX** | `MainApp.jsx` 的 opt-in 定位捕捉閘門已存在 | 照片 affordance 可掛在「已定位的完成列」上，沿用同一個 opt-in 心智。 |

---

## 3. 三個方案比較

三案共用的技術底座（差異只在範圍）：**Vercel Blob 客戶端直傳 + 客戶端縮圖/重新編碼（= EXIF/GPS 剝除）+ 純 `<img>` 渲染**。理由見 §3.7。

| 維度 | **A · mvp-lite**（城市級・無慶祝） | **B · food-engine**（v2 吃引擎全貌） | **C · phased**（先打地基、留縫日後接） |
|---|---|---|---|
| **一句定位** | 一個 `photoUrl` 欄位餵滿已接好的讀取路徑，照片變成城市級 polaroid pin。 | v2 願景核心：照片是最豐富收藏物，含「圖層」食物層 + 「第N個回憶」掉落慶祝。 | 拆成 Q1/Q2 兩相位：Q1 先讓照片落地成 pin，Q2 再開圖層 + 慶祝 + 餐廳級。 |
| **UX 捕捉** | 完成列上安靜的 `ImagePlus` 次要 affordance；原生檔案選擇器（非自訂相機）；安靜「已收進旅程」確認。 | 飲食完成後出現可關閉的「拍下這餐」(`Camera`)；原生 `capture="environment"`；完成後在旅程頁觸發掉落慶祝。 | 同 A 的安靜 opt-in `Camera` + 「已收進旅程」；**刻意不做大慶祝**（留到 Q2）。 |
| **儲存** | Vercel Blob 直傳 + 客戶端縮圖/EXIF 剝除；純 `<img>`。 | 同左。第一個二進位儲存承諾，egress/隱私成本真實。 | 同左。額外把照片讀取**隔離到專屬授權端點**，不讓圖片 URL 進公開彙整。 |
| **Schema delta** | 只加 `photoUrl String?`。**不**加 caption、**不**建 `Memory` 表。 | 加 `photoUrl String?` + `memoNote String?`（caption）。 | 加 `photoUrl String?` + `memoNote String?`；pin 物件帶 `id` + `hasPhoto` 布林。 |
| **與 P 整合** | journey select 加 `photoUrl` → aggregate pin 加 `photoUrl`+`id` → `CityScene` 分支出 `PolaroidPin` → `CityInfoPanel` 縮圖+可點。**不碰「圖層」**。 | 同 A，**外加**真的蓋出「美食圖層」toggle（但仍用裝飾散佈，不開座標）+ JourneyView 級慶祝動畫 wrapper。 | **關鍵分歧**：公開彙整只帶 `hasPhoto` 布林、**不帶 `photoUrl`**；圖片 bytes 走新 `GET /api/memory/[historyId]` 授權端點。圖層 + 慶祝 + 餐廳級全留 Q2。 |
| **「第N個回憶」** | **有**計數行（`pins.filter(p=>p.photoUrl).length`，幾乎免費）；慶祝 toast 列為細薄 stretch。 | **有**完整掉落+spring 慶祝 toast（「這是你在台北的第 8 個回憶 · 8/15」）。 | Q1 只出安靜計數行；**掉落慶祝排到 Q2**（先驗證有人願意拍，再做慶祝）。 |
| **範圍 / 風險** | **LOW–MEDIUM**。schema+讀取路徑瑣碎且加法式；風險集中在上傳管線（EXIF/方向/Blob 刪除生命週期）與「公開但不可猜」URL 的隱私弱化。 | **MEDIUM-HIGH**（三案最高）。美食圖層是真正新結構；讓 CityScene 可動畫；egress 無上限；公開 URL 隱私弱化需明確簽核。 | **MEDIUM**。讀取路徑已存在故低於大爆炸；但仍是首個二進位決策、EXIF 剝除是正確性關鍵、dev=prod 孤兒 blob 清理必備。 |
| **粗估任務數** | ~9–12 | ~12–16 | Q1 ~9–11（Q2 另計） |
| **行為科學** | 身份錨定 + 可見進度 + 自主性；安靜確認、慶祝克制以免滑向遊戲化。 | 同左但更強調慶祝即真實行為的內在獎勵；**誠實張力**：拍照摩擦可能壓低完成率，opt-in 是承重設計。 | 同左；**慶祝刻意配給到 Q2**——先驗證需求再工程化慶祝，行為上更誠實。 |

### 3.7 為什麼三案共用同一個儲存底座（被否決的選項）

- **base64 存進 Postgres ❌**：在共用 Neon dev=prod 上是陷阱。0.5–5MB 照片 ×1.33 膨脹 → 撐爆 row、拖垮備份/查詢、每次讀 row 都把 blob 一起拉出、燒光免費額度。硬否決。
- **Cloudinary / S3 ⚠️**：給簽章 URL 與轉檔，但多一個 vendor、API key、IAM、簽章上傳 widget——對 v1 過重。**但若 PM 認定食物照是真正隱私的，這才是正解**（簽章存取），屬範圍/成本跳級。
- **Vercel Blob ✅**：原生於 Vercel 部署、客戶端直傳繞過 ~4.5MB serverless body 上限、存的是 URL 字串直接塞進 `photoUrl String?`。純 `<img>` 渲染刻意避免新建 `next.config` + `remotePatterns`。
- **客戶端縮圖（canvas 重新編碼到 ~1280px / JPEG ~0.8）**：一石三鳥——(a) 壓到 body 限制以下、(b) **canvas 重新編碼免費剝除所有 EXIF 含 GPS**（最重要的隱私收穫，否則手機照會把精確 GPS 偷渡回來、打穿 Slice O 的城市級紅線）、(c) 砍 egress 成本。**誠實警告**：canvas 重新編碼也會丟方向 EXIF，必須先讀方向再烘進 canvas，否則照片會躺著顯示。

---

## 4. 推薦 + 理由

### 推薦：**方案 C（phased），但採用 C 的「Q1 範圍」作為本 slice 的交付物。**

換句話說：**現在做 C 的 Q1**——它在交付物上幾乎等同方案 A（照片落地成城市級 pin、安靜確認、計數行），但**多花極少成本把兩道縫切對**，讓 v2 吃引擎（B 的全貌）日後能**無重工**接上。

### 理由（誠實權衡）

1. **「先讓使用者看到價值」與「v2 吃引擎核心」並非二選一——C 是唯一同時尊重兩者的形狀。**
   - 純 A 交付得快，但它把照片 URL 烤進公開的城市彙整裡；日後若 PM 決定食物照要簽章私有存取，A 會逼著改彙整路徑——這正是重工。
   - 純 B 是對的願景形狀，但它一次吞下首個二進位承諾 + 真實 egress/隱私成本 + 全新美食圖層 + 讓 CityScene 可動畫，而且**諷刺地仍交付不出 GPS 精確的餐廳 pin**（那需要開 P 留下的座標閘門）。在我們**還沒驗證有人願意拍照**之前就投入 12–16 個任務，賭注太大。
   - C 的相位邊界正好切在最貴、最不確定的地方：二進位儲存的嚴謹度（Q1 必做）vs. 圖層抽象 + spring 慶祝 + 座標暴露（Q2 才談）。

2. **縫對了，B 就是 C 的自然延伸，不是重做。** C 的兩道承重縫：
   - **公開彙整只帶 `hasPhoto` 布林，圖片 bytes 走 `GET /api/memory/[historyId]` 授權端點**——這讓日後 Blob→簽章 URL 的替換不必碰 `aggregateJourney`。
   - **pin 物件從 Q1 就帶穩定 `id`**——慶祝、點擊開圖、Q2 的圖層都有可定址的目標。

3. **行為科學上 C 更誠實。** 把掉落慶祝排到 Q2，等於「先驗證使用者真的想捕捉美食回憶，再圍著它工程化慶祝」。在未證實的行為上先蓋慶祝，是典型的過度遊戲化失敗模式。

4. **C 不會把我們逼到角落。** 單張照片 inline 在 `TaskHistory` 符合本專案「不過早建關聯」的紋理；若日後要多張照片，升級到 `Memory` 關聯本身也是加法式 migration（反向關聯是虛擬的）。

**反對意見也誠實列出**：C 比純 A 多了一個授權端點與一個布林欄位的認知成本；如果 PM 的真實意圖是「就是要 v2 吃引擎完整版、餐廳級也要、現在就上」，那 C 的克制反而是阻礙，應直接選 B 並**附帶對公開 Blob URL 隱私弱化的明確簽核**。方向取決於 §5 的開放問題。

---

## 5. 待 PM 決策的開放問題

1. **照片儲存與隱私姿態**：接受 **Vercel Blob「公開但不可猜」URL**（security-through-obscurity，URL 在 `<img src>` 必然外露）嗎？還是食物照被視為**真正隱私**、需要簽章/短效存取（→ 跳級到 S3/Cloudinary，成本與工時上升）？**這題決定底座，必須先答。**
2. **城市級 vs 餐廳級**：本 slice 就要**真實座標的餐廳級 pin**（需開 P 留下的 `lat/lng`→前端閘門，且與 Slice O「Zero map API」抵觸），還是先**城市級確定性散佈**即可？
3. **拍照捕捉 UX**：原生檔案選擇器（`<input capture>`，零自訂相機工作）夠用嗎？還是要自訂 `getUserMedia` 相機流程（多一整類權限/UX 工作，建議延後）？
4. **Schema 範圍**：只加 `photoUrl`？還是同時加 `memoNote`（caption）？是否預期**單一完成多張照片**——若是，現在就該升級到 `Memory` 關聯模型（否則日後 migration）。
5. **「第 N 個回憶」慶祝**：要不要做掉落+spring 慶祝 toast（「這是你在台北的第 8 個回憶 · 8/15」）？還是先只出**安靜計數行**、慶祝留待驗證需求後？
6. **方向決策（綜合 1–5）**：A（最快、會有日後重工風險）／ B（願景全貌、最重、需隱私簽核）／ C-Q1（推薦，幾乎=A 的交付 + 對好的縫）？
7. **dev=prod 測試資料清理**：接受「dev 上傳 = prod 資料」並採 key 前綴 + 手動清除 / teardown 腳本的最小清理故事嗎？

---

## 6. 守則檢查

| 守則 | 三案是否遵守 | 說明 |
|---|---|---|
| **opt-in 隱私** | ✅ | 照片雙重 opt-in：只出現在已定位完成（已需 `trackLocation`）+ 使用者刻意附加；跳過零成本。 |
| **座標不出前端/URL** | ✅（城市級）／⚠️（餐廳級） | 城市級用確定性散佈，從不用 `lat/lng`，紅線不動。**餐廳級是唯一會開座標閘門的功能**——故列為 §5 開放問題 / Q2，預設不開。raw 座標維持「已存但未呈現」。 |
| **無 emoji、用 lucide** | ✅ | 所有 UI icon 用 lucide（`ImagePlus`/`Camera`/`Sparkles`/`Check`/`MapPin`/`Image`），文件與 UI 皆無 emoji。 |
| **零懲罰** | ✅ | 沒有 streak、沒有點數、不提「你昨天漏了」。空城市不責備；未拍照的完成仍是完整完成。安靜「已收進旅程」只確認、不計分。 |
| **行為科學 > 遊戲化** | ✅ | 以**身份錨定**（自傳式證據）、**可見進度**（累積的真實回憶地圖）、**自主性**（永遠是使用者的選擇）為主軸；慶祝刻意克制/配給。**誠實限制**：本機制是回憶/慶祝輔助，間接支持習慣養成，並非有針對此機制的行為改變實證——不過度宣稱。 |
| **附帶風險旗標** | ⚠️ | (1) 公開 Blob URL 的隱私弱化需明確產品簽核；(2) EXIF/方向剝除是正確性關鍵、需實測；(3) Blob 刪除生命週期（解除完成/刪任務/移除照片）必須接上，否則孤兒 blob = 成本 + 隱私責任；(4) egress 隨瀏覽量成長，只能緩解非根治。 |

---

**關鍵整合檔案（Slice P 樹）**：`web-app/prisma/schema.prisma`（`TaskHistory`）、`web-app/src/app/api/tasks/[id]/route.js`（upsert/locWrite）、`web-app/src/app/api/journey/route.js`（剝座標 select）、`web-app/src/lib/journeyWorld.js`（pin 形狀）、`web-app/src/components/journey/CityScene.jsx`（pin 渲染、散佈）、`web-app/src/components/journey/landmarks/MemoryPin.jsx`（→ `PolaroidPin` 兄弟）、`web-app/src/components/journey/CityInfoPanel.jsx`、`web-app/src/components/journey/JourneyView.jsx`（client orchestrator——Q2 慶祝 + 圖層 toggle 掛這）、`web-app/src/components/MainApp.jsx`（opt-in 捕捉閘門）、`web-app/package.json`（尚無 `@vercel/blob`）。今日不存在 `next.config.*` 與任何上傳路由。
