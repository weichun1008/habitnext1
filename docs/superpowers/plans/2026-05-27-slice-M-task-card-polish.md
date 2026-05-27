# Slice M — TaskCard 優化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Daily view 任務卡：智慧排序（cue 時間序）、乾淨完成樣式（drop line-through）、手機 swipe / 桌面 hover 露出 action menu、Detail modal 加暫停/隱藏/刪除。

**Architecture:** 加 `CUE_ORDER` map 與 `cueOrderFor` 純函數到 `lib/anchors.js`；`status` 加合法值 `'paused'`（不動 schema 結構、只擴 PUT enum）；3 個新元件 `SwipeReveal` / `TaskHoverDots` / `TaskActionMenu`（後者為共用）；改 `TaskCard.jsx` 整合 + 改 `MainApp.jsx` 排序 + 改 `TaskDetailModal.jsx` footer。

**Tech Stack:** Next.js 14 App Router、React 18、Tailwind CSS、lucide-react、Jest + RTL。

**Spec:** [`docs/superpowers/specs/2026-05-27-slice-M-task-card-polish-design.md`](../specs/2026-05-27-slice-M-task-card-polish-design.md)

---

## Open Questions Resolved（寫 plan 前定錨）

Spec §9 5 項實作細節：

1. **Swipe threshold**: **80px**
2. **Swipe 復位動畫**: 250ms spring，鬆手立即復位
3. **Hover ⋮ 顯示延遲**: **100ms**（避免滑鼠掠過誤觸）
4. **Popover 關閉**: click outside / Esc / 選定 action 後
5. **Confirm 文案**:
   - Delete: `「確定要永久刪除這個習慣嗎？所有歷史紀錄也會一起消失。」`
   - Pause: `「暫停這個習慣？暫停期間不會出現在今日行程。」`
   - Hide: `「隱藏這個習慣？之後不會再看到。」`

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/src/__tests__/lib/anchors.test.js` | TDD for `cueOrderFor` + `CUE_ORDER` 完整性 |
| `web-app/src/components/taskCard/TaskActionMenu.jsx` | 共用 action menu — [⏸ 暫停] [🙈 隱藏] [🗑️ 刪除] buttons + confirm + API |
| `web-app/src/components/taskCard/SwipeReveal.jsx` | 手機左滑 reveal wrapper，右滑觸發 onSwipeRight |
| `web-app/src/components/taskCard/TaskHoverDots.jsx` | 桌面 hover ⋮ button + popover wrapping TaskActionMenu |

### Modified
| Path | Change |
|---|---|
| `web-app/src/lib/anchors.js` | 加 `CUE_ORDER` map (27 entries with time order) + `cueOrderFor(cue)` helper |
| `web-app/src/components/MainApp.jsx` | dailyTasks 加 sort（未完成優先 + cue 時間序 + tie-break createdAt）+ daily view 不顯示 paused/archived |
| `web-app/src/components/TaskCard.jsx` | 拿掉 line-through、加 opacity-55 + 左 emerald accent；整合 SwipeReveal + TaskHoverDots |
| `web-app/src/components/TaskDetailModal.jsx` | Footer 加 [⏸ 暫停] [🙈 隱藏] [🗑️ 刪除] row |
| `web-app/src/app/api/tasks/[id]/route.js` | PUT 接受 `status: 'paused'` / `'archived'` 為合法值；既有 active/candidate 不變 |
| `web-app/prisma/schema.prisma` | Comment 上 status 註解加 `paused` 值（無實際 schema 變動）|

---

## Task 1: `CUE_ORDER` + `cueOrderFor` in `lib/anchors.js` (TDD)

**Files:**
- Modify: `web-app/src/lib/anchors.js`
- Create: `web-app/src/__tests__/lib/anchors.test.js`

### Step 1: Write the failing test

建立 `web-app/src/__tests__/lib/anchors.test.js`：

```js
const {
  LIFE_MOMENTS,
  CUE_ORDER,
  cueOrderFor,
} = require('../../lib/anchors');

