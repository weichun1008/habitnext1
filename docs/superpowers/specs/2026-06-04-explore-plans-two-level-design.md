# 設計：探索計畫兩層化 + 計畫家族後台可編輯

- **日期**：2026-06-04
- **狀態**：設計定案，待寫實作計畫
- **元件**：`TemplateExplorer`、`templateRecommendation.js`、admin templates 區

## 1. 目標

把「探索習慣計畫」(`TemplateExplorer`) 從**單頁攤平**改成**兩層導覽**：
1. 第一層：花朵 / 睡眠 / 其他三大「計畫家族」的介紹卡（版面 A：直式大橫幅）
2. 點家族 → 第二層：該家族的子課程（模板）選單
3. 點課程 → 第三層：現有 `TemplateDetailPanel`（不變）

並讓三個家族的**顯示內容（名稱／介紹／圖示／顏色／排序／顯示隱藏）可由後台編輯**。

## 2. 現況

- `TemplateExplorer` 一次渲染 `TEMPLATE_SECTIONS`（flower / sleep / other）三區，每區一個水平輪播，全部在同一頁。
- 家族的顯示文案（label / description / quizPendingCopy）**硬寫**在 `src/lib/templateRecommendation.js` 的 `TEMPLATE_SECTIONS`。
- 家族成員判定：`sectionIdFor(template)` 依 `template.category` — 花朵 4 類（daisy/rose/orchid/sunflower）、睡眠 4 類（sleep_*）、其餘為 other。此邏輯**維持不變**。

## 3. 資料模型 — 新增 `PlanFamily`

三個家族是**固定的、只編輯顯示**（不新增/刪除；成員由 category 程式判定）。

