# 設計：「從嚮往開始」流程體驗優化

- **日期**：2026-06-04
- **狀態**：設計定案，待寫實作計畫
- **範圍**：入口、第一步嚮往選擇器、第二步推薦面板的**體驗與視覺**（不改推薦的比對邏輯）
- **相關**：Slice K — `docs/superpowers/specs/2026-05-23-slice-K-aspiration-system-design.md`

## 1. 目標

優化「從嚮往探索習慣」三件事（使用者指定）：**入口引導、流程體驗、視覺呈現**。不動推薦的比對精準度（仍依領域比對）。

## 2. 現況與痛點

- **入口藏太深**：唯一入口是「習慣庫 modal」領域畫面裡的「✨從嚮往開始」按鈕；手機「＋」直接開習慣庫。
- **第一步樸素**：`AspirationPicker` 是三排純文字按鈕（個人化預設 / 已有嚮往 / 領域分組預設）+ 自訂。
- **第二步樸素**：`AspirationRecommendationPanel` 列推薦習慣 + 計畫，視覺平淡。

## 3. 設計

### 3.1 入口 — 「＋」三選一 chooser（一級入口）
新增一個「新增」選擇器（bottom-sheet / modal），點「＋/新增」時先出現，三條路：
- **從嚮往開始**（置頂大 hero，emerald 漸層 + 浮水印 Lucide 圖示，主推文案「不知從何下手？從你想成為的樣子出發」）
- **探索計畫**、**瀏覽習慣庫**（並列兩個次要卡）

- **手機**：`AppHeader` 的 `onOpenAddFlow`（「＋」）改為開此 chooser，由 chooser 分流到三個既有目的地（嚮往 picker / TemplateExplorer / TaskLibraryModal）。
- **桌機**：側欄維持現有「探索計畫 / 習慣庫」按鈕，並**新增一個「從嚮往開始」按鈕**（同款入口，置於兩者之上、emerald 主色），不強制走 chooser（桌機空間足夠，直接三鈕並陳）。
- 習慣庫內原本的「✨從嚮往開始」按鈕**保留**（無害，作為情境內的次要入口）。

### 3.2 第一步 — `AspirationPicker` 改版（嚮往句卡 + 領域 icon tab）
- **頂部：9 領域 icon tab**（橫向可滑）。圖示與顏色重用 `domainToIconKey()` → `CATEGORY_CONFIG`（Lucide 圖示 + 色）。預設選中：使用者分型對應領域（`getPersonalisedPresets` 的優先領域）或第一個。
- **下方：該領域的嚮往句卡**（來源 `preset-aspirations.json`，依 `domain` 分組；32 句、每領域 3–5）。卡片風格＝**漸層 + 浮水印 icon**（該領域色系漸層底、角落放大半透明 Lucide 圖示）。
- **「為你推薦」置頂**：`getPersonalisedPresets` 命中的嚮往在其領域內浮頂、加推薦小標。
- **已有嚮往**：使用者已建立的嚮往，在對應領域 tab 內以同款卡顯示（點選 = 重用，跳過建立）。
- **自訂**：每個領域底部「＋ 自己寫一句嚮往」→ 展開輸入框（沿用 `CUSTOM_TEXT_MAX=80`，領域＝當前 tab）。
- **身分子步驟維持**：選新嚮往後進 identity 子視圖（沿用 `IdentityPicker`）→ POST `/api/aspirations` → `onSelectAspiration`。重用既有嚮往則跳過身分步驟（與現況一致）。

### 3.3 第二步 — `AspirationRecommendationPanel` 改版
- **頂部情境漸層條**：emerald 漸層 + 浮水印圖示，顯示「你的嚮往：<text>」+ 身分 badge「成為『<identity>』」。
- **推薦習慣區**：習慣卡（一致風格）＝ 領域色 icon + 習慣名 + **證據力 badge（若該習慣有已發布科學佐證）** + 「＋ 加入」。
  - 證據力 badge：用既有 `EvidenceBadge` / `scoreEvidence`。資料來源見 §3.4。