describe('CUE_ORDER', () => {
  it('has an entry for every label in LIFE_MOMENTS (except the 3 "any" group)', () => {
    // 30 anchors total; 3 are in `any` group (anytime) and map to 99
    // via cueOrderFor's default branch. CUE_ORDER itself holds 27.
    const anyGroup = LIFE_MOMENTS.filter(m => m.timeOfDay === 'any').map(m => m.label);
    const timed = LIFE_MOMENTS.filter(m => m.timeOfDay !== 'any');
    for (const m of timed) {
      expect(CUE_ORDER[m.label]).toBeDefined();
      expect(typeof CUE_ORDER[m.label]).toBe('number');
    }
    for (const label of anyGroup) {
      expect(CUE_ORDER[label]).toBeUndefined();
    }
  });

  it('orders 起床後 before 早餐前 before 午餐前 before 睡前躺上床後', () => {
    expect(CUE_ORDER['起床後']).toBeLessThan(CUE_ORDER['吃完早餐後']);
    expect(CUE_ORDER['吃完早餐後']).toBeLessThan(CUE_ORDER['午餐前']);
    expect(CUE_ORDER['午餐前']).toBeLessThan(CUE_ORDER['睡前躺上床後']);
  });
});

describe('cueOrderFor', () => {
  it('returns the CUE_ORDER value for a known built-in anchor', () => {
    expect(cueOrderFor('起床後')).toBe(CUE_ORDER['起床後']);
    expect(cueOrderFor('午餐前')).toBe(CUE_ORDER['午餐前']);
  });

  it('returns 99 for custom cue strings (not in CUE_ORDER)', () => {
    expect(cueOrderFor('週末外出前')).toBe(99);
    expect(cueOrderFor('我自己的時刻')).toBe(99);
  });

  it('returns 99 for the 3 "anytime" built-in anchors', () => {
    // These intentionally aren't in CUE_ORDER so they fall through to the
    // anytime bucket alongside custom cues.
    expect(cueOrderFor('排隊／等候時')).toBe(99);
    expect(cueOrderFor('打開社群媒體前')).toBe(99);
    expect(cueOrderFor('感到壓力時')).toBe(99);
  });

  it('returns 100 for null / undefined / empty string', () => {
    expect(cueOrderFor(null)).toBe(100);
    expect(cueOrderFor(undefined)).toBe(100);
    expect(cueOrderFor('')).toBe(100);
  });
});
```

### Step 2: Run test to verify fail

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/anchors.test.js
```

Expected: `Cannot find module '../../lib/anchors'` or `CUE_ORDER is undefined`.

### Step 3: Implement — add to `lib/anchors.js`

打開 `web-app/src/lib/anchors.js`，在 `export const CUSTOM_ANCHOR_MAX_LENGTH = 30;` 之前加入：

```js
// Time-of-day order for each built-in anchor. Higher number = later in day.
// The 3 "any" group anchors intentionally omitted — they fall through to 99
// (anytime bucket) so they sort alongside custom cues.
//
// Used by daily-view sort to walk the user's day from morning to bedtime.
export const CUE_ORDER = {
  // 早晨 (morning)
  '起床後':                     1,
  '喝完第一杯水後':             2,
  '刷完牙後':                   3,
  '洗完臉後':                   4,
  '吃完早餐後':                 5,
  '出門前':                     6,

  // 通勤 (commute) — morning side
  '通勤路上':                   7,
  '等公車／捷運時':             8,
  '等紅綠燈時':                 9,

  // 到工作場所
  '到辦公室／工作場所後':       10,

  // 工作 (work) — morning to afternoon
  '開電腦／開始工作前':         11,
  '手機第一次解鎖時':           12,
  '泡咖啡／泡茶時':             13,

  // 中午 (noon)
  '午餐前':                     14,
  '午餐後':                     15,
  '午間休息時':                 16,

  // 工作 (work) — afternoon side
  '結束一個會議後':             17,
  '完成一項任務後':             18,
  '站起來伸展時':               19,

  // 晚上 (evening)
  '下班離開工作場所後':         20,
  '回家進門後':                 21,
  '晚餐前':                     22,
  '晚餐後':                     23,
  '洗完澡後':                   24,
  '上床睡覺前':                 25,
  '睡前躺上床後':               26,
  '關燈前':                     27,
};

// Resolves a Task.cue string to its position in the day:
//   built-in anchor (e.g. 起床後) → 1..27 by time
//   "any" anchor (e.g. 排隊／等候時) or custom cue (any other string) → 99
//   no cue (null/undefined/empty) → 100 (sort last)
export function cueOrderFor(cue) {
  if (!cue) return 100;
  return CUE_ORDER[cue] ?? 99;
}
```

### Step 4: Run test to verify pass

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/anchors.test.js
```

Expected: `Tests: 6 passed, 6 total`.

### Step 5: Run full jest

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3
```

Expected: 217 passing (211 existing + 6 new).

