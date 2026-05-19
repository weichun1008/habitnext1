# Slice F — Daily-recurring Checklist Subtasks with Versioned Timeline

**Date:** 2026-05-18
**Status:** Design approved, ready for implementation plan
**Scope:** habitnext1 web-app — 修架構讓 checklist subtasks 變成「每日獨立 + 時間軸版本化」，並讓使用者可以以 Google-Calendar 風格刪除/隱藏 subtasks。同步把 6 個 meal-pattern habits 升級為 checklist 結構。

---

## 1. 背景

現有 `checklist` type 把 `completed` flag 存在 `Task.subtasks` master 物件上、無 per-date 隔離。這代表：使用者在 day 1 check 早餐 → `subtask.completed=true` 永久存在 → day 2 打開仍然看到「已完成」。沒有每日重置機制。

這個 bug 阻擋了「每餐都要做 X」這類 daily-recurring multi-slot habit 的正確實作。同時也讓 16:8 斷食使用者沒辦法以「永久跳早餐」的方式調整 subtasks，因為 subtasks 是一次性模板、沒有時間軸版本概念。

本 slice 一次性處理兩個問題：
- **A. Daily reset** — completion state 移到 `TaskHistory` per-date
- **B. Versioned subtasks** — subtask 物件加 `addedAt / removedAt` 時間軸欄位、UI 提供 Google-Calendar 風格的刪除選項

## 2. 目標

讓 checklist 型 habit 真正支援「每日必做 N 個 sub-step」的模式，且使用者能以時間軸方式新增/隱藏/刪除 subtasks 而不破壞既有歷史紀錄。

### Non-goals

- **「只有這天」隱藏 subtask** — 跳餐者直接 leave unchecked 即可，per-date hide list 過度設計
- **Per-day-of-week subtask 排程**（週末跳早餐、平日吃）— YAGNI
- **Subtask 排序拖曳重排** — 沿用陣列順序
- **Subtask 完成 timeline 統計視圖** — 留給未來 stats slice
- **點心 (snack) 出現在任何 meal habit subtasks** — 產品決策：不鼓勵
- **Subtask 顏色 / icon / 個別 metadata** — 純文字 label

## 3. 資料模型

### Schema 改動

```prisma
model TaskHistory {
  id                String   @id @default(cuid())
  taskId            String
  task              Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  date              String   // YYYY-MM-DD
  completed         Boolean  @default(false)
  value             Int      @default(0)
  subtaskCompletions Json?   // ★ 新增 — { subtaskId: boolean } per-date 狀態

  @@unique([taskId, date])
}
```

`Task.subtasks` 欄位本身不改 schema 型別（仍是 `Json`），但內部物件結構升級。

### Subtask 物件結構升級

| 舊 | 新 |
|---|---|
| `{ id, label, completed }` （或 `{ id, title, completed }`，UI code 看過兩種） | `{ id, label, addedAt, removedAt? }` |

- `id` — string，render React key、history 對照 key
- `label` — string，顯示文字（rename 不改 id）
- `addedAt` — string `YYYY-MM-DD`，subtask 加入的日期（render 時：date >= addedAt 才顯示）
- `removedAt` — optional string `YYYY-MM-DD`，subtask「停止顯示」起算日（render 時：!removedAt || date < removedAt 才顯示）

**沒有 `completed` 欄位。** Completion state 由 `TaskHistory.subtaskCompletions[id]` 決定。

### TaskHistory.subtaskCompletions 結構

```json
{
  "breakfast": true,
  "lunch": true,
  "dinner": false
}
```

- Key = subtask id
- Value = boolean
- Missing key = 預設 false（未勾選）
- 重點：**這個 JSON 只記 explicitly toggled state**，沒被觸碰過的 subtask 不會出現

### TaskHistory.value 計算規則（for checklist）

`value = Object.values(subtaskCompletions).filter(v => v === true).length`

每次 toggle subtask 時同步重算 value，讓既有「X/Y 進度」UI 無需邏輯改動就能正確顯示。

## 4. Render 邏輯

對任意 date `D`，顯示的 subtasks 為：

```js
task.subtasks.filter(s =>
  s.addedAt <= D &&
  (!s.removedAt || D < s.removedAt)
)
```

對該 D 日的 completion state：

