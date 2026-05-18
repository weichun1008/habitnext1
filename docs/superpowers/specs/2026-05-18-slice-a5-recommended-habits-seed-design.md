# Slice A.5 — 官方推薦習慣資料庫 Seed

**Date:** 2026-05-18
**Status:** Design approved, ready for implementation plan
**Scope:** habitnext1 web-app — 把 9 個 GENESIS+IO 分類填上 ~90 個推薦習慣

---

## 1. 背景

Slice A 已上線 9-card GENESIS+IO 探索入口，但 prod DB 只有 3 個既有 OfficialHabit，導致 8 個 domain 點進去是空的。Slice B（AI 雙軌 Anchor × Behavior 探索）會在之後處理，但在此之前需要先讓現有 explore Modal 有實際內容。

本 spec 處理 **內容工程**：把 Gemini 參考檔（`C:\Users\user\Documents\ai test\habit_explore_v1_bygemini.txt`）裡的 90 個 sub-goal 字串轉成 90 個完整 OfficialHabit records，含 description 與三個難度的詳細設定。

## 2. 目標

讓「探索習慣」每個 GENESIS+IO 分類各有 ~10 個推薦習慣，使用者點進去能直接挑入門/進階/挑戰加入追蹤，整個 Slice A 的探索流程具備實質內容。

### Non-goals

- AI brainstorm Anchor × Behavior 流程 — Slice B
- Admin 批次匯入 / 批次編輯工具 — YAGNI；未來新增的習慣由 admin 一個個加
- OfficialHabit.icon 從 emoji 換 Lucide — 跟 Slice A 同類技術債一起處理
- subtasks JSON 內容填充 — 留空陣列（type=`checklist` 的習慣在 review 摘要中標註）
- i18n / 雙語名稱 — 純中文（zh-TW）
- 排序 / 熱門度 / 推薦演算法 — 沿用 Slice A 的 category.order + habit.createdAt

## 3. Schema 改動

```prisma
model OfficialHabit {
  id           String   @id @default(cuid())
  name         String   @unique   // ★ 新增 @unique
  description  String?
  category     String
  icon         String?
  difficulties Json
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

僅新增 `@unique` 在既有 `name` 欄位上。`prisma db push` 會驗證既有資料：當前 3 個 habit name（「想喝含糖手搖飲的時候用無糖茶代替」、「每天跑步」、「每日循環呼吸法10次」）已唯一，不會 reject。

## 4. 資料來源

Gemini 參考檔 `CATEGORIES` 常數，9 個分類 × 10 個 `subGoals` = 90 個字串。對照如下：

| Category (中) | subGoals 樣本 |
|---|---|
| 基因與腸道 | 每日攝取益生菌/發酵食物、觀察並記錄每日排便狀況、餐前喝一杯溫水…等 10 個 |
| 環境 | 每天早晨開窗通風、整理工作桌面保持清爽、接觸大自然/戶外散步…等 10 個 |
| 飲食 | 執行 168 間歇性斷食、每餐攝取一個拳頭的蔬菜、減少精緻糖與澱粉攝取…等 10 個 |
| 運動 | 飯後散步 15 分鐘、每天深蹲 30 下、避免久坐超過 60 分鐘…等 10 個 |
| 壓力與睡眠 | 睡前 1 小時不看手機、練習 4-7-8 呼吸法紓壓、確保每天 7 小時優質睡眠…等 10 個 |
| 社交互動 | 每天擁抱家人/伴侶、每週與一位好友通話、練習傾聽不打斷…等 10 個 |
| 心靈 | 每日正念冥想 10 分鐘、寫下感恩日記、定義個人核心價值觀…等 10 個 |
| 認知與智慧 | 每天閱讀非虛構書籍 15 分鐘、學習一項新技能或語言、玩益智遊戲…等 10 個 |
| 職涯與平衡 | 設定每日最重要的三件事、劃分清晰的工作/生活界線、定期檢視職涯成就感…等 10 個 |

每個字串 → 一個 OfficialHabit.name；我（Claude）依此推論 description / type / 三難度設定。

## 5. 內容生成原則

### Type 選擇

| 習慣性質 | type |
|---|---|
| 量化追蹤（喝水量、步數、cc、分鐘數） | `quantitative` |
| 是否完成（單純做了沒做） | `binary` |
| 多步驟（如 morning routine 5 件事） | `checklist` |

預設策略：**不確定時優先用 `binary`**（門檻最低、追蹤最直觀）。

### 難度升級邏輯（頻率 / 數量階梯）

**Binary 習慣**：頻率升級
- 入門：每週 2-3 次（`recurrence.type='weekly'`, `weekDays=[1,3,5]`, `periodTarget=3`, `weekMode='flexible'`）
- 進階：每週 5 次或週間每日（`weekDays=[1,2,3,4,5]`, `periodTarget=5`）
- 挑戰：每日（`recurrence.type='daily'`, `interval=1`, `periodTarget=1`）

**Quantitative 習慣**：目標量階梯
- 入門：較低目標（如 1500cc / 6000 步）
- 進階：中等目標（如 2000cc / 8000 步）
- 挑戰：高目標（如 2500cc / 10000 步）
- 預設 `recurrence.type='daily'`

**Checklist 習慣**：subtasks 數量階梯
- 入門：1-2 個 subtask、`recurrence.type='daily'`
- 進階：3 個 subtask
- 挑戰：5 個 subtask（或本 spec 留空陣列由 user 補）

### Description 風格

每個 habit 一句話 1-2 句，講行為原理或好處（讓使用者懂為什麼做）。例：
- 「血糖穩定有助於減少飢餓波動，避免暴飲暴食。」
- 「腹式呼吸啟動副交感神經，3 分鐘內降低壓力反應。」
- 「睡前藍光抑制褪黑激素分泌，影響入睡品質。」

中性、不過度行銷化。

## 6. 檔案結構

### 新增

| Path | 責任 |
|---|---|
| `web-app/prisma/seed/genesis-io-habits.json` | 90 個 OfficialHabit records（含完整 difficulties JSON） |
| `web-app/scripts/seed-genesis-io-habits.js` | Idempotent upsert by name（沿用 Slice A 模式） |
| `docs/superpowers/notes/2026-05-18-habit-seed-review.md` | Review 摘要 markdown — 每個 domain 一個表格列出 90 個 habit 的 type 與三難設定，標註不確定處 |

### 修改

| Path | 改動 |
|---|---|
| `web-app/prisma/schema.prisma` | `OfficialHabit.name` 加 `@unique` |

## 7. 流程

```
Phase 1 (Claude 一次性生成)
  ├─ 讀 Gemini ref 的 9×10=90 subGoals
  ├─ 每個推論 description / type / 三難度 recurrence
  ├─ 寫入 prisma/seed/genesis-io-habits.json
  ├─ 同時寫入 review 摘要 md
  └─ commit: "chore(seed): scaffold 90 GENESIS+IO recommended habits"

