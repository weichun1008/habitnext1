# Slice F — Recurring Checklist Subtasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make checklist subtasks reset daily by moving completion state to `TaskHistory.subtaskCompletions`, and add versioned `addedAt/removedAt` timestamps to subtasks so users can edit them with Google-Calendar-style "from today" or "permanent" semantics. Sync 6 meal-pattern habits to use the new structure.

**Architecture:** Subtask object structure upgrades to `{id, label, addedAt, removedAt?}` (no `completed`). Per-date completion lives in new `TaskHistory.subtaskCompletions Json?`. Pure helper library handles visibility filtering and value computation. UI components read history per-date instead of master `subtask.completed`. Deletion offers two modes: soft (set `removedAt`) or hard (cascade clear history).

**Tech Stack:** Prisma 5 + Vercel Postgres, Next.js 14 App Router, React 18, Jest + RTL.

**Spec:** [`docs/superpowers/specs/2026-05-18-slice-f-recurring-checklist-design.md`](../specs/2026-05-18-slice-f-recurring-checklist-design.md)

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/src/lib/subtasks.js` | Pure helpers: `visibleSubtasks(task, dateStr)`, `computeChecklistValue(completions)`, type doc |
| `web-app/src/__tests__/lib/subtasks.test.js` | Unit tests for the helpers (TDD) |
| `web-app/scripts/migrate-subtasks-format.js` | One-shot script: upgrade subtask objects to new shape |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | `TaskHistory.subtaskCompletions Json?` added |
| `web-app/src/components/MainApp.jsx` | `toggle_subtask` action writes to history, not subtasks |
| `web-app/src/app/api/tasks/[id]/route.js` | PUT accepts `subtaskCompletions` in embedded history |
| `web-app/src/app/api/tasks/[id]/subtasks/[subtaskId]/route.js` | NEW endpoint: DELETE with `?mode=hide|permanent` |
| `web-app/src/components/TaskCard.jsx` | Read `X/Y` from history's value + visibleSubtasks count |
| `web-app/src/components/DashboardSummaryCard.jsx` | Same |
| `web-app/src/components/TaskDetailModal.jsx` | Render visibleSubtasks, read checked state from history, readonly handling |
| `web-app/src/components/TaskFormModal.jsx` | Subtask editor: rename / add / delete-with-confirm-sheet |
| `web-app/prisma/seed/genesis-io-habits.json` | 6 meal habits upgraded to checklist + 早午晚 subtasks |
| `web-app/prisma/seed/genesis-io-habits-changes.md` | NEW doc listing the 6 changes for reviewer |

---

## Task 1: Schema — `TaskHistory.subtaskCompletions Json?`

**Files:**
- Modify: `web-app/prisma/schema.prisma`

- [ ] **Step 1: Add field to TaskHistory**

In `web-app/prisma/schema.prisma`, locate `model TaskHistory { ... }` and add a `subtaskCompletions` line after `value`:

```prisma
model TaskHistory {
  id                String   @id @default(cuid())
  taskId            String
  task              Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  date              String   // YYYY-MM-DD
  completed         Boolean  @default(false)
  value             Int      @default(0) // For quantitative or period count; also count of true subtaskCompletions
  subtaskCompletions Json?   // { [subtaskId]: boolean } — per-date checklist state

  @@unique([taskId, date])
}
```

- [ ] **Step 2: Push schema to DB**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && npx prisma db push
```

Expected output ending with `Your database is now in sync with your Prisma schema.` (Adding a nullable JSON column — no data-loss prompt.)

- [ ] **Step 3: Verify schema applied**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.\$queryRaw\`SELECT column_name FROM information_schema.columns WHERE table_name = 'TaskHistory' ORDER BY ordinal_position\`.then(r=>{console.log(r.map(x=>x.column_name).join('\n')); return p.\$disconnect();})"
```

Expected output includes `subtaskCompletions`.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): TaskHistory.subtaskCompletions for per-date checklist state"
```

---

## Task 2: Pure helper — `visibleSubtasks(task, dateStr)` + tests (TDD)

**Files:**
- Create: `web-app/src/lib/subtasks.js`
- Create: `web-app/src/__tests__/lib/subtasks.test.js`

- [ ] **Step 1: Write failing tests**

Create `web-app/src/__tests__/lib/subtasks.test.js`:

```js
const { visibleSubtasks } = require('../../lib/subtasks');

