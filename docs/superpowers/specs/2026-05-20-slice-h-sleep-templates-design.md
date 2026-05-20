# Slice H — 14 天睡眠體感處方 Templates

**Date:** 2026-05-20
**Status:** Design approved, ready for implementation plan
**Scope:** habitnext1 web-app — 加上第二個 typing 維度 `User.sleepTypeKey` 並 seed 4 個 14 天睡眠處方 Templates

---

## 1. 背景

同事整理了一份「14 天睡眠體感處方」分型任務總表（`Cofit_14天睡眠體感處方_分型任務總表.xlsx`），把使用者依睡眠卡點分 4 型（壓力 / 節律 / 代謝失衡 / 荷爾蒙波動），每型有：

- 1 個主任務（4 階梯 baby steps：Step 1 → Step 2 → Step 3 → Final）
- 1 個保健補給任務（多時段、多產品）
- 4 個加速任務（priority 排序，optional）

睡眠分型跟既有的「女性週期 4 花朵」分型**正交**（一個使用者可同時是「玫瑰型 + 壓力型」），需要第二個 typing 維度。問卷邏輯另一同事負責（同 Slice G 模式），會寫進新欄位 `User.sleepTypeKey`。

主任務 4 階梯 baby steps 結構**完美對應**既有 `Template + Phase` 機制（已在 Slice G Chunk 3 驗證 phase rollover 正常）。

## 2. 目標

**Slice H**：使用者答完睡眠問卷後 `User.sleepTypeKey` 設定 → dashboard 顯示「為你準備的睡眠處方」CTA → 加入該 type 的 14 天 4-phase template → 既有 phase rollover 機制自動推進。

### Non-goals

- 睡眠問卷邏輯（其他同事負責）
- 加速任務 #2-4 的 selectable/optional UI（未來功能，使用者目前可從探索習慣手動加）
- Day 7 體感 pulse-check 問卷（未來 reflection 模組）
- 多 program 衝突管理（既有支援多訂閱）
- 醫療化文案 lint 工具
- Auto-archive expired tasks（既有 phase rollover 機制已處理）

## 3. 與其他模組的合約

### 與睡眠問卷模組

```prisma
model User {
  ...
  sleepTypeKey String?  // ★ 新增 — 'stress' | 'rhythm' | 'metabolic' | 'hormone'
}
```

問卷模組責任：答題完成後把對應結果寫入 `user.sleepTypeKey`。本 spec 不實作問卷端。

4 個 enum 值固定：
- `'stress'` — 壓力型
- `'rhythm'` — 節律型
- `'metabolic'` — 代謝失衡型
- `'hormone'` — 荷爾蒙波動型

### Template.category 命名

| Template name | category slug |
|---|---|
| 壓力型睡眠處方 | `sleep_stress` |
| 節律型睡眠處方 | `sleep_rhythm` |
| 代謝失衡型睡眠處方 | `sleep_metabolic` |
| 荷爾蒙波動型睡眠處方 | `sleep_hormone` |

加 `sleep_` 前綴避免跟未來其他 typing namespace 衝突。

## 4. 資料模型

### Schema

```prisma
model User {
  ...
  typeKey       String?   // 既有 — 4 花朵
  sleepTypeKey  String?   // ★ 新增 — 4 睡眠 type
}
```

無其他 schema 改動。沿用既有 Template / Phase / Assignment / Task 結構。

### `src/lib/sleepTypeKeys.js`（新檔，mirror typeKeys.js）