### Step 6: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/anchors.js web-app/src/__tests__/lib/anchors.test.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(lib): anchors.js — CUE_ORDER map (27 timed anchors) + cueOrderFor helper + 6 TDD tests"
```

---

## Task 2: API `PUT /api/tasks/[id]` 接受 `status: 'paused' | 'archived'`

**Files:**
- Modify: `web-app/src/app/api/tasks/[id]/route.js`
- Modify: `web-app/prisma/schema.prisma`（comment only）

### Step 1: 更新 schema comment

打開 `web-app/prisma/schema.prisma`，找到 Task model 內：

```prisma
status       String   @default("candidate")  // candidate | active | archived
```

改成：

```prisma
status       String   @default("candidate")  // candidate | active | paused | archived
```

僅改 comment、schema 本身不變。**不需要 `prisma db push`**（field 仍是 String，新值只是業務層合法化）。

### Step 2: 改 PUT 接受 status

打開 `web-app/src/app/api/tasks/[id]/route.js`。找到 `await prisma.task.update({ where: { id }, data: { ... } })` 區（約第 12-30 行）。在 `data` 物件內，最後一個欄位（`time: taskData.time`）之後加入：

```js
        let updatedTask = await prisma.task.update({
            where: { id },
            data: {
                title: taskData.title,
                details: taskData.details,
                cue: taskData.cue?.trim() || null,
                identity: taskData.identity?.trim() || null,
                type: taskData.type,
                category: taskData.category,
                frequency: taskData.frequency,
                recurrence: taskData.recurrence,
                reminder: taskData.reminder,
                subtasks: taskData.subtasks,
                dailyTarget: taskData.dailyTarget,
                unit: taskData.unit,
                stepValue: taskData.stepValue,
                date: taskData.date,
                time: taskData.time,
                // Slice M — accept status transitions to paused/archived from
                // TaskCard action menu + TaskDetailModal footer. Validates the
                // enum so a stray value can't poison the daily view filter.
                ...(taskData.status !== undefined && ['candidate', 'active', 'paused', 'archived'].includes(taskData.status)
                    ? { status: taskData.status }
                    : {}),
            }
        });
```

關鍵：用 conditional spread。如果 caller 沒傳 `status` 就不動；傳了但非合法值就忽略；合法值才寫入。

### Step 3: 驗證 — Prisma smoke

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('test', 10);
  const u = await p.user.upsert({
    where: { phone: '0900000044' },
    update: {},
    create: { nickname: 'sliceMsmoke', phone: '0900000044', countryCode: '+886', password: hash },
  });
  const t = await p.task.create({
    data: {
      userId: u.id, title: 'pause smoke', type: 'binary', category: '飲食', frequency: 'daily',
      recurrence: { type: 'daily', interval: 1, endType: 'never' }, reminder: {}, subtasks: [],
      status: 'active',
    },
  });
  await p.task.update({ where: { id: t.id }, data: { status: 'paused' } });
  const after = await p.task.findUnique({ where: { id: t.id }, select: { status: true } });
  console.log('after pause:', after);
  await p.task.delete({ where: { id: t.id } });
  await p.user.delete({ where: { id: u.id } });
  console.log('cleaned');
  await p.\$disconnect();
})();
"
```

Expected: `after pause: { status: 'paused' }` then `cleaned`.

### Step 4: 跑全 jest

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3
```

Expected: 217 passing（仍然）。

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma web-app/src/app/api/tasks/\[id\]/route.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): PUT /api/tasks/[id] accepts status transitions (paused/archived) for Slice M"
```

---