describe('visibleSubtasks', () => {
  const subA = { id: 'a', label: '早餐', addedAt: '2026-05-10' };
  const subB = { id: 'b', label: '午餐', addedAt: '2026-05-10' };
  const subC = { id: 'c', label: '晚餐', addedAt: '2026-05-15', removedAt: '2026-05-20' };
  const subD = { id: 'd', label: '宵夜', addedAt: '2026-05-12', removedAt: '2026-05-14' };
  const task = { subtasks: [subA, subB, subC, subD] };

  it('returns empty array when subtasks missing', () => {
    expect(visibleSubtasks({}, '2026-05-10')).toEqual([]);
    expect(visibleSubtasks({ subtasks: null }, '2026-05-10')).toEqual([]);
    expect(visibleSubtasks({ subtasks: [] }, '2026-05-10')).toEqual([]);
  });

  it('excludes subtasks added after the date', () => {
    expect(visibleSubtasks(task, '2026-05-09')).toEqual([]);
    expect(visibleSubtasks(task, '2026-05-10')).toEqual([subA, subB]);
    expect(visibleSubtasks(task, '2026-05-13')).toEqual([subA, subB, subD]);
  });

  it('excludes subtasks removed on or before the date', () => {
    // subD removedAt = 2026-05-14: visible on 13, not on 14, not on 15
    expect(visibleSubtasks(task, '2026-05-13').some(s => s.id === 'd')).toBe(true);
    expect(visibleSubtasks(task, '2026-05-14').some(s => s.id === 'd')).toBe(false);
    expect(visibleSubtasks(task, '2026-05-15').some(s => s.id === 'd')).toBe(false);
  });

  it('preserves subtask object order from task.subtasks array', () => {
    const result = visibleSubtasks(task, '2026-05-16');
    expect(result.map(s => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('treats missing addedAt as always-added (legacy data safety)', () => {
    const legacy = { subtasks: [{ id: 'legacy', label: '舊資料' }] };
    expect(visibleSubtasks(legacy, '2026-05-10').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/subtasks.test.js
```

Expected: `Cannot find module '../../lib/subtasks'`. Confirm failure.

- [ ] **Step 3: Implement helper**

Create `web-app/src/lib/subtasks.js`:

```js
// src/lib/subtasks.js
// Pure helpers for the daily-recurring checklist subtask model.
//
// Subtask shape: { id, label, addedAt, removedAt? }
//   - addedAt    string YYYY-MM-DD — first date the subtask appears
//   - removedAt  optional string YYYY-MM-DD — first date it stops appearing
//
// A date D shows a subtask iff addedAt <= D && (!removedAt || D < removedAt).
// Missing addedAt is treated as always-added for legacy-data safety.

function visibleSubtasks(task, dateStr) {
  const arr = Array.isArray(task?.subtasks) ? task.subtasks : [];
  return arr.filter(s => {
    const addedOk = !s.addedAt || s.addedAt <= dateStr;
    const removedOk = !s.removedAt || dateStr < s.removedAt;
    return addedOk && removedOk;
  });
}

function computeChecklistValue(completions) {
  if (!completions || typeof completions !== 'object') return 0;
  let n = 0;
  for (const v of Object.values(completions)) {
    if (v === true) n++;
  }
  return n;
}

module.exports = { visibleSubtasks, computeChecklistValue };
```

- [ ] **Step 4: Run test — verify PASS**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/subtasks.test.js
```

Expected: 5 tests pass.

- [ ] **Step 5: Add `computeChecklistValue` tests**

Append to `web-app/src/__tests__/lib/subtasks.test.js`:

```js
const { computeChecklistValue } = require('../../lib/subtasks');

describe('computeChecklistValue', () => {
  it('returns 0 for null/undefined/non-object', () => {
    expect(computeChecklistValue(null)).toBe(0);
    expect(computeChecklistValue(undefined)).toBe(0);
    expect(computeChecklistValue('foo')).toBe(0);
    expect(computeChecklistValue(0)).toBe(0);
  });

  it('returns 0 for empty object', () => {
    expect(computeChecklistValue({})).toBe(0);
  });

  it('counts strictly-true values', () => {
    expect(computeChecklistValue({ a: true })).toBe(1);
    expect(computeChecklistValue({ a: true, b: true, c: true })).toBe(3);
  });

  it('ignores false / falsy / truthy-but-not-true values', () => {
    expect(computeChecklistValue({ a: true, b: false })).toBe(1);
    expect(computeChecklistValue({ a: true, b: null, c: 'true', d: 1 })).toBe(1);
  });
});
```

- [ ] **Step 6: Run tests — verify all pass**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/subtasks.test.js
```

Expected: 9 tests pass (5 + 4).

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/subtasks.js web-app/src/__tests__/lib/subtasks.test.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(lib): visibleSubtasks + computeChecklistValue with unit tests"
```

---

## Task 3: Migration script — upgrade existing subtask objects

**Files:**
- Create: `web-app/scripts/migrate-subtasks-format.js`

- [ ] **Step 1: Implement script**

```js
// scripts/migrate-subtasks-format.js
// Upgrades existing Task.subtasks objects to the new shape:
//   { id, label, addedAt, removedAt? }
// Removes legacy `completed` field; renames `title` → `label` if needed.
// Adds `addedAt` defaulting to task.createdAt (ISO date).
// Idempotent: skips tasks whose subtasks already have `addedAt`.

require('./lib/env');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const tasks = await prisma.task.findMany({
    select: { id: true, subtasks: true, createdAt: true },
  });

  let migrated = 0;
  let skipped = 0;
  for (const t of tasks) {
    const arr = Array.isArray(t.subtasks) ? t.subtasks : [];
    if (arr.length === 0) { skipped++; continue; }
    if (arr.every(s => s.addedAt)) { skipped++; continue; }

    const taskCreatedDate = t.createdAt.toISOString().slice(0, 10);
    const newSubtasks = arr.map(s => {
      const { completed: _c, title, label, ...rest } = s;
      return {
        ...rest,
        label: label || title || '未命名子任務',
        addedAt: rest.addedAt || taskCreatedDate,
      };
    });
    await prisma.task.update({ where: { id: t.id }, data: { subtasks: newSubtasks } });
    migrated++;
  }
  console.log(`Migrated ${migrated} tasks, skipped ${skipped} (empty or already-upgraded)`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run against DB**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/migrate-subtasks-format.js
```

Expected (based on current data — all subtasks empty): `Migrated 0 tasks, skipped N`. Report the actual numbers.

- [ ] **Step 3: Run twice to confirm idempotency**

Run the same command again. Expected: same numbers as first run (or `Migrated 0` if any were upgraded).

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/scripts/migrate-subtasks-format.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(scripts): migrate-subtasks-format — upgrade subtask shape (idempotent)"
```

---

## Task 4: `toggle_subtask` action — client side

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`

- [ ] **Step 1: Read existing handleUpdateProgress**

Open `web-app/src/components/MainApp.jsx` and find the function `handleUpdateProgress(task, action, value, subtaskId, dateStr)`. The existing `if (action === 'toggle_subtask' && subtaskId)` branch mutates `t.subtasks[].completed` — that's the broken code.

Read also how the function persists changes. Look for the `fetch('/api/tasks/${task.id}')` call near the end of `handleUpdateProgress` to understand the server payload.

- [ ] **Step 2: Replace the toggle_subtask branch**

Locate the `toggle_subtask` branch (around line 158 in MainApp.jsx). Replace the entire branch with:

```js
            if (action === 'toggle_subtask' && subtaskId) {
                // Per-date subtask state lives in TaskHistory.subtaskCompletions
                const { visibleSubtasks, computeChecklistValue } = require('@/lib/subtasks');
                const prevHistoryForDate = t.history?.[dateStr] || {};
                const prevCompletions = prevHistoryForDate.subtaskCompletions || {};
                const newCompletions = { ...prevCompletions, [subtaskId]: !prevCompletions[subtaskId] };
                const newValue = computeChecklistValue(newCompletions);
                const visibleCount = visibleSubtasks(t, dateStr).length;
                const target = t.dailyTarget || visibleCount;
                const newCompleted = newValue >= target;

                const newHistory = {
                  ...t.history,
                  [dateStr]: {
                    ...prevHistoryForDate,
                    subtaskCompletions: newCompletions,
                    value: newValue,
                    completed: newCompleted,
                  },
                };
                updatedTask = { ...t, history: newHistory };
                historyUpdate = {
                  taskId: t.id,
                  date: dateStr,
                  subtaskCompletions: newCompletions,
                  value: newValue,
                  completed: newCompleted,
                };
                return updatedTask;
            }
```

Note: the import is a CommonJS-style require — if MainApp.jsx uses ES imports throughout, move to top of file as `import { visibleSubtasks, computeChecklistValue } from '@/lib/subtasks';` and remove the inline require.

- [ ] **Step 3: Confirm imports**

At the top of `MainApp.jsx`, add this if not already present (next to other lib imports):

```js
import { visibleSubtasks, computeChecklistValue } from '@/lib/subtasks';
```

Remove the inline `require` from Step 2 once the top-of-file import is in place.

- [ ] **Step 4: Run existing tests to verify no regression**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -10
```

Expected: all suites still pass.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(client): toggle_subtask writes per-date completions to history"
```

---

## Task 5: Server-side history persistence for subtaskCompletions

**Files:**
- Modify: `web-app/src/app/api/tasks/[id]/route.js`

- [ ] **Step 1: Read existing PUT handler**

Open `web-app/src/app/api/tasks/[id]/route.js` and find the `PUT` handler. Identify where it handles the `history` payload (if at all). The client sends an update via `PUT /api/tasks/:id` with task fields and optionally history entries.

- [ ] **Step 2: Extend history upsert logic**

In the PUT handler, wherever TaskHistory entries are upserted from the incoming payload, ensure `subtaskCompletions` is included. Sample code (insert near where existing history upserts happen):

```js
// When upserting a TaskHistory entry from payload.history[dateStr]:
const entry = payload.history?.[dateStr];
if (entry) {
  await prisma.taskHistory.upsert({
    where: { taskId_date: { taskId, date: dateStr } },
    create: {
      taskId,
      date: dateStr,
      value: entry.value ?? 0,
      completed: !!entry.completed,
      subtaskCompletions: entry.subtaskCompletions ?? null,
    },
    update: {
      value: entry.value ?? 0,
      completed: !!entry.completed,
      subtaskCompletions: entry.subtaskCompletions ?? null,
    },
  });
}
```

The exact integration depends on how the existing handler structures things. Read carefully and only inject the `subtaskCompletions` field into existing upserts — don't rewrite the surrounding logic.

- [ ] **Step 3: Manual sanity check via curl**

If the dev server is running, simulate a toggle:

```bash
# Replace TASKID with an actual checklist task id
curl -X PUT http://localhost:3000/api/tasks/TASKID \
  -H 'Content-Type: application/json' \
  -d '{"history":{"2026-05-18":{"subtaskCompletions":{"breakfast":true},"value":1,"completed":false}}}' \
  -s | head -c 500
```

Or skip if no dev server; relies on browser smoke in Task 11.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/app/api/tasks/[id]/route.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): persist subtaskCompletions in TaskHistory upsert"
```

---

## Task 6: Cascade delete API — `DELETE /api/tasks/:id/subtasks/:subtaskId`

**Files:**
- Create: `web-app/src/app/api/tasks/[id]/subtasks/[subtaskId]/route.js`

- [ ] **Step 1: Implement the endpoint**

```js
// src/app/api/tasks/[id]/subtasks/[subtaskId]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeChecklistValue } from '@/lib/subtasks';

// DELETE /api/tasks/:id/subtasks/:subtaskId?mode=hide|permanent
//   mode=hide      → soft-delete: set removedAt = today on the subtask
//   mode=permanent → hard-delete: remove from subtasks AND clear from all TaskHistory.subtaskCompletions
export async function DELETE(request, { params }) {
  try {
    const { id: taskId, subtaskId } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'hide';
    if (!['hide', 'permanent'].includes(mode)) {
      return NextResponse.json({ error: 'mode must be hide or permanent' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { history: true } });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    if (!subtasks.some(s => s.id === subtaskId)) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    if (mode === 'hide') {
      const newSubtasks = subtasks.map(s =>
        s.id === subtaskId ? { ...s, removedAt: todayStr } : s
      );
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: { subtasks: newSubtasks },
      });
      return NextResponse.json({ task: updated, mode: 'hide' });
    }

    // mode === 'permanent'
    const newSubtasks = subtasks.filter(s => s.id !== subtaskId);

    // Cascade clear from all TaskHistory entries
    const histories = await prisma.taskHistory.findMany({ where: { taskId } });
    for (const h of histories) {
      if (!h.subtaskCompletions || typeof h.subtaskCompletions !== 'object') continue;
      if (!(subtaskId in h.subtaskCompletions)) continue;
      const { [subtaskId]: _drop, ...rest } = h.subtaskCompletions;
      const newValue = computeChecklistValue(rest);
      const target = task.dailyTarget || newSubtasks.length;
      const newCompleted = newValue >= target;
      await prisma.taskHistory.update({
        where: { id: h.id },
        data: { subtaskCompletions: rest, value: newValue, completed: newCompleted },
      });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { subtasks: newSubtasks },
    });
    return NextResponse.json({ task: updated, mode: 'permanent' });
  } catch (error) {
    console.error('Delete subtask error:', error);
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify route exists**

```bash
ls "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app\src\app\api\tasks\[id]\subtasks\[subtaskId]\route.js"
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add "web-app/src/app/api/tasks/[id]/subtasks" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): DELETE /api/tasks/:id/subtasks/:subtaskId with hide/permanent modes"
```

---

## Task 7: TaskCard + DashboardSummaryCard — read X/Y from history

**Files:**
- Modify: `web-app/src/components/TaskCard.jsx`
- Modify: `web-app/src/components/DashboardSummaryCard.jsx`

- [ ] **Step 1: Read current TaskCard logic**

Open `web-app/src/components/TaskCard.jsx`. Find the section:

```js
const isChecklist = task.type === 'checklist';
...
if (isChecklist && task.subtasks?.length > 0) {
    const completedCount = task.subtasks.filter(s => s.completed).length;
    subtaskDisplay = `${completedCount}/${task.subtasks.length}`;
}
```

This is the broken bit — `s.completed` is master state, not per-date.

- [ ] **Step 2: Replace with history-driven calculation**

Top of file, add import:

```js
import { visibleSubtasks } from '@/lib/subtasks';
```

Replace the subtaskDisplay block with:

```js
if (isChecklist) {
    const dateStr = selectedDate || new Date().toISOString().slice(0, 10);
    const visible = visibleSubtasks(task, dateStr);
    const historyForDate = task.history?.[dateStr];
    const completions = historyForDate?.subtaskCompletions || {};
    const completedCount = visible.filter(s => completions[s.id] === true).length;
    if (visible.length > 0) {
      subtaskDisplay = `${completedCount}/${visible.length}`;
    }
}
```

Note: `selectedDate` is whatever date prop TaskCard uses for rendering (check existing prop usage). If TaskCard receives a date prop, use it; otherwise default to today.

- [ ] **Step 3: Apply same pattern to DashboardSummaryCard**

Read `DashboardSummaryCard.jsx`. If it has equivalent subtask counting logic, apply the same transformation. If not, skip.

- [ ] **Step 4: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all existing tests pass. The TaskCard tests may need fixture updates if they used the old `subtask.completed` field — check and fix if needed.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskCard.jsx web-app/src/components/DashboardSummaryCard.jsx web-app/src/__tests__/components/TaskCard.test.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskCard X/Y reads visible subtasks + history for the rendered date"
```

---

## Task 8: TaskDetailModal — visible subtasks + per-date checked state + readonly handling

**Files:**
- Modify: `web-app/src/components/TaskDetailModal.jsx`

- [ ] **Step 1: Read existing subtask render block**

In `web-app/src/components/TaskDetailModal.jsx`, find the section starting `{task.subtasks && task.subtasks.length > 0 && (` (around line 103).

- [ ] **Step 2: Replace with history-driven render**

Top of file, add:
```js
import { visibleSubtasks } from '@/lib/subtasks';
```

Replace the subtask section with:

```jsx
{(() => {
    const subs = visibleSubtasks(task, currentDate);
    if (subs.length === 0) return null;
    const completions = task.history?.[currentDate]?.subtaskCompletions || {};
    const todayStr = new Date().toISOString().slice(0, 10);
    const isPastDate = currentDate < todayStr;
    const completedCount = subs.filter(s => completions[s.id] === true).length;
    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><List size={18} className="text-blue-500" /> 子任務</h3>
                <span className="text-xs font-bold text-gray-400">{completedCount}/{subs.length}</span>
            </div>
            <div className="space-y-2">
                {subs.map(sub => {
                    const isChecked = completions[sub.id] === true;
                    const isReadonly = isPastDate;
                    return (
                        <div
                            key={sub.id}
                            onClick={isReadonly ? undefined : () => onUpdate(task, 'toggle_subtask', null, sub.id, currentDate)}
                            className={`flex items-center gap-3 p-3 rounded-xl border border-gray-100 transition-colors ${isReadonly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white hover:bg-gray-50 cursor-pointer'}`}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className={`text-sm ${isChecked ? 'text-gray-400 line-through' : (isReadonly ? 'text-gray-400' : 'text-gray-700')}`}>{sub.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
})()}
```

- [ ] **Step 3: Remove stale subtask-count usage**

Also at the top of `TaskDetailModal.jsx`, locate:
```js
const totalSubtasks = task.subtasks?.length || 0;
const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
```

If `totalSubtasks` / `completedSubtasks` are used elsewhere in the file (e.g. progress bar), recompute them using the new helper for the current date:

```js
const _subsToday = visibleSubtasks(task, currentDate);
const _completionsToday = task.history?.[currentDate]?.subtaskCompletions || {};
const totalSubtasks = _subsToday.length;
const completedSubtasks = _subsToday.filter(s => _completionsToday[s.id] === true).length;
```

- [ ] **Step 4: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskDetailModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskDetailModal renders visibleSubtasks + per-date check state + past readonly"
```

---

## Task 9: TaskFormModal — subtask editor with delete confirm sheet

**Files:**
- Modify: `web-app/src/components/TaskFormModal.jsx`

- [ ] **Step 1: Read existing subtask editor**

Open `web-app/src/components/TaskFormModal.jsx`. Find the subtask editing UI (search for `subtasks: [...formData.subtasks, ...`). Identify:
- The state shape (`formData.subtasks`)
- The "add subtask" button
- The "remove subtask" handler (if any)

- [ ] **Step 2: Refactor subtask editor**

Replace the subtask editor section with:

```jsx
{/* Subtask editor — supports rename, add, soft/hard delete */}
<div className="mb-4">
    <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">子任務 ({formData.subtasks.length})</label>
    </div>
    <div className="space-y-2">
        {formData.subtasks.map((sub, idx) => (
            <SubtaskEditorRow
                key={sub.id}
                subtask={sub}
                hasHistory={Boolean(initialTask?.history && Object.values(initialTask.history).some(h => h?.subtaskCompletions && sub.id in h.subtaskCompletions))}
                onRename={(newLabel) =>
                    setFormData(f => ({
                        ...f,
                        subtasks: f.subtasks.map((s, i) => i === idx ? { ...s, label: newLabel } : s),
                    }))
                }
                onHide={() =>
                    setFormData(f => ({
                        ...f,
                        subtasks: f.subtasks.map((s, i) =>
                            i === idx ? { ...s, removedAt: new Date().toISOString().slice(0, 10) } : s
                        ),
                    }))
                }
                onPermanentDelete={async () => {
                    if (initialTask?.id) {
                        // Existing task — use API for cascade delete
                        const res = await fetch(`/api/tasks/${initialTask.id}/subtasks/${sub.id}?mode=permanent`, { method: 'DELETE' });
                        if (!res.ok) {
                            alert('刪除失敗');
                            return;
                        }
                    }
                    setFormData(f => ({
                        ...f,
                        subtasks: f.subtasks.filter((_, i) => i !== idx),
                    }));
                }}
            />
        ))}
        <button
            type="button"
            onClick={() =>
                setFormData(f => ({
                    ...f,
                    subtasks: [
                        ...f.subtasks,
                        {
                            id: generateId(),
                            label: '',
                            addedAt: new Date().toISOString().slice(0, 10),
                        },
                    ],
                }))
            }
            className="w-full px-3 py-2 rounded-xl text-sm font-medium text-center bg-gray-50 border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100"
        >
            + 加入子任務
        </button>
    </div>
</div>
```

- [ ] **Step 3: Add the SubtaskEditorRow component**

At the bottom of `TaskFormModal.jsx` (or top, before default export), add:

```jsx
function SubtaskEditorRow({ subtask, hasHistory, onRename, onHide, onPermanentDelete }) {
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [mode, setMode] = React.useState('hide');  // 'hide' or 'permanent'

    const handleConfirm = () => {
        if (mode === 'hide') {
            onHide();
        } else {
            onPermanentDelete();
        }
        setConfirmOpen(false);
    };

    const isHidden = Boolean(subtask.removedAt);

    return (
        <div className={`p-3 rounded-xl border ${isHidden ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={subtask.label}
                    onChange={(e) => onRename(e.target.value)}
                    disabled={isHidden}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="子任務名稱"
                />
                {!isHidden && (
                    <button
                        type="button"
                        onClick={() => setConfirmOpen(prev => !prev)}
                        className="px-2 py-1.5 text-gray-400 hover:text-red-500"
                        aria-label="刪除子任務"
                    >
                        ×
                    </button>
                )}
                {isHidden && (
                    <span className="text-xs text-gray-400">已停用 ({subtask.removedAt})</span>
                )}
            </div>

            {confirmOpen && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <p className="text-sm font-bold text-gray-800">刪除「{subtask.label}」？</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input type="radio" checked={mode === 'hide'} onChange={() => setMode('hide')} className="mt-0.5" />
                        <div>
                            <p className="text-sm text-gray-700">從今天起不再出現</p>
                            <p className="text-xs text-gray-500">過去的完成紀錄保留</p>
                        </div>
                    </label>
                    <label className={`flex items-start gap-2 ${hasHistory ? 'cursor-pointer' : 'opacity-50'}`}>
                        <input
                            type="radio"
                            checked={mode === 'permanent'}
                            onChange={() => hasHistory && setMode('permanent')}
                            disabled={!hasHistory}
                            className="mt-0.5"
                        />
                        <div>
                            <p className="text-sm text-gray-700">永久刪除，包含所有過去紀錄</p>
                            <p className="text-xs text-gray-500">{hasHistory ? '清乾淨，過去的勾選紀錄一起消失' : '無歷史紀錄，不需要這選項'}</p>
                        </div>
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setConfirmOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">
                            取消
                        </button>
                        <button type="button" onClick={handleConfirm} className="px-3 py-1.5 text-sm bg-red-500 text-white font-medium rounded hover:bg-red-600">
                            確認刪除
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
```

If `React.useState` isn't already imported, ensure the top of file has `import React, { useState } from 'react';` then use `useState` (without `React.` prefix).

- [ ] **Step 4: Update form save path**

Ensure that when the form is saved (existing `handleSubmit` / save function), the `formData.subtasks` payload format matches the new shape `{id, label, addedAt, removedAt?}`. If the existing save path drops unknown fields, ensure `addedAt` / `removedAt` are preserved when constructing the task update payload.

- [ ] **Step 5: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskFormModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskFormModal subtask editor with hide/permanent delete confirm"
```

---

## Task 10: Seed update — 6 meal habits to checklist

**Files:**
- Modify: `web-app/prisma/seed/genesis-io-habits.json`

- [ ] **Step 1: Update 4 existing meal habits**

Open `web-app/prisma/seed/genesis-io-habits.json`. For each of the following 4 habits, change `difficulties.beginner/intermediate/challenge`:
- `type`: `"checklist"`
- `unit`: `"餐"`
- `dailyTarget`: beginner=1, intermediate=2, challenge=3
- `stepValue`: 1
- `recurrence`: weekly cadence (beginner [1,3,5], intermediate [1,2,3,4,5], challenge daily)
- `subtasks`: meal-specific list (see below)

Habits to update:
1. **每餐攝取一個拳頭的蔬菜** — subtasks: `[{id:'breakfast',label:'早餐',addedAt:'2026-05-18'}, {id:'lunch',label:'午餐',addedAt:'2026-05-18'}, {id:'dinner',label:'晚餐',addedAt:'2026-05-18'}]`
2. **餐前喝一杯溫水** — subtasks: `[{id:'pre_breakfast',label:'早餐前',addedAt:'2026-05-18'}, {id:'pre_lunch',label:'午餐前',addedAt:'2026-05-18'}, {id:'pre_dinner',label:'晚餐前',addedAt:'2026-05-18'}]`
3. **吃飯細嚼慢嚥 (每口20下)** — subtasks: same as #1 (`breakfast/lunch/dinner`)
4. **維持血糖穩定 (先吃菜肉再吃飯)** — subtasks: same as #1

- [ ] **Step 2: Add 2 new meal habits to seed**

Append (or insert into the 飲食 category section, in source-list order) these 2 new records to the JSON array:

```json
{
  "name": "每餐都要有一份蛋白質",
  "description": "蛋白質穩定血糖、增加飽足感、維持肌肉。蛋、豆腐、雞肉、豆漿任一都算。💡 斷食或某餐不吃？選擇較低難度，或在加入後編輯餐次。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner": {
      "enabled": true, "label": "入門", "type": "checklist",
      "dailyTarget": 1, "unit": "餐", "stepValue": 1,
      "subtasks": [
        { "id": "breakfast", "label": "早餐", "addedAt": "2026-05-18" },
        { "id": "lunch", "label": "午餐", "addedAt": "2026-05-18" },
        { "id": "dinner", "label": "晚餐", "addedAt": "2026-05-18" }
      ],
      "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 }
    },
    "intermediate": {
      "enabled": true, "label": "進階", "type": "checklist",
      "dailyTarget": 2, "unit": "餐", "stepValue": 1,
      "subtasks": [
        { "id": "breakfast", "label": "早餐", "addedAt": "2026-05-18" },
        { "id": "lunch", "label": "午餐", "addedAt": "2026-05-18" },
        { "id": "dinner", "label": "晚餐", "addedAt": "2026-05-18" }
      ],
      "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 }
    },
    "challenge": {
      "enabled": true, "label": "挑戰", "type": "checklist",
      "dailyTarget": 3, "unit": "餐", "stepValue": 1,
      "subtasks": [
        { "id": "breakfast", "label": "早餐", "addedAt": "2026-05-18" },
        { "id": "lunch", "label": "午餐", "addedAt": "2026-05-18" },
        { "id": "dinner", "label": "晚餐", "addedAt": "2026-05-18" }
      ],
      "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 }
    }
  }
}
```

And:

```json
{
  "name": "每餐前先喝一杯水",
  "description": "餐前 200-300cc 水降低飢餓感、減慢進食速度，且確保水分攝取。💡 斷食日選低難度即可，水分仍然要喝。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner": {
      "enabled": true, "label": "入門", "type": "checklist",
      "dailyTarget": 1, "unit": "餐", "stepValue": 1,
      "subtasks": [
        { "id": "pre_breakfast", "label": "早餐前", "addedAt": "2026-05-18" },
        { "id": "pre_lunch", "label": "午餐前", "addedAt": "2026-05-18" },
        { "id": "pre_dinner", "label": "晚餐前", "addedAt": "2026-05-18" }
      ],
      "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 }
    },
    "intermediate": {
      "enabled": true, "label": "進階", "type": "checklist",
      "dailyTarget": 2, "unit": "餐", "stepValue": 1,
      "subtasks": [
        { "id": "pre_breakfast", "label": "早餐前", "addedAt": "2026-05-18" },
        { "id": "pre_lunch", "label": "午餐前", "addedAt": "2026-05-18" },
        { "id": "pre_dinner", "label": "晚餐前", "addedAt": "2026-05-18" }
      ],
      "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 }
    },
    "challenge": {
      "enabled": true, "label": "挑戰", "type": "checklist",
      "dailyTarget": 3, "unit": "餐", "stepValue": 1,
      "subtasks": [
        { "id": "pre_breakfast", "label": "早餐前", "addedAt": "2026-05-18" },
        { "id": "pre_lunch", "label": "午餐前", "addedAt": "2026-05-18" },
        { "id": "pre_dinner", "label": "晚餐前", "addedAt": "2026-05-18" }
      ],
      "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 }
    }
  }
}
```

Total records after this task: **92** (90 + 2 new).

- [ ] **Step 3: Re-validate**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
const h = JSON.parse(require('fs').readFileSync('prisma/seed/genesis-io-habits.json','utf-8'));
console.log('records:', h.length);
const checklists = h.filter(x => x.difficulties.beginner.type === 'checklist');
console.log('checklist habits:', checklists.length);
checklists.forEach(c => {
  const s = c.difficulties.beginner.subtasks || [];
  const allHaveAddedAt = s.every(x => x.addedAt);
  console.log('  ', c.name, 'subtasks:', s.length, allHaveAddedAt ? '(addedAt ✓)' : '(missing addedAt ✗)');
});
"
```

Expected: `records: 92`, 6 checklist habits listed, each with 3 subtasks all having `addedAt`.

- [ ] **Step 4: Run seed script**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-genesis-io-habits.js
```

Expected: `created=2, updated=90` (2 new habits added; 90 existing updated, 4 of which now have changed structure).

- [ ] **Step 5: Re-run for idempotency**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-genesis-io-habits.js
```

Expected: `created=0, updated=92`. After: 95 habits in DB (3 pre-existing + 92 seed).

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/seed/genesis-io-habits.json && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(seed): 6 meal habits use checklist + 早午晚 subtasks (4 updated + 2 new)"
```

---

## Task 11: API + browser smoke

Manual verification only.

- [ ] **Step 1: Start dev server (if not running)**

Use the preview tool `Habitnext Dev` config or `npm run dev` in background.

- [ ] **Step 2: Hit /api/habits — verify seed shape**

```bash
curl -s http://localhost:3000/api/habits | node -e "
let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
  const j = JSON.parse(d);
  console.log('habits:', j.habits.length);
  const protein = j.habits.find(h => h.name === '每餐都要有一份蛋白質');
  if (!protein) { console.log('MISSING'); process.exit(1); }
  console.log('protein type:', protein.difficulties.beginner.type);
  console.log('protein subtasks:', protein.difficulties.beginner.subtasks.map(s => s.label).join('/'));
});"
```

Expected: `habits: 95`, type `checklist`, subtasks `早餐/午餐/晚餐`.

- [ ] **Step 3: Browser walkthrough**

Login (use existing user), open 探索習慣 → 飲食 → click 「每餐都要有一份蛋白質」 → expand → pick 進階 → + 加入此習慣 → pick anchor (skip or 午餐前) → confirm.

Verify in Daily view:
- TaskCard shows `0/3` initially
- Click TaskCard → TaskDetailModal opens → 3 subtasks (早餐/午餐/晚餐) all unchecked
- Tick 早餐 → close modal → TaskCard shows `1/3`
- Tomorrow (or change date manually), open again → all subtasks unchecked, fresh 0/3 ✅ DAILY RESET WORKS

Verify subtask editing:
- Open task in edit mode (TaskFormModal)
- Click × on 早餐 → confirm sheet appears with two options
- Pick 「從今天起不再出現」 → confirm → save
- Reopen task → only 午餐/晚餐 shown today; navigate to past date if available, 早餐 still shows as 「已停用」灰底

- [ ] **Step 4: Past readonly check**

If possible, navigate calendar to a past date with completion data:
- Subtasks displayed but greyed out
- Click attempts do nothing (no toggle)

- [ ] **Step 5: No commit needed**

Verification task only.

---

## Task 12: Merge + push

- [ ] **Step 1: Check branch state**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git status --short && git log --oneline main..HEAD
```

Should show clean working tree and 11+ commits on `feat/slice-f-recurring-checklist`.

- [ ] **Step 2: Run all tests one more time**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -10
```

Expected: all suites pass.

- [ ] **Step 3: Switch to main + fast-forward merge**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git checkout main && git merge --ff-only feat/slice-f-recurring-checklist
```

Expected: `Fast-forward` listing all new commits.

- [ ] **Step 4: Push**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git push origin main
```

Vercel auto-deploys.

- [ ] **Step 5: Live smoke**

After Vercel build completes (1-2 min), open https://habitnext1.vercel.app, log in, repeat Task 11 Step 3 on production. No commit.

---

## Self-Review Notes

**Spec coverage check:**
- Spec §3 (Schema) → Task 1 ✓
- Spec §3 (Subtask object structure) → Task 2 + Task 3 (migration) ✓
- Spec §4 (Render logic) → Task 7 (TaskCard) + Task 8 (TaskDetailModal) ✓
- Spec §5 (UI - TaskCard) → Task 7 ✓
- Spec §5 (UI - TaskDetailModal subtasks) → Task 8 ✓
- Spec §5 (UI - TaskFormModal editor + delete confirm) → Task 9 ✓
- Spec §6 (toggle_subtask logic — client + server) → Task 4 + Task 5 ✓
- Spec §6 (cascade clear API) → Task 6 ✓
- Spec §7 (Migration plan) → Task 3 ✓
- Spec §7 (Seed JSON update) → Task 10 ✓
- Spec §8 (6 meal habits upgrade) → Task 10 ✓
- Spec §9 (2 existing checklist habits — leave subtasks empty) → Implicit (Task 10 doesn't touch them; they remain `[]`)
- Spec §11 (Acceptance criteria 1-10) → Tasks 1, 7-9, 11

**Placeholder scan:** None. All code blocks have actual content; all commands have expected outputs.

**Type consistency:** `subtask.label` used consistently (not `title`). `addedAt`/`removedAt` consistent across all references. `subtaskCompletions` field name consistent.

**Outstanding concerns:**
- Task 4 Step 1 instructs reading existing code first — implementer subagent may need to inspect MainApp.jsx fetch payload structure to fully integrate; covered by Step 2's note.
- Task 5 Step 2 is similarly investigation-heavy — depends on existing PUT handler shape. Implementer reads first, applies surgical change.

These investigation-required tasks should be dispatched with sonnet (not haiku) given their judgment requirements.