Phase 2 (User review)
  ├─ User 在 editor 開啟 genesis-io-habits.json
  ├─ 對照 review md 掃描每個 habit
  ├─ 改 description / type / target / recurrence / 刪除 / 新增
  └─ User commit: "chore(seed): user review of 90 habits"

Phase 3 (Schema + seed)
  ├─ Schema: 加 @unique 到 OfficialHabit.name
  ├─ npx prisma db push（影響 prod DB，因 dev/prod 共用）
  ├─ Audit 既有 OfficialHabit
  ├─ 跑 seed: node scripts/seed-genesis-io-habits.js
  ├─ Re-run for idempotency check
  └─ commit: "feat(db): unique habit names + seed 90 GENESIS+IO habits"

Phase 4 (UI 驗證 + push)
  ├─ 重新整理 live site，開「探索習慣」
  ├─ 每個 domain 點進去應該有 ~10 個 habit cards
  ├─ 點某個 habit → 難度選擇 → 加入流程不變
  └─ push main，Vercel 自動部署
```

## 8. Seed Script 規格

`web-app/scripts/seed-genesis-io-habits.js`：

```js
require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'genesis-io-habits.json');
  const habits = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Audit before
  const beforeCount = await prisma.officialHabit.count();
  console.log(`Before: ${beforeCount} habits`);

  let created = 0, updated = 0;
  for (const h of habits) {
    const existing = await prisma.officialHabit.findUnique({ where: { name: h.name } });
    await prisma.officialHabit.upsert({
      where: { name: h.name },
      update: {
        description: h.description,
        category: h.category,
        icon: h.icon,
        difficulties: h.difficulties,
        isActive: true,
      },
      create: { ...h, isActive: true },
    });
    if (existing) updated++; else created++;
  }

  const afterCount = await prisma.officialHabit.count();
  console.log(`Seeded GENESIS+IO habits: created=${created}, updated=${updated}`);
  console.log(`After: ${afterCount} habits`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

**Idempotency**：跑 N 次結果一致；既有 3 個非 seed 名稱的 habits 完全不被觸及（不在 90 名單內、不會被 upsert）。

## 9. 驗收條件

1. `npx prisma db push` 不會丟資料、`OfficialHabit.name` 變成 unique
2. Seed 第一次：`created=90, updated=0`、`Before: 3, After: 93`
3. Seed 第二次：`created=0, updated=90`、`Before: 93, After: 93`（idempotent）
4. 既有 3 個 habit 仍存在、名稱與 category 不變
5. `/api/habits` 回傳 93 個 habits
6. UI 「探索習慣」每個 GENESIS+IO domain 點進去：
   - 9 個 domain 每個各有 10 個 seed habits（除非 user review 時刪減）
   - 既有 3 個 habit 仍在原 category（飲食、運動、心靈）內，與新 seed 並列；該三個 domain 顯示 11 個 cards
7. 點任一新 habit → 進入 TaskFormModal → 難度選擇器顯示 3 個難度（除非 subtasks 為空的 checklist habit）→ 加入流程不變

## 10. 風險與緩解

| 風險 | 緩解 |
|---|---|
| Claude 推論的 3 難度不符行為科學最佳實踐 | review markdown 攤開所有設定；user 一次性修正 |
| 90 個 habit 太多、explore Modal 滑很久 | 不在本 slice 處理；等真實使用數據；admin 可 isActive=false 隱藏 |
| Name 跟既有 3 個 habit 衝突 | 抽樣比對 — 「想喝含糖手搖飲的時候用無糖茶代替」「每天跑步」「每日循環呼吸法10次」均不在 Gemini ref 90 名單內；極不可能衝突；script 用 upsert 自動處理 |
| Type 判斷錯（binary vs quantitative） | review md 標註所有 type；user 掃過時改 |
| 既有 unique index 建立失敗（已有重複 name） | 跑 schema 前 audit；如有重複手動處理 |
| `@unique` 上線後 admin 新增同名 habit 會 P2002 | 預期行為；admin UI 既有錯誤訊息 fallback |

## 11. 與 Slice A / B 關係

- **Slice A 延伸**：本 slice 沒有改動 explore UI 行為，只填內容；Slice A 的 9-card → habit list 流程直接受益
- **Slice B 前置**：AI 雙軌探索流程也會把 AI 生成的習慣寫入 OfficialHabit 或類似結構；提早做好 schema unique 約束有利於後續穩定
- **無 breaking change**：既有 admin 後台 / API / `/api/habits` 全部不變