## Task 3: MainApp dailyTasks 排序 + 隱藏 paused/archived

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`

### Step 1: 加 import

打開 `web-app/src/components/MainApp.jsx`，找到既有的 lib import 區（約第 14 行 `import { generateId, getTodayStr, isTaskDueToday } from '@/lib/utils';`）。在其下方加：

```jsx
import { cueOrderFor } from '@/lib/anchors';
import { isCompletedOnDate } from '@/lib/utils';
```

注意：`isCompletedOnDate` 已存在於 utils.js（TaskCard 已 import 它），確認 utils.js 有 export 後加入；如果 import 行已有 `isCompletedOnDate`，跳過此 import。

### Step 2: Refactor dailyTasks 排序

搜尋 `const dailyTasks = tasks.filter(t => isTaskDueToday(t, selectedDate));`（約第 577 行）。將整段替換成：

```jsx
// Slice M — daily view sort:
//   1. status='active' only (paused/archived 已被 GET /api/tasks?status=active 過濾，
//      但加保險避免 stale state)
//   2. 未完成在上、已完成在下
//   3. 組內按 cue 在 anchors.js 中的時間序升冪
//   4. tie-break: createdAt asc
const dailyTasks = tasks
    .filter(t => isTaskDueToday(t, selectedDate))
    .filter(t => !t.status || t.status === 'active')  // safety: hide paused/archived
    .sort((a, b) => {
        const ac = isCompletedOnDate(a, selectedDate) ? 1 : 0;
        const bc = isCompletedOnDate(b, selectedDate) ? 1 : 0;
        if (ac !== bc) return ac - bc;
        const ao = cueOrderFor(a.cue);
        const bo = cueOrderFor(b.cue);
        if (ao !== bo) return ao - bo;
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
```

### Step 3: 跑 jest + build

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: 217 passing + `✓ Compiled successfully`.

### Step 4: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): MainApp — dailyTasks sort by cue time + filter paused/archived (Slice M)"
```

---

## Task 4: TaskCard 完成樣式重做（drop line-through + opacity + left accent）

**Files:**
- Modify: `web-app/src/components/TaskCard.jsx`

### Step 1: 改 borderCls / outer className / title 樣式

打開 `web-app/src/components/TaskCard.jsx`。找到 `const borderCls = ...`（約第 94 行）：

```jsx
const borderCls = isCompleted
    ? 'border-emerald-200 bg-emerald-50/30'
    : isFuture
        ? 'border-indigo-200 bg-indigo-50/20 border-dashed'
        : 'border-gray-100';
```

改成（拿掉 emerald 底色）：

```jsx
// Slice M — completed cards use a calm "done" treatment: 55% opacity, gray
// border (not emerald), and a 3px emerald accent rail on the left rendered
// as a pseudo-element. Title keeps its normal color (no strikethrough).
const borderCls = isCompleted
    ? 'border-gray-200 opacity-55'
    : isFuture
        ? 'border-indigo-200 bg-indigo-50/20 border-dashed'
        : 'border-gray-100';
```

### Step 2: 加左側 accent bar

找到外層 `<div onClick={onClick} className={...}>`（約第 101 行）。在其內的最頂部（在 `{(isQuant || isPeriod) && (...)}` progress bar 之前）加入：

```jsx
return (
    <div
        onClick={onClick}
        className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${borderCls} ${isPast && !isCompleted ? 'opacity-75' : ''}`}
    >
        {/* Slice M — left emerald accent rail when completed (non-strikethrough
            indicator that the task is done; complements the checkmark) */}
        {isCompleted && (
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-400" aria-hidden />
        )}

        {/* Background Progress for Quant or Period Tasks */}
        {(isQuant || isPeriod) && (
            ...
```

### Step 3: 拿掉 title 的 line-through

找到 `<h3 className={...}>{task.title}</h3>`（約第 132 行）：

```jsx
<h3 className={`font-bold text-sm ${isCompleted && !isQuant && !isPeriod ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
    {task.title}
</h3>
```

改成（無 line-through）：

```jsx
<h3 className="font-bold text-sm text-gray-800">
    {task.title}
</h3>
```

### Step 4: 跑 jest

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3
```

Expected: 217 passing.

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskCard.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "refactor(ui): TaskCard completed style — drop line-through, opacity-55 + left emerald accent"
```

---

## Task 5: TaskActionMenu — 共用 action menu 元件

**Files:**
- Create: `web-app/src/components/taskCard/TaskActionMenu.jsx`

### Step 1: 建立檔案

```jsx
'use client';

import React from 'react';
import { Pause, EyeOff, Trash2 } from 'lucide-react';

// TaskActionMenu — shared component rendered in 3 contexts:
//   1. Mobile swipe-reveal (right side of card, shows [pause, delete] only)
//   2. Desktop hover popover (drop-down from ⋮, shows all 3)
//   3. TaskDetailModal footer (row of 3 buttons)
//
// Variants are controlled by the `variant` prop, but the underlying actions
// are identical: PATCH /api/tasks/:id with the new status (paused / archived)
// or DELETE for hard delete. Confirm dialogs use the strings in spec §9.
//
// Props:
//   taskId, taskTitle (for confirm copy)
//   variant: 'swipe' | 'popover' | 'detail-footer'
//   onAction(action, success): notified after the API call resolves;
//     action ∈ 'paused' | 'archived' | 'deleted'; success: boolean
const CONFIRM_TEXT = {
    paused:   '暫停這個習慣？暫停期間不會出現在今日行程。',
    archived: '隱藏這個習慣？之後不會再看到。',
    deleted:  '確定要永久刪除這個習慣嗎？所有歷史紀錄也會一起消失。',
};

const TaskActionMenu = ({ taskId, taskTitle, variant = 'popover', onAction }) => {
    const handle = async (action) => {
        if (!window.confirm(CONFIRM_TEXT[action])) return;
        try {
            let res;
            if (action === 'deleted') {
                res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            } else {
                // 'paused' or 'archived' — PUT a partial update with just status
                res = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: action }),
                });
            }
            onAction?.(action, res.ok);
            if (!res.ok) {
                window.alert(`操作失敗（${action}），請稍後再試`);
            }
        } catch (e) {
            console.error('TaskActionMenu action error', e);
            onAction?.(action, false);
            window.alert('發生錯誤');
        }
    };

    // Swipe variant: 2 buttons inline (pause + delete), no hide
    if (variant === 'swipe') {
        return (
            <div className="flex items-stretch h-full">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handle('paused'); }}
                    className="flex flex-col items-center justify-center px-4 bg-amber-500 text-white text-xs font-bold gap-1"
                    aria-label={`暫停 ${taskTitle}`}
                >
                    <Pause size={16} />
                    暫停
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handle('deleted'); }}
                    className="flex flex-col items-center justify-center px-4 bg-red-500 text-white text-xs font-bold gap-1 rounded-r-2xl"
                    aria-label={`刪除 ${taskTitle}`}
                >
                    <Trash2 size={16} />
                    刪除
                </button>
            </div>
        );
    }

    // Detail-footer variant: 3 horizontal buttons spanning the modal width
    if (variant === 'detail-footer') {
        return (
            <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50">
                <button
                    type="button"
                    onClick={() => handle('paused')}
                    className="flex-1 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                >
                    <Pause size={14} /> 暫停
                </button>
                <button
                    type="button"
                    onClick={() => handle('archived')}
                    className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                    <EyeOff size={14} /> 隱藏
                </button>
                <button
                    type="button"
                    onClick={() => handle('deleted')}
                    className="flex-1 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                >
                    <Trash2 size={14} /> 刪除
                </button>
            </div>
        );
    }

    // Popover variant (desktop hover): vertical list, divider before delete
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handle('paused'); }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 transition-colors"
            >
                <Pause size={14} /> 暫停
            </button>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handle('archived'); }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
                <EyeOff size={14} /> 隱藏
            </button>
            <div className="h-px bg-gray-100" />
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handle('deleted'); }}
                className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
                <Trash2 size={14} /> 刪除
            </button>
        </div>
    );
};

export default TaskActionMenu;
```

### Step 2: Build check + commit（先 commit 即可，下個 task 整合）

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: `✓ Compiled successfully`.

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/taskCard/TaskActionMenu.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskActionMenu — shared 暫停/隱藏/刪除 with 3 variants (swipe/popover/detail-footer)"
```

---

## Task 6: SwipeReveal — 手機左滑 reveal wrapper

**Files:**
- Create: `web-app/src/components/taskCard/SwipeReveal.jsx`

### Step 1: 建立檔案

```jsx
'use client';

import React, { useRef, useState } from 'react';

// SwipeReveal — wraps a child card and adds mobile-only swipe gestures.
// Left swipe (≥ 80px) reveals `rightActions` slot pinned to the right of the
// card; tapping outside or the card itself closes it. Right swipe (≥ 80px)
// fires `onSwipeRight` immediately (used for mark-complete shortcut).
//
// On desktop (no touch events), the component is a passthrough — `children`
// renders as-is and `rightActions` is hidden. Desktop uses TaskHoverDots
// instead for the same action menu.
//
// Props:
//   children: the card body
//   rightActions: ReactNode rendered when revealed (TaskActionMenu variant=swipe)
//   onSwipeRight(): optional, called after a ≥80px rightward swipe
//   threshold (default 80)
const SwipeReveal = ({ children, rightActions, onSwipeRight, threshold = 80 }) => {
    const [revealed, setRevealed] = useState(false);
    const startX = useRef(null);
    const startY = useRef(null);
    const currentDx = useRef(0);
    const [translateX, setTranslateX] = useState(0);

    const handleTouchStart = (e) => {
        const t = e.touches[0];
        startX.current = t.clientX;
        startY.current = t.clientY;
        currentDx.current = 0;
    };

    const handleTouchMove = (e) => {
        if (startX.current === null) return;
        const t = e.touches[0];
        const dx = t.clientX - startX.current;
        const dy = t.clientY - startY.current;
        // If vertical scroll dominates, bail (let the page scroll)
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
            startX.current = null;
            setTranslateX(0);
            return;
        }
        currentDx.current = dx;
        // Allow left swipe to reveal (negative tx), cap at action width
        // Right swipe shows visual hint (positive tx, capped at 60)
        if (dx < 0) {
            setTranslateX(Math.max(dx, -140));
        } else {
            setTranslateX(Math.min(dx, 60));
        }
    };

    const handleTouchEnd = () => {
        const dx = currentDx.current;
        startX.current = null;
        startY.current = null;
        currentDx.current = 0;
        if (dx <= -threshold) {
            setRevealed(true);
            setTranslateX(-140);
        } else if (dx >= threshold) {
            // Spring back, fire mark-complete
            setRevealed(false);
            setTranslateX(0);
            onSwipeRight?.();
        } else {
            // Snap back
            setRevealed(false);
            setTranslateX(0);
        }
    };

    const handleTapToClose = () => {
        if (revealed) {
            setRevealed(false);
            setTranslateX(0);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Right actions slot — sits behind the card, revealed by left swipe */}
            <div className="absolute inset-y-0 right-0 flex items-stretch" aria-hidden={!revealed}>
                {rightActions}
            </div>
            {/* Card content — translates horizontally on swipe */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleTapToClose}
                style={{ transform: `translateX(${translateX}px)`, transition: startX.current === null ? 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none' }}
                className="relative bg-transparent"
            >
                {children}
            </div>
        </div>
    );
};

export default SwipeReveal;
```

### Step 2: Build check + commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: `✓ Compiled successfully`.

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/taskCard/SwipeReveal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): SwipeReveal — mobile left-swipe reveal + right-swipe shortcut (80px threshold, 250ms spring)"
```

---

## Task 7: TaskHoverDots — 桌面 hover ⋮ + popover

**Files:**
- Create: `web-app/src/components/taskCard/TaskHoverDots.jsx`

### Step 1: 建立檔案

```jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';

// TaskHoverDots — desktop-only (hidden via `md:block` on parent).
// Shows a ⋮ button in the card's top-right corner while the parent card
// is hovered. Clicking opens a popover with the shared action menu.
//
// Popover closes on: click outside, Esc key, or after a successful action.
//
// Props:
//   children: the popover body (TaskActionMenu variant='popover')
//   hoverDelayMs: how long the mouse must rest on the card before ⋮ fades in (default 100)
const TaskHoverDots = ({ children, hoverDelayMs = 100 }) => {
    const [hovered, setHovered] = useState(false);
    const [open, setOpen] = useState(false);
    const timerRef = useRef(null);
    const wrapperRef = useRef(null);

    // Hover delay
    const onEnter = () => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setHovered(true), hoverDelayMs);
    };
    const onLeave = () => {
        clearTimeout(timerRef.current);
        if (!open) setHovered(false);
    };

    // Click-outside + Esc to close popover
    useEffect(() => {
        if (!open) return;
        const onDocClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setHovered(false);
            }
        };
        const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setHovered(false); } };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <div
            ref={wrapperRef}
            className="hidden md:block absolute top-2 right-2 z-20"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
        >
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className={`w-6 h-6 rounded-full bg-gray-50/95 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-opacity ${
                    hovered || open ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                aria-label="任務選項"
            >
                <MoreVertical size={14} />
            </button>
            {open && (
                <div className="absolute top-7 right-0">
                    {children}
                </div>
            )}
        </div>
    );
};

export default TaskHoverDots;
```

### Step 2: Build check + commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: `✓ Compiled successfully`.

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/taskCard/TaskHoverDots.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskHoverDots — desktop hover ⋮ + popover (100ms delay, click-outside + Esc to close)"
```

---

## Task 8: TaskCard 整合 SwipeReveal + TaskHoverDots

**Files:**
- Modify: `web-app/src/components/TaskCard.jsx`

### Step 1: Imports

打開 `web-app/src/components/TaskCard.jsx`。在最上方 imports 區加：

```jsx
import SwipeReveal from './taskCard/SwipeReveal';
import TaskHoverDots from './taskCard/TaskHoverDots';
import TaskActionMenu from './taskCard/TaskActionMenu';
```

### Step 2: 加 `onAfterAction` prop + 改 default exports

找到 `const TaskCard = ({ task, onClick, onUpdate = () => { }, viewingDate }) => {`。改成：

```jsx
const TaskCard = ({ task, onClick, onUpdate = () => { }, viewingDate, onAfterAction }) => {
```

`onAfterAction(action, success)` 由 MainApp 傳進來，用來在 swipe/hover/footer 完成後 refetch tasks。

### Step 3: 用 SwipeReveal 包外層 + 內部加 TaskHoverDots

找到 `return ( <div onClick={onClick} ... >` 區塊（約 100-110 行）。整個 `<div>...</div>` 用 SwipeReveal 包起來：

```jsx
return (
    <SwipeReveal
        rightActions={
            <TaskActionMenu
                taskId={task.id}
                taskTitle={task.title}
                variant="swipe"
                onAction={(action, success) => { if (success) onAfterAction?.(action); }}
            />
        }
        onSwipeRight={() => {
            if (!isLocked) handleUpdate('toggle');
        }}
    >
        <div
            onClick={onClick}
            className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${borderCls} ${isPast && !isCompleted ? 'opacity-75' : ''}`}
        >
            {/* Slice M — left emerald accent rail when completed */}
            {isCompleted && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-400" aria-hidden />
            )}

            {/* Slice M — desktop hover dots top-right */}
            <TaskHoverDots>
                <TaskActionMenu
                    taskId={task.id}
                    taskTitle={task.title}
                    variant="popover"
                    onAction={(action, success) => { if (success) onAfterAction?.(action); }}
                />
            </TaskHoverDots>

            {/* ... existing card content unchanged ... */}
        </div>
    </SwipeReveal>
);
```

關鍵 — 不要動 card 內的既有結構（progress bar / title / checkbox / etc）。只是用 SwipeReveal 包起來、加 TaskHoverDots 在 isCompleted accent 之後、其他原樣。

### Step 4: MainApp 傳 onAfterAction

打開 `web-app/src/components/MainApp.jsx`，找到 daily view render `<TaskCard ...>`（搜尋 `<TaskCard key={task.id}`）。在 props 加：

```jsx
<TaskCard
    key={task.id}
    task={task}
    viewingDate={selectedDate}
    onClick={() => { setViewingTask(task); setIsDetailModalOpen(true); }}
    onUpdate={handleUpdateProgress}
    onAfterAction={() => { if (user?.id) fetchTasks(user.id); }}  // ★ Slice M
/>
```

注意：可能有 2 處（dailyTasks + flexibleTasks）— 都加。

### Step 5: 跑 jest + build

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: 217 passing + `✓ Compiled successfully`.

### Step 6: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskCard.jsx web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskCard integrates SwipeReveal + TaskHoverDots + onAfterAction refresh"
```

---

## Task 9: TaskDetailModal — Footer 加 3 個 action

**Files:**
- Modify: `web-app/src/components/TaskDetailModal.jsx`

### Step 1: Import + props

打開 `web-app/src/components/TaskDetailModal.jsx`。最上方 imports 加：

```jsx
import TaskActionMenu from './taskCard/TaskActionMenu';
```

找到 `const TaskDetailModal = ({ isOpen, onClose, task, onEdit, onUpdate, initialDate }) => {`。加一個 prop：

```jsx
const TaskDetailModal = ({ isOpen, onClose, task, onEdit, onUpdate, initialDate, onAfterAction }) => {
```

### Step 2: 加 footer

找到 modal 內容區的 `</div>` 結尾（modal panel 的 closing tag）。在最後一個有意義的 content `</div>` 之後、panel `</div>` 之前加入：

```jsx
{/* Slice M — footer with lifecycle actions (pause / hide / delete) */}
{task?.id && (
    <TaskActionMenu
        taskId={task.id}
        taskTitle={task.title}
        variant="detail-footer"
        onAction={(action, success) => {
            if (success) {
                onClose?.();
                onAfterAction?.(action);
            }
        }}
    />
)}
```

具體位置：找到 modal 最大 `<div className="bg-white ... flex flex-col ...">`，在其內所有 scroll-area / content `</div>` 之後、最外 `</div>` 之前插入此 footer。

### Step 3: MainApp 傳 onAfterAction

打開 `web-app/src/components/MainApp.jsx`，搜尋 `<TaskDetailModal ...>`。加 prop：

```jsx
<TaskDetailModal
    isOpen={isDetailModalOpen}
    onClose={() => { setIsDetailModalOpen(false); setViewingTask(null); }}
    task={viewingTask}
    initialDate={selectedDate}
    onEdit={(task) => { setIsDetailModalOpen(false); setEditingTask(task); setIsFormModalOpen(true); }}
    onUpdate={handleUpdateProgress}
    onAfterAction={() => { if (user?.id) fetchTasks(user.id); }}  // ★ Slice M
/>
```

### Step 4: 跑 jest + build

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: 217 passing + `✓ Compiled successfully`.

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskDetailModal.jsx web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskDetailModal footer — 暫停/隱藏/刪除 via TaskActionMenu"
```

---

## Task 10: Browser smoke + merge + push

### Step 1: 建測試 user

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('SliceMtest', 10);
  const u = await p.user.upsert({
    where: { phone: '0900000033' },
    update: { password: hash, isActive: true },
    create: { nickname: 'SliceMtest', phone: '0900000033', countryCode: '+886', password: hash, isActive: true }
  });
  // Create 5 active tasks with different cues to demonstrate sort
  const seeds = [
    { title: '睡前躺上床後做', cue: '睡前躺上床後' },
    { title: '吃完早餐後做',   cue: '吃完早餐後' },
    { title: '起床後做',        cue: '起床後' },
    { title: '午餐前做',        cue: '午餐前' },
    { title: '感到壓力時做',    cue: '感到壓力時' },
  ];
  for (const s of seeds) {
    await p.task.create({ data: {
      userId: u.id, title: s.title, cue: s.cue, type: 'binary', category: '飲食', frequency: 'daily',
      recurrence: { type: 'daily', interval: 1, endType: 'never' }, reminder: {}, subtasks: [], status: 'active',
    }});
  }
  console.log('user:', u.id, '— 5 tasks created');
  await p.\$disconnect();
})();
"
```

### Step 2: 手動驗證（preview server，手機 + 桌面）

啟動 dev server，登入 `0900000033 / SliceMtest`，確認：

- [ ] 5 個任務排序為：**起床後 → 吃完早餐後 → 午餐前 → 睡前躺上床後 → 感到壓力時**（最後一個 cueOrder=99）
- [ ] 完成一個（按 checkbox）→ 該任務沉到下方、淡化 55%、左側 emerald 條、title 沒 line-through
- [ ] **手機 (375px)**：右滑「起床後做」→ 完成；左滑→ 露出 [暫停 / 刪除] 按鈕
- [ ] **桌面 (≥768px)**：hover「起床後做」→ 右上 ⋮ 浮現；click → popover [暫停 / 隱藏 / 刪除]
- [ ] 點 ⋮ → 暫停 → confirm → 任務從 daily view 消失
- [ ] 點任務本體 → TaskDetailModal → footer 顯示 [暫停 / 隱藏 / 刪除]
- [ ] Detail 點刪除 → confirm → 任務真的從 DB 消失

### Step 3: 驗證 DB

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { phone: '0900000033' } });
  if (!u) { console.log('no test user'); return; }
  const byStatus = await p.task.groupBy({ by: ['status'], where: { userId: u.id }, _count: true });
  console.log('Status counts:', byStatus);
  await p.\$disconnect();
})();
"
```

Expected: 顯示 active / paused / archived 的分佈（依手動操作）。

### Step 4: 清理 + merge + push

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { phone: '0900000033' } });
  if (u) {
    await p.task.deleteMany({ where: { userId: u.id } });
    await p.user.delete({ where: { id: u.id } });
    console.log('cleaned');
  }
  await p.\$disconnect();
})();
"
```

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git checkout main && git merge --ff-only feat/slice-M-task-card-polish && git push origin main
```

Vercel auto-deploys.

---

## Self-Review Notes

**Spec coverage:**
- Spec §2.1 排序 → Tasks 1 + 3（lib + MainApp sort）
- Spec §2.2 完成樣式 → Task 4
- Spec §2.3 手機手勢 → Tasks 6 + 8（SwipeReveal + integration）
- Spec §2.4 桌面互動 → Tasks 7 + 8（TaskHoverDots + integration）
- Spec §2.5 Detail footer → Task 9
- Spec §2.6 status enum 加 'paused' → Task 2
- Spec §4 Schema → Task 2（comment only，無 schema change）
- Spec §5.2 元件 — TaskActionMenu / SwipeReveal / TaskHoverDots → Tasks 5/6/7
- Spec §6 API → Task 2
- Spec §7 排序實作 → Tasks 1 + 3
- Spec §9 Open Q resolved at top
- Spec §10 Acceptance → covered by Task 10 manual verification

**Placeholder scan:** No TBD / TODO / vague language. Each step has concrete code or commands.

**Type consistency:**
- `cueOrderFor`, `CUE_ORDER` — consistent across Task 1, Task 3
- `TaskActionMenu` variants 'swipe' | 'popover' | 'detail-footer' — consistent across Tasks 5, 8, 9
- `onAfterAction(action, success)` signature — consistent in TaskCard, TaskDetailModal, ActionMenu
- Status enum values 'candidate' | 'active' | 'paused' | 'archived' — consistent in spec + Tasks 2/3

**Bite-sized check:** Each task averages 5-7 steps, each step ≤5 min. Largest is Task 5 (TaskActionMenu — ~120 lines code) but it's atomic by file.