```js
const SLEEP_TYPE_PROFILES = {
  stress: {
    label: '壓力型',
    categorySlug: 'sleep_stress',
    iconName: 'Brain',
    identity: '我是個照顧大腦放鬆的人',
  },
  rhythm: {
    label: '節律型',
    categorySlug: 'sleep_rhythm',
    iconName: 'Sunrise',
    identity: '我是個尊重生理節律的人',
  },
  metabolic: {
    label: '代謝失衡型',
    categorySlug: 'sleep_metabolic',
    iconName: 'Apple',
    identity: '我是個照顧代謝健康的人',  // 跟向日葵型相通
  },
  hormone: {
    label: '荷爾蒙波動型',
    categorySlug: 'sleep_hormone',
    iconName: 'Thermometer',
    identity: '我是個照顧週期身體的人',  // 跟玫瑰型相通
  },
};

function deriveSleepDefaultIdentity(sleepTypeKey) {
  if (!sleepTypeKey) return null;
  const profile = SLEEP_TYPE_PROFILES[sleepTypeKey];
  return profile ? profile.identity : null;
}

function deriveSleepTypeFromCategory(category) {
  if (!category || typeof category !== 'string') return null;
  if (!category.startsWith('sleep_')) return null;
  const key = category.slice('sleep_'.length);
  return key in SLEEP_TYPE_PROFILES ? key : null;
}

module.exports = {
  SLEEP_TYPE_PROFILES,
  deriveSleepTypeFromCategory,
  deriveSleepDefaultIdentity,
};
```

### 4 個 Lucide icon 加進 whitelist

`web-app/src/components/explore/LUCIDE_ICONS.js` `LUCIDE_ICON_MAP` 增加：
- `Brain`（壓力型 — 大腦過度活躍）
- `Sunrise`（節律型 — 晨間光照 zeitgeber）
- `Apple`（代謝失衡型 — 飲食結構）
- `Thermometer`（荷爾蒙波動型 — 體溫調節）

## 5. Template Phase 結構

### 14 天分 4 phase

```
Phase 1 (Day 1-3,  3 days):  Step 1 — 入門
Phase 2 (Day 4-7,  4 days):  Step 2-3 — 漸進累積
Phase 3 (Day 8-10, 3 days):  Step Final — 完整版主任務
Phase 4 (Day 11-14, 4 days): Maintain + 1 加速任務
```

Phase.days = `[3, 4, 3, 4]`，加總 14。

### Phase 內 task

| Phase | Task 數 | 組成 |
|---|---|---|
| 1 | 2 | 主任務 Step 1 + 保健補給 |
| 2 | 2 | 主任務 Step 2-3 + 保健補給 |
| 3 | 2 | 主任務 Step Final + 保健補給 |
| 4 | 2 | 主任務 Maintain + 加速任務 #1 |

主任務每 phase **替換** (非累加) — 跟 Slice G 一致。

每個 task 帶 `defaultCue` + `defaultIdentity`（依該 type 的 `SLEEP_TYPE_PROFILES[sleepTypeKey].identity` 設定 — 4 type 各不同）。

### 主任務 4 階梯（依 type）

| Type | Phase 1 (Step 1) | Phase 2 (Step 2-3) | Phase 3 (Final) | Phase 4 (Maintain) |
|---|---|---|---|---|
| 壓力型 | 睡前 15 分鐘不滑社群 | 手機移出床邊 → 睡前 30 分鐘停止高刺激內容 | 睡前 60 分鐘停止高刺激螢幕 | 持續數位宵禁 + 觀察體感 |
| 節律型 | 記錄目前實際起床時間 | 每天提前 15-30 分鐘 → 起床後立即離開床鋪 | 固定起床時間（誤差 ≤ 30 分鐘） | 持續固定起床 + 觀察體感 |
| 代謝失衡型 | 晚餐加入 1 份蛋白質 | 加入 1-2 份蔬菜 → 一部分白飯換原型澱粉 | 完整穩糖晚餐結構（蛋白質+蔬菜+原型澱粉） | 持續完整晚餐 + 觀察體感 |
| 荷爾蒙波動型 | 調整睡衣材質 | 調整棉被厚度 → 優化通風 | 完整睡前環境調整（室溫+衣物+寢具） | 持續環境管理 + 觀察體感 |

Phase 2 的 Step 2/3 合併為 1 個 task description（描述兩階段），對應 4 天時間給使用者完成兩步。

### 加速任務 #1（Phase 4 用）

