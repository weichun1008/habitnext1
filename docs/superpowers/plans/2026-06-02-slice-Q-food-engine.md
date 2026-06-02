# Slice Q (Q1a) — 美食回憶 pin 實作計畫（token-無關部分）

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** 讓 opt-in 使用者在已定位的完成上自願附一張當餐照片，落成城市級 polaroid pin。本計畫只涵蓋 **Q1a（token-無關）**；真正的 Vercel Blob 上傳接線 + 部署 = Q1b（待 PM 開 Blob store）。

**Spec:** `docs/superpowers/specs/2026-06-02-slice-Q-food-engine-design.md`（已定案 C-Q1）

**鎖定決策:** Vercel Blob 公開不可猜 URL（經 `/api/memory` 授權端點）· 城市級 · 安靜計數行 · `memoNote` 選填 · 單張/完成 · 無 profile 全域開關 · key 前綴清理。

**架構:** 照片 inline 於 `TaskHistory.photoUrl`；公開彙整只帶 `hasPhoto`+`id`（不帶 URL）；bytes 走授權端點 `GET /api/memory/[id]`；客戶端 canvas 縮圖剝 EXIF/GPS。寫入鏡像既有 `locWrite`→`memWrite`，不需新寫入端點。

**Tech:** Next.js 14 · React 18 · Prisma 5（additive）· Jest+RTL · lib CommonJS。

---

## Q-T1: Schema — TaskHistory.photoUrl + memoNote

**Files:** `web-app/prisma/schema.prisma`

- [ ] 在 `TaskHistory`（`city String?` 之後）加：
```prisma
  // ★ Slice Q — 美食回憶照片（opt-in）。存 Vercel Blob URL 字串；bytes 不在 DB。null = 未附。
  photoUrl           String?
  memoNote           String?  // 選填短 caption
```
- [ ] `set -a && . ./.env.local && set +a && npx prisma db push --skip-generate` → 「in sync / 已套用」，既有 row 不受影響（additive nullable）。
- [ ] `npx prisma generate`。
- [ ] Commit: `feat(db): Slice Q — TaskHistory.photoUrl + memoNote (additive, opt-in food memory)`

---

## Q-T2: lib/imageCompress — 縮圖 + 剝 EXIF/GPS（TDD 純函式部分）

**Files:** `web-app/src/lib/imageCompress.js` + `web-app/src/__tests__/lib/imageCompress.test.js`

> canvas 在 jsdom 不可用，故把**可純測**的邏輯拆出來單測；canvas 重編碼是薄包裝（瀏覽器端執行、不單測）。

- [ ] 匯出純函式（CommonJS）：
  - `readExifOrientation(arrayBuffer) -> 1|3|6|8|...|1`（解析 JPEG APP1/EXIF orientation tag；非 JPEG / 無 tag → 1）。
  - `fittedSize(w, h, maxEdge=1280) -> {w,h}`（長邊 > maxEdge 才等比縮，否則原樣；不放大）。
  - `orientationTransform(orientation, w, h) -> { rotateDeg, swapWH }`（1→0/false, 3→180/false, 6→90/true, 8→270/true）。
- [ ] `compressImage(file, opts)`（瀏覽器端、非單測）：FileReader→Image→讀 orientation→canvas 依 transform 烘正+縮放→`canvas.toBlob('image/jpeg', quality)`。**重編碼即剝除所有 EXIF（含 GPS）。** 回 `Promise<Blob>`。在無 `document`（測試環境）時 throw 明確錯誤（呼叫端只在瀏覽器用）。
- [ ] **測試**（純函式）：
  - `readExifOrientation`：給含 orientation=6 的最小 JPEG header bytes → 6；非 JPEG bytes → 1；空 → 1。
  - `fittedSize`：2000×1000 → 1280×640；800×600 → 800×600（不放大）；正方 3000 → 1280×1280。
  - `orientationTransform`：1/3/6/8 → 對應 rotate/swap。
- [ ] RED → GREEN → Commit: `feat(lib): imageCompress — orientation/fitted-size/exif-strip helpers + TDD (Slice Q)`

---

## Q-T3: journey 讀取改動 — pin 帶 id+hasPhoto，公開彙整不帶 photoUrl

**Files:** `web-app/src/lib/journeyWorld.js`、`web-app/src/app/api/journey/route.js`、`web-app/src/__tests__/lib/journeyWorld.test.js`