```prisma
model PlanFamily {
  id          String   @id @default(cuid())
  slug        String   @unique // 'flower' | 'sleep' | 'other'（鎖定，不可改）
  title       String   // 顯示名稱，如「花朵計畫」
  intro       String   // 介紹文（第一層卡片內文）
  icon        String?  // Lucide icon 名稱（與 HabitCategory.icon 一致慣例）
  color       String?  // hex，如 "#ec4899"
  quizPendingCopy String? // 未完成分型測驗時的提示（沿用現有文案；other 為 null）
  order       Int      @default(0) // 第一層排序，小在前
  isActive    Boolean  @default(true) // false = 第一層隱藏此家族
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Seed**（`scripts/seed-plan-families.js`，idempotent upsert by slug）以現有 `TEMPLATE_SECTIONS` 文案帶入預設：

| slug | title | intro | icon | color | order |
|------|-------|-------|------|-------|------|
| flower | 花朵計畫 | 依女性週期身體狀態分型，14 天分階段任務，跟著週期長出新習慣。 | Flower2 | #ec4899 | 0 |
| sleep | 睡眠處方 | 依睡眠卡點分型（壓力／節律／代謝失衡／荷爾蒙），14 天 4 階段處方。 | Moon | #6366f1 | 1 |
| other | 其他公開計畫 | 專家設計的各式主題習慣計畫。 | LayoutGrid | #10b981 | 2 |

quizPendingCopy：flower / sleep 沿用現有兩句；other 為 null。

## 4. 後台編輯

位置：`/admin/dashboard/templates`（與「計畫分類」同區）新增「**計畫家族**」管理區塊。

- 列出 3 個家族（依 order），每個可編輯：`title`、`intro`、`icon`(Lucide 名)、`color`(hex)、`quizPendingCopy`、`order`、`isActive`。`slug` 唯讀顯示。
- 不提供新增/刪除（家族固定）。
- 即時預覽可省略（YAGNI）；存檔後重新載入列表即可。

**Admin API**：
- `GET /api/admin/plan-families` — 回全部（依 order）
- `PATCH /api/admin/plan-families/[slug]` — 部分更新（title/intro/icon/color/quizPendingCopy/order/isActive）。slug 不可改。

## 5. 公開 API

- `GET /api/plan-families` — 回 `isActive=true` 的家族（依 order），供探索計畫第一層使用。`findMany` 不帶 select，欄位自動帶出。

## 6. 探索計畫 UI（`TemplateExplorer` 兩層）

新增內部狀態 `activeFamily`（null = 第一層；'flower'|'sleep'|'other' = 第二層）。

**第一層（activeFamily === null）**：
- 從 `/api/plan-families` 取家族清單，依 order 渲染**直式大橫幅卡**（版面 A）。
- 每張卡：左側 icon（Lucide，套 color tint）＋ title ＋ intro ＋ meta（「N 個課程」由 `groupTemplatesBySection` 算出該家族模板數；若該家族有「為你推薦」命中則顯示推薦小標）＋右側 `›`。
- 點卡片 → `setActiveFamily(slug)` 進第二層。
- 家族若 `isActive=false` 不顯示；模板數為 0 的家族仍顯示卡片（點進去顯示空狀態）— 但 other 家族若為 0 則隱藏（與現況一致）。

**第二層（activeFamily 有值）**：
- 標題列左上加**返回鍵**（← 回第一層，`setActiveFamily(null)`）；標題顯示該家族 title。
- 內容：沿用現有課程卡 UI（`grouped[activeFamily]`）；保留「為你推薦」置頂與徽章、quiz-pending 提示卡（用該家族 `quizPendingCopy`）。
- 空狀態：「這個家族目前還沒有公開課程」。

**第三層**：點課程卡 → 現有 `TemplateDetailPanel`（不變）；返回回到第二層。

`initialTemplate`（從嚮往推薦流程帶入）行為：當 `initialTemplate` 有值，直接 `setActiveFamily(sectionIdFor(initialTemplate))` 並開該課程 detail，使用者按返回會落在對應家族的第二層。

## 7. `templateRecommendation.js` 調整

- 保留 `isRecommendedFor` / `groupTemplatesBySection` / `sectionIdFor`（成員判定邏輯不變）。
- `TEMPLATE_SECTIONS` 的**顯示文案**不再是唯一真相 — 改由 `PlanFamily` 提供。為相容與測試，`TEMPLATE_SECTIONS` 可保留作為 fallback 常數，但 `TemplateExplorer` 以 API 資料為主、查無時 fallback 到常數。

## 8. 元件分解

| 檔案 | 動作 |
|------|------|
| `prisma/schema.prisma` | 新增 `PlanFamily` model |
| `scripts/seed-plan-families.js` | 建立，seed 3 家族 |
| `src/app/api/plan-families/route.js` | 建立（公開 GET，isActive） |
| `src/app/api/admin/plan-families/route.js` | 建立（admin GET 全部） |
| `src/app/api/admin/plan-families/[slug]/route.js` | 建立（admin PATCH） |
| `src/components/TemplateExplorer.jsx` | 改：兩層導覽 + 第一層家族卡 + fetch plan-families |
| `src/app/admin/dashboard/templates/...` | 加「計畫家族」編輯區塊（沿用 categories 頁模式） |
| `src/lib/templateRecommendation.js` | 微調：TEMPLATE_SECTIONS 降為 fallback |

## 9. 測試

- **單元**：`groupTemplatesBySection` / `sectionIdFor` 既有測試維持綠燈（邏輯不變）。
- **元件**：`TemplateExplorer` —(a) 第一層渲染家族卡（mock /api/plan-families）；(b) 點家族卡進第二層、顯示該家族課程；(c) 返回鍵回第一層；(d) isActive=false 家族不顯示；(e) initialTemplate 直接落在對應家族第二層 + detail。
- **回歸**：加入計畫流程（date picker → confirmJoin）不變。

## 10. 非目標（YAGNI）

- 後台新增/刪除自訂家族（成員規則需程式定義，超出範圍）
- 家族層級的篩選/搜尋
- 家族卡的動態統計快取（課程數即時算）

## 11. 並行注意

此功能含 schema 變更（新 model）於共用 DB。`PlanFamily` 為**新增、非破壞**；main 為 schema 超集，部署 `db push` 安全。合併後提醒其他分支 session `git merge origin/main` 再部署。