```js
const history = taskHistory.find(h => h.date === D);
const completed = history?.subtaskCompletions || {};
const isChecked = (subtaskId) => completed[subtaskId] === true;
```

### 已停用 (removedAt) 但在過去日期出現的 subtask

過去日期 view 看到「從今天起刪除」的 subtask 時：
- 顯示為已停用樣式（灰底、淡字）
- 仍展示當時的 completion state（讀 history）
- **不可 click**（不能改過去的歷史）

這保留資料完整性，使用者也能看到「當時是這樣設定的」。

## 5. UI 改動

### TaskCard / DashboardSummaryCard

`X/Y` 顯示由 `taskHistory[date].value / subtasks(date).length` 計算。
今日如果 5 個 subtasks 中 2 個被打勾 → 「2/5」。

### TaskDetailModal — Subtasks 區塊

當前 view 的日期（`currentDate`）決定要顯示哪些 subtask + check state：

```jsx
const visibleSubtasks = task.subtasks.filter(/* addedAt / removedAt 過濾 */);
const completionMap = taskHistory[currentDate]?.subtaskCompletions || {};

{visibleSubtasks.map(sub => {
  const isChecked = completionMap[sub.id] === true;
  const isReadonly = isPastDate || sub.removedAt;  // 不可改過去 + 不可改已停用
  return (
    <div onClick={!isReadonly && (() => onUpdate(task, 'toggle_subtask', null, sub.id, currentDate))}>
      <Checkbox checked={isChecked} disabled={isReadonly} />
      <span className={isReadonly ? 'text-gray-400' : ''}>{sub.label}</span>
    </div>
  );
})}
```

### TaskFormModal — Subtask 編輯區

```
┌─ 子任務 (3)                                        ┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  [✏ 早餐________________]    [×]                  │
│  [✏ 午餐________________]    [×]                  │
│  [✏ 晚餐________________]    [×]                  │
│  [+ 加入子任務]                                    │
└────────────────────────────────────────────────────┘
```

### 刪除確認 sheet（inline，點 `×` 後展開）

```
┌──────────────────────────────────────────────────┐
│ 刪除「早餐」？                                    │
│                                                  │
│ ⊙ 從今天起不再出現                                │
│   過去的完成紀錄保留                              │
│                                                  │
│ ○ 永久刪除，包含所有過去紀錄                      │
│   清乾淨，過去的勾選紀錄一起消失                  │
│                                                  │
│              [取消]    [確認刪除]                 │
└──────────────────────────────────────────────────┘
```

| 選項 | Schema 動作 | TaskHistory 動作 |
|---|---|---|
| **從今天起不再出現** (default) | `subtask.removedAt = today` | 不動 |
| **永久刪除** | 從 `task.subtasks` 陣列 splice | 對所有相關 TaskHistory：移除 `subtaskCompletions[id]`、value 重算 |

**Rename**：直接改 label string，id / addedAt / removedAt 不動，過去歷史照常顯示新 label。

**Add**：`id = generateId()`, `addedAt = today`, `removedAt = undefined`。馬上開始在今天和之後出現。

## 6. 邏輯改動

### `toggle_subtask` action（MainApp.jsx）

**舊**：
```js
if (action === 'toggle_subtask' && subtaskId) {
  const newSubtasks = t.subtasks.map(s =>
    s.id === subtaskId ? { ...s, completed: !s.completed } : s
  );
  updatedTask = { ...t, subtasks: newSubtasks };
}
```

**新**：
```js
if (action === 'toggle_subtask' && subtaskId) {
  const dateStr = dateStr || getTodayStr();
  const prevHistory = t.history?.[dateStr] || { subtaskCompletions: {}, value: 0, completed: false };
  const prevCompletions = prevHistory.subtaskCompletions || {};
  const newCompletions = { ...prevCompletions, [subtaskId]: !prevCompletions[subtaskId] };
  const newValue = Object.values(newCompletions).filter(v => v === true).length;
  const visibleCount = visibleSubtasks(t, dateStr).length;
  // Task.dailyTarget is set at create time (per chosen difficulty); fallback to total visible if missing
  const newCompleted = newValue >= (t.dailyTarget || visibleCount);

  historyUpdate = {
    taskId: t.id,
    date: dateStr,
    subtaskCompletions: newCompletions,
    value: newValue,
    completed: newCompleted,
  };
  // 同時更新 client-side state
}
```