每個 type 的 #1 priority 加速任務（依同事文件「優先順序」column）：
- 壓力型 #1：下午 2 點後避免咖啡因飲品
- 節律型 #1：每天 10-20 分鐘晨間自然光照
- 代謝失衡型 #1：固定三餐時間（間隔 3-5 小時）
- 荷爾蒙波動型 #1：每天 20-30 分鐘輕中度活動

### 保健補給任務（每 phase 都帶、checklist + subtasks）

每 type 的保健品時段：

**壓力型**：
- `L082`：早餐後 1 包 + 晚餐後 1 包
（孕婦/哺乳婦禁食註記在 description）

**節律型**：
- 晚安包：睡前 1 包（孕婦禁食）
- 極黑生薑黃：白天飯後 2 顆
- B 群：白天 1 顆

**代謝失衡型**：
- 鎂：睡前 1 顆
- 苦瓜胜肽：每餐前 1 顆（孕婦忌食）
- 肉鹼：早上 2 顆
- B 群：早上 2 顆
- 甲殼素：晚餐前 1 顆（孕婦/哺乳婦禁食）

**荷爾蒙波動型**：
- 鎂：睡前 1 顆
- 魚油：晚餐後 2 顆（孕婦/哺乳婦禁食 — 修正同事 typo）
- 活性葉酸鐵：早上餐前 1 小時 1 顆
- 極黑生薑黃：午餐後 2 顆
- B 群：早上 2 顆

每個 type 的保健補給任務：1 個 `type: "checklist"` task，`subtasks` 列出時段（如 `[L082早餐後, L082晚餐後]`），daily reset（Slice F 機制）。

## 6. UI 改動

### Dashboard 兩 CTA 並列

既有花朵 CTA + 新增睡眠 CTA：

```jsx
{user?.typeKey && USER_TYPE_PROFILES[user.typeKey] && !hasJoinedFlowerTemplate && (
    <FlowerCTA /> // 既有
)}
{user?.sleepTypeKey && SLEEP_TYPE_PROFILES[user.sleepTypeKey] && !hasJoinedSleepTemplate && (
    <SleepCTA />  // ★ 新增
)}
```

SleepCTA 用較冷色系（藍紫漸層）跟花朵 CTA（粉橘漸層）區隔。Icon 用 Moon。

### TemplateExplorer 過濾邏輯

```js
const FLOWER_TYPES = new Set(['daisy','rose','orchid','sunflower']);
const SLEEP_CATEGORIES = new Set(['sleep_stress','sleep_rhythm','sleep_metabolic','sleep_hormone']);

const visibleTemplates = templates.filter(t => {
  if (FLOWER_TYPES.has(t.category)) return t.category === userTypeKey;
  if (SLEEP_CATEGORIES.has(t.category)) {
    return userSleepTypeKey && t.category === `sleep_${userSleepTypeKey}`;
  }
  return true; // other public templates (e.g. 健康計劃30天)
});
```

MainApp 傳 `userSleepTypeKey={user?.sleepTypeKey || null}` 給 TemplateExplorer。

### 「已加入睡眠處方」判斷

```js
const hasJoinedSleepTemplate = (() => {
  if (!user?.sleepTypeKey) return false;
  const targetCategory = `sleep_${user.sleepTypeKey}`;
  return assignments.some(a => a.template?.category === targetCategory && a.status === 'active');
})();
```

判斷比花朵 CTA 嚴格 — 因為 sleep program 跟花朵 program 互不衝突，使用者可同時訂 2 個。`hasJoinedAnyTemplate` 對 sleep 不適用，要單獨判斷對應 sleep template。

對應地，**既有花朵 CTA 的「已加入」判斷也要從 `hasJoinedAnyTemplate` 改回更嚴格的 `hasJoinedFlowerTemplate`**，否則加入 sleep program 後花朵 CTA 也會消失（誤判）。

## 7. 資料遷移

無 schema migration。`User.sleepTypeKey` 新增 nullable，舊資料零破壞。

## 8. 範圍邊界