- [ ] `aggregateJourney`：pin 形狀由 `{date,domain,title}` → `{id, date, domain, title, hasPhoto}`。輸入 row 多讀 `r.id`、`r.hasPhoto`（缺時 `hasPhoto:false`）。`PIN_LIMIT` 維持 12。
- [ ] 更新既有 journeyWorld 測試的 pin 斷言（pins[0] 應有 `id`/`hasPhoto`）；加一條：`hasPhoto` 正確由輸入帶出、`photoUrl` 不出現在輸出 pin。
- [ ] `api/journey/route.js`：`select` 加 `id: true, photoUrl: true`（仍**不取 lat/lng**）；map → `{ id: h.id, city, domain, date, title, hasPhoto: !!h.photoUrl }`。**`photoUrl` 不進回傳物件**（只用來算布林）。
- [ ] RED → GREEN（`npx jest journeyWorld`）→ Commit: `feat(api): journey pins carry id+hasPhoto; photoUrl never leaves backend (Slice Q)`

---

## Q-T4: GET /api/memory/[historyId] — 授權讀取端點

**Files:** `web-app/src/app/api/memory/[historyId]/route.js`

- [ ] `GET(request,{params})`：取 `historyId`；query `?userId=`。查 `taskHistory.findUnique({ where:{id}, select:{ photoUrl:true, task:{select:{userId:true}} }})`。
  - 不存在 / `task.userId !== userId` → 404。
  - 無 `photoUrl` → 404。
  - 有 → `NextResponse.redirect(photoUrl, 302)`（唯一吐 blob URL 的點；日後可換簽章 URL 而不動 aggregate）。
- [ ] 唯讀；錯誤 try/catch → 500。
- [ ] node --check / 確認編譯。Commit: `feat(api): GET /api/memory/[id] — ownership-gated photo redirect (Slice Q seam #1)`

---

## Q-T5: PUT /api/tasks/[id] — memWrite 鏡像 locWrite

**Files:** `web-app/src/app/api/tasks/[id]/route.js`

- [ ] 在 historyUpdate 解構加 `photoUrl, memoNote`；仿 `locWrite` 建 `memWrite`：`if (photoUrl !== undefined) memWrite.photoUrl = photoUrl;`（memoNote 同）。spread `...memWrite` 進 upsert 的 update + create（與 `...locWrite` 並列）。
- [ ] 不帶 photoUrl 的更新**不清空**既有值（與 locWrite 同語意）。
- [ ] 確認編譯。Commit: `feat(api): tasks historyUpdate accepts photoUrl/memoNote (mirror locWrite) (Slice Q)`

---

## Q-T6: PolaroidPin 元件

**Files:** `web-app/src/components/journey/landmarks/PolaroidPin.jsx` + `web-app/src/__tests__/components/journey/PolaroidPin.test.jsx`

- [ ] `PolaroidPin({ id, x, y, scale=1 })` → 回 `<g data-kind="polaroid-pin" transform=...>`：白框 polaroid + `<image href={`/api/memory/${id}`} ...>` 縮圖（含 `<rect>` 占位底 + 珊瑚別針點）。無外部依賴；錨在 local origin（與其他 journey 元件契約一致）。
- [ ] RTL 測試：渲染含 `data-kind="polaroid-pin"`、`<image>` 的 href 指向 `/api/memory/<id>`。
- [ ] RED → GREEN → Commit: `feat(ui): PolaroidPin — photo memory pin reading /api/memory/:id (Slice Q)`

---

## Q-T7: CityScene 分支 + CityInfoPanel 縮圖 + 計數行

**Files:** `web-app/src/components/journey/CityScene.jsx`、`web-app/src/components/journey/CityInfoPanel.jsx` + 更新各自測試

- [ ] CityScene：pin 渲染分支 `pin.hasPhoto ? <PolaroidPin id={pin.id} .../> : <MemoryPin .../>`。散佈/排序邏輯不動。pin node 需帶 `id`/`hasPhoto`（來自 aggregateJourney → CityScene 目前用 cityData.pins 還是 layoutCity？確認：pins 來自 cityData.pins，CityScene 自己擺 pin slot；用 pin.hasPhoto 分支）。
- [ ] CityInfoPanel：最近紀錄列，`p.hasPhoto` 時前置縮圖 `<img src={`/api/memory/${p.id}`} ...>`（可點放大—簡單放大可後續，Q1a 先顯示縮圖）；底部加安靜計數行「{city} · {pins.filter(p=>p.hasPhoto).length} 個美食回憶」（count 0 時不顯示）。
- [ ] 更新測試：CityScene 給一個 `hasPhoto:true` pin → 渲染 `polaroid-pin`；CityInfoPanel 計數行文字。
- [ ] RED → GREEN → Commit: `feat(ui): CityScene PolaroidPin branch + CityInfoPanel thumbnail & memory count (Slice Q)`