對應 server side：`PUT /api/tasks/:id/history` 接受 `subtaskCompletions` payload，upsert TaskHistory by `(taskId, date)`。

### 「永久刪除」cascade clear

刪 subtask + 選「永久刪除」時，後端需執行：
```js
// 1. 從 task.subtasks 陣列拿掉
const newSubtasks = task.subtasks.filter(s => s.id !== subtaskId);

// 2. 對該 task 所有 TaskHistory：移除 subtaskCompletions[subtaskId]、重算 value
const histories = await prisma.taskHistory.findMany({ where: { taskId } });
for (const h of histories) {
  if (!h.subtaskCompletions) continue;
  const { [subtaskId]: _, ...rest } = h.subtaskCompletions;
  const newValue = Object.values(rest).filter(v => v === true).length;
  await prisma.taskHistory.update({
    where: { id: h.id },
    data: { subtaskCompletions: rest, value: newValue, completed: newValue >= dailyTarget },
  });
}

// 3. 更新 task
await prisma.task.update({ where: { id: taskId }, data: { subtasks: newSubtasks } });
```

整個事務性執行 — 失敗 rollback。

## 7. 遷移計畫

### 一次性 migration script

`web-app/scripts/migrate-subtasks-format.js`：

```js
require('./lib/env');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const tasks = await prisma.task.findMany({
    where: { type: 'checklist' },
    select: { id: true, subtasks: true, createdAt: true },
  });

  let migrated = 0;
  for (const t of tasks) {
    const arr = Array.isArray(t.subtasks) ? t.subtasks : [];
    if (arr.length === 0) continue;
    if (arr.every(s => s.addedAt)) continue; // 已升級過

    const taskCreatedDate = t.createdAt.toISOString().slice(0, 10);
    const newSubtasks = arr.map(s => {
      const { completed: _, title, label, ...rest } = s;
      return {
        ...rest,
        label: label || title || '未命名子任務',
        addedAt: rest.addedAt || taskCreatedDate,
        // removedAt 不寫，預設不存在
      };
    });
    await prisma.task.update({ where: { id: t.id }, data: { subtasks: newSubtasks } });
    migrated++;
  }
  console.log(`Migrated ${migrated} tasks (subtask format upgrade)`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
```

**Production 現況**：96 個 Task / OfficialHabit，全部 `subtasks: []` 或不存在。腳本實質會印 `Migrated 0`。Safety net 而已。

### Seed JSON 同步升級

`prisma/seed/genesis-io-habits.json` 把 checklist habits 的 subtasks 從 `[]` 改成 `[{id, label, addedAt: '2026-05-18'}, ...]`。`addedAt` 用 seed 撰寫日期即可。

## 8. Meal habits 升級（6 個）

| Habit name | 目前 type | 改成 |
|---|---|---|
| 每餐攝取一個拳頭的蔬菜 | quantitative 1/2/3 份 | checklist + [早/午/晚]，dailyTarget 1/2/3 |
| 餐前喝一杯溫水 | binary 週3/週5/每日 | checklist + [早餐前/午餐前/晚餐前]，dailyTarget 1/2/3 |
| 吃飯細嚼慢嚥 (每口20下) | binary | checklist + [早/午/晚]，dailyTarget 1/2/3 |
| 維持血糖穩定 (先吃菜肉再吃飯) | binary | checklist + [早/午/晚]，dailyTarget 1/2/3 |
| **每餐都要有一份蛋白質**（新） | — | checklist + [早/午/晚]，dailyTarget 1/2/3 |
| **每餐前先喝一杯水**（新） | — | checklist + [早餐前/午餐前/晚餐前]，dailyTarget 1/2/3 |

每個的所有三難度都用同一 subtasks set（早/午/晚）。難度差異在 dailyTarget（1/2/3 中要做幾餐）+ recurrence（週3 / 週5 / 每日 cadence）。

斷食使用者：
- 入門 dailyTarget=1 → 任一餐達成 → fasting 者完全可行
- 進階 dailyTarget=2 → 兩餐達成 → 16:8 IF 跳早餐者剛好對到
- 挑戰 dailyTarget=3 → 全三餐達成 → fasting 者自然不適合，停在進階