### 含
✅ `User.sleepTypeKey` schema delta
✅ `sleepTypeKeys.js` lib + 4 Lucide icon
✅ TemplateExplorer 三層過濾邏輯
✅ Dashboard 雙 CTA（既有花朵改用 `hasJoinedFlowerTemplate`）
✅ 4 Sleep Template seed JSON + 對應 seed script
✅ Sleep CTA UI 與花朵 CTA 視覺區隔

### 不含
❌ 睡眠問卷邏輯
❌ Day 7 體感問卷
❌ 加速任務 #2/3/4 整合進 program
❌ 保健品產品庫管理（內容直接 inline 在 task subtasks）
❌ Two-CTA conflict UI（兩個都在的 mobile 排版測試會處理但不重寫 dashboard layout）

## 9. 風險與緩解

| 風險 | 緩解 |
|---|---|
| 同事睡眠問卷模組合約沒對齊 sleepTypeKey | Chunk 1 出來時 sync；4 enum 值固定 |
| 同事 typo 還沒修但我們 seed | 用 typo 修正版（feedback md 已明示要修的 4 處） |
| Identity 全用同一個太單調 | 設計選擇 — 強化 program 主題；如不行未來可分 4 個 |
| Dashboard 多 CTA + 既有「生理期模式」toggle 太擠 | 預設 2 CTA 並列已測，第三個元件未來 collapse／sticky bar |
| 既有花朵 CTA 用 `hasJoinedAnyTemplate` 判斷會被 sleep 訂閱誤判 | 改為 `hasJoinedFlowerTemplate`（本 slice 順手修） |
| 加速任務 #1 放進 Phase 4 但體感不夠 | 接受 trade-off；未來「optional accelerator」 slice 開放完整 4 個 |

## 10. 驗收條件

1. `npx prisma db push` 後 `User.sleepTypeKey String?` 存在、舊資料零破壞
2. `sleepTypeKeys.js` 4 entries 對應 4 Lucide icon (Brain/Sunrise/Apple/Thermometer)
3. LUCIDE_ICON_MAP 含這 4 個新 icon
4. 4 Sleep Template seed 進 DB（DB 共 9 templates = 1 既有 + 4 花朵 + 4 睡眠）
5. seed script idempotent（重跑 created=0, updated=4）
6. typeKey=null + sleepTypeKey='stress' 使用者 dashboard 顯示「為你準備的睡眠處方：壓力型」CTA，看不到花朵 CTA
7. typeKey='rose' + sleepTypeKey='stress' 使用者 dashboard 兩個 CTA 並列
8. typeKey='rose' + sleepTypeKey='stress' 使用者 TemplateExplorer 過濾後顯示：玫瑰型小課程 + 壓力型睡眠處方 + 其他公開 Template（健康計劃30天）；不顯示其他 3 花朵或 3 睡眠 type
9. 加入「壓力型睡眠處方」→ 14 day 跨 4 phase 自動建立 8 個 task (4 phase × 2 task)、phase rollover 對的（Day 4 看到 Phase 2 task）、`Task.cue` + `Task.identity = '我是個照顧大腦放鬆的人'`（per-type）都帶上
10. 加入 sleep program 後花朵 CTA 不消失（仍為 typeKey 顯示 CTA — 假設未加入花朵 program）

## 11. 與其他 slice 關係

- **Slice A.5 / F** 既有 OfficialHabit (105 個) 與 checklist 機制：用於保健品多時段 subtasks 結構
- **Slice B** 既有 cue：sleep task 帶 defaultCue
- **Slice E** 既有 identity：sleep task 帶 per-type `defaultIdentity`（每個 sleep type 不同，從 `sleepTypeKeys.js` 取）
- **Slice G Chunk 3 (T16)** 既有 `/api/user/assignments` 已 patch 為支援 defaultCue/defaultIdentity 繼承到 Task — sleep template 直接受惠
- **Slice G Chunk 3 (T17-T19)** 既有 4 花朵 Templates + seed script pattern：直接複用模式
- **無 admin 後台改動 / 無 API 既有 contract breaking**