---

## Q-T8: MemoryCapture UI 殼（上傳 guard 起來）

**Files:** `web-app/src/components/journey/MemoryCapture.jsx` + `web-app/src/__tests__/components/journey/MemoryCapture.test.jsx`

- [ ] `'use client'`。`MemoryCapture({ hasPhoto, onAttach })`：安靜次要 affordance（lucide `ImagePlus`，hasPhoto 時 `Image`/已附狀態）；點開觸發隱藏 `<input type="file" accept="image/*" capture="environment">`；選檔 → 呼叫 `onAttach(file)`（壓縮+上傳的責任在父層/Q1b）；上傳中態 + 安靜「已收進旅程」確認文字。無 emoji。
- [ ] **Blob 上傳 guard**：本元件只負責選檔 + 回呼，不直接打 Blob。實際上傳在 MainApp.handleAttachPhoto，且該處在無 `@vercel/blob`/token 時走 guard（見 Q-T9）。
- [ ] RTL：點 affordance → input 存在；選檔 fireEvent → onAttach 被呼叫帶 File。
- [ ] RED → GREEN → Commit: `feat(ui): MemoryCapture — opt-in photo affordance + native picker (Slice Q)`

---

## Q-T9: MainApp 接線 + TaskCard 掛載（上傳 guard）

**Files:** `web-app/src/components/MainApp.jsx`、`web-app/src/components/TaskCard.jsx`

- [ ] MainApp `handleAttachPhoto(task, dateStr, file)`：
  - `const { compressImage } = await import('@/lib/imageCompress')` → `compressImage(file)` 得乾淨 Blob。
  - **上傳 guard**：嘗試 `import('@vercel/blob/client')` 動態載入；若套件不存在（Q1b 前）或無 token → `console.warn` + 友善 toast「美食回憶即將推出」並 return（不爆）。Q1b 補上 `upload()` 接線。
  - 有上傳結果 → `PUT /api/tasks/:id { historyUpdate:{ date, completed:true, value, photoUrl } }`（鏡像 `handlePickLocation`）；樂觀更新本地。
- [ ] TaskCard：已定位完成（`locationByDate?.[date]` 有值且 isCompleted）旁渲染 `<MemoryCapture hasPhoto={...} onAttach={(f)=>onAttachPhoto?.(task,date,f)} />`；新增 `onAttachPhoto` prop，MainApp 傳入。
- [ ] `npx jest`（全綠）+ `npm run build:local`（Compiled successfully）。
- [ ] Commit: `feat(ui): wire MemoryCapture into TaskCard + MainApp handleAttachPhoto (upload guarded pending Blob) (Slice Q)`

---

## Q-T10: 收尾（Q1a）— 測試/build/PR（不 merge）

- [ ] 全 `npx jest` 綠 + `npm run build:local` 綠。
- [ ] 隱私 regression 抽查：`GET /api/journey` 回應**無 `photoUrl`/`lat`/`lng`**（可加一條 API 形狀斷言或手動 curl）。
- [ ] rebase 最新 origin/main；push feat branch；開 PR（標題註明 **Q1a，Blob 上傳待 Q1b**）。
- [ ] code-reviewer 終審。**不 merge**——等 PM 開 Blob store 後做 Q1b（接上傳）再一起上，或 PM 同意先 merge Q1a（上傳停用、其餘無回歸）。

---

## Q1b（之後 · 待 Blob token，不在本計畫執行）
- 開 Vercel Blob store + `BLOB_READ_WRITE_TOKEN`（PM 授權）。
- `@vercel/blob` client-upload handler（`/api/upload` token 簽發 + key 前綴 `mem/{userId}/{historyId}` + type/size 白名單）。
- MainApp handleAttachPhoto 解除 guard、接真 `upload()`。
- 生命週期刪 blob（移除照片/刪 history/覆蓋）。
- 真機方向 smoke + 部署。

---

## Self-Review（plan 對 spec）
- 範圍：Q1a = spec §7 中 token-無關全部；Blob 上傳（spec §7.1 upload handler、§7.2 @vercel/blob、handleAttachPhoto 上傳段）留 Q1b。
- 隱私：journey select 不取座標 + photoUrl 不進 payload（Q-T3）+ 授權端點（Q-T4）= spec §9 紅線。
- 型別一致：pin `{id,date,domain,title,hasPhoto}`（Q-T3）↔ PolaroidPin `id`（Q-T6）↔ CityScene 分支（Q-T7）↔ memory 端點 `/api/memory/:id`（Q-T4）。
- additive schema（Q-T1）安全於共用 prod DB。