不需改 subtasks，難度差異天然處理 fasting 場景。

## 9. 既有 2 個 checklist habits 處理

| Habit | 現況 | 處理 |
|---|---|---|
| 晨間脊椎伸展操 | subtasks=[] | 保留 []，使用者加入時自行填 subtasks (TaskFormModal) |
| 建立固定的睡前儀式 | subtasks=[] | 同上 |

**選擇不在 seed 預填 subtasks** — 因為這兩個 routine 內容非常個人化（每個人睡前儀式不同）。讓使用者用 TaskFormModal 自訂。

## 10. 風險與緩解

| 風險 | 緩解 |
|---|---|
| 既有正在用 app 的使用者 toggle subtask 時資料對不上 | 全部 task 的 subtasks 目前都是 `[]`，沒人 toggle 過。安全。 |
| `value` 重新計算邏輯 bug 影響既有 binary / quantitative | 改 only 在 `type==='checklist'` 才走新邏輯；binary/quantitative 既有邏輯不動 |
| 「永久刪除」誤觸 | 確認 sheet 明確、有取消、需主動點 radio + 確認鈕 |
| Subtask rename 後過去歷史看到「新 label」造成誤解 | 設計選擇：rename 應該是修正 typo / 改詞，而非語意改變。文件提示。 |
| TaskHistory.subtaskCompletions 為 null 與 `{}` 視為同義 | 程式判斷 `?.` chain，render 都當 `{}` |
| 過去日期 readonly UI 與 today 互動模式不一致 | 顯式 `isReadonly` flag、loose 樣式區隔 |

## 11. 驗收條件

1. `npx prisma db push` 後 `TaskHistory.subtaskCompletions` 是 nullable Json 欄位
2. 一個 checklist task 在 day1 check 兩個 subtask → TaskHistory.value = 2，subtaskCompletions 紀錄；day2 打開時所有 subtask 顯示 unchecked（每日重置 ✓）
3. day1 完成的 history 在 manage / calendar view 仍顯示「2/3」
4. 在 day10「從今天起」刪 subtask「早餐」：
   - day9 view：早餐顯示為已停用樣式、不可 click、保留歷史 check 狀態
   - day10 / 11 view：早餐不出現
5. 在 day10「永久刪除」subtask「早餐」：
   - day9 / 10 view：早餐都不出現
   - day1 history `value` 自動減 1（如果之前完成過）
   - 不能 undo
6. 新增 subtask `addedAt=today`：在 day9 不出現、在 today+ 出現
7. Rename subtask 改變 label，id 不動，過去 / 未來都顯示新 label
8. 既有 binary / quantitative habit 行為完全不變（沒有 regression）
9. Seed 中 6 個 meal habit 使用 checklist + 早午晚 subtasks，dailyTarget 1/2/3 階梯
10. 既有 2 個 checklist habit (晨間脊椎伸展操、建立固定的睡前儀式) subtasks 仍為 `[]`、使用者加入後可自訂

## 12. 工作量估算

| 模組 | 工作量 |
|---|---|
| Schema delta + db push | 小 |
| Migration script + 跑 | 小 |
| Subtask 結構升級（type 定義 + util `visibleSubtasks(task, date)`） | 小 |
| `toggle_subtask` 邏輯重寫（client + server） | 中 |
| TaskCard / DashboardSummaryCard render 改讀 history | 中 |
| TaskDetailModal subtask 區塊改讀 history、readonly handling | 中 |
| TaskFormModal subtask 編輯區 + 刪除確認 sheet | 中-大 |
| 「永久刪除」cascade API | 中 |
| Seed 6 個 meal habit | 小 |
| 單元測試覆蓋（toggle、render filter、value 計算） | 中 |

整體：**比 Slice A 大，比 Slice A + B 加總小**。預估 10-12 個 task，分 3 個 commit chunk 完成。

## 13. 與其他 slice 關係

- **Slice A** 完成的 explore 入口、9-card 流程不變
- **Slice A.5** 完成的 90 habit seed — 修 4 個 meal 類 + 加 2 個新 meal 類
- **Slice B** 完成的 anchor (cue) 不影響：cue 是字串、跟 subtask 無關
- **Slice E (Identity)** 未來會加 `Task.identity`，跟本 slice 正交
- **無 admin / API 既有 contract breaking**