- **適合的計畫區**：漸層卡（沿用現有 template 資料：階段數、任務數、專家）+「加入計畫」。
- **底部出口**：「想自己逛逛？瀏覽全部習慣 →」（沿用既有 `onSkip`）。
- 加入行為、寫 `AspirationHabit` 的邏輯沿用現況（`onPickHabit` / `onPickTemplate`）。

### 3.4 推薦習慣的證據力 badge — 資料
`GET /api/aspirations/:id/recommendations` 回傳的 `habits` 每筆**附帶該習慣已發布科學佐證的 evidence**：
- 後端查 officialHabit 時 `include: { insights: { where: { status: 'published' }, select: { evidence: true } } }`，把該陣列原樣放在 `habit.insights`。
- 前端卡片：對 `habit.insights` 各筆 `evidence` 用既有 `scoreEvidence` 算分，取**最高 total 的那筆**傳給 `EvidenceBadge`；無已發布佐證（空陣列）→ 不顯示 badge。
- 此為小型 join，不改變「推薦哪些習慣」的比對邏輯。

### 3.5 領域 meta（icon tab + 卡片漸層用）
重用 `src/lib/constants.js` 的 `domainToIconKey()` + `CATEGORY_CONFIG`（已有 9 領域的 icon key 與色）。如需漸層底色，由該領域主色推導（淺色 → 更淺）。不新增資料表。

## 4. 元件分解

| 檔案 | 職責 | 動作 |
|------|------|------|
| `src/components/AddFlowChooser.jsx` | 「＋」三選一 chooser（嚮往 hero + 計畫 + 習慣庫） | 建立 |
| `src/components/MainApp.jsx` | 「＋」/`onOpenAddFlow` 改為開 chooser，串三個目的地 | 修改 |
| `src/components/AspirationPicker.jsx` | 改版：領域 icon tab + 嚮往句漸層卡 + 推薦置頂 + 自訂 + 身分子步驟 | 修改 |
| `src/components/AspirationRecommendationPanel.jsx` | 改版：情境漸層條 + 習慣卡(含證據力 badge) + 計畫漸層卡 + 出口 | 修改 |
| `src/components/insights/EvidenceBadge.jsx` | 推薦習慣卡重用（不改） | 重用 |
| `src/app/api/aspirations/[id]/recommendations/route.js` | habits 附帶 published insights / topEvidence | 修改 |
| `src/lib/aspirations.js` | 既有 helper 沿用（必要時加「依領域分組 presets」純函式 + 測試） | 修改 |

## 5. 行動裝置一致性（必做）

此 app 行動優先；以上三個介面（chooser、picker、recommendation panel）都是手機與桌機**共用的同一元件**，改版即同步生效。驗收前確認手機尺寸下：chooser bottom-sheet 正常、icon tab 可橫滑、漸層卡與 badge 正常、返回／身分子步驟可用。

## 6. 測試

- **單元**：`aspirations.js` 既有 helper 測試維持綠燈；若新增「依領域分組 presets」函式，補測試（分組正確、推薦置頂順序）。
- **元件**：
  - `AddFlowChooser`：渲染三選項；點各項呼叫對應 callback。
  - `AspirationPicker`：渲染領域 tab；切 tab 顯示該領域嚮往卡；自訂輸入；選新嚮往進身分步驟、重用既有跳過。
  - `AspirationRecommendationPanel`：渲染情境條 + 習慣卡；有 `topEvidence` 顯示 badge、無則不顯示；點加入/計畫/出口呼叫 callback。
- **回歸**：加入後寫 `AspirationHabit`、daily 依嚮往分組不變。

## 7. 非目標（YAGNI）

- 不改推薦比對邏輯（仍依領域；不做排序/精選/AI）。
- 不新增資料表（領域 meta 重用既有 constants；嚮往來源仍 preset-aspirations.json）。
- 不做嚮往的編輯/刪除管理。

## 8. 並行注意

本案無 schema 變更（recommendations 端點只是多 include 既有關聯）。與其他 session 並行時照常 `git merge origin/main` 後再部署。
