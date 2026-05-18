# Slice B — Anchor × Behavior 配對 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "anchor selection" view to the explore-habit flow so each new Task can be paired with a cue (existing habit, curated life moment, or custom text), with the cue displayed on TaskCard / TaskDetailModal.

**Architecture:** Single nullable `Task.cue` schema field. New reusable `AnchorPicker` component sources anchors from the user's active tasks + a 15-item curated `LIFE_MOMENTS` constants file. `TaskLibraryModal` extended from 2-view to 3-view state machine; `TaskFormModal` embeds the same `AnchorPicker` for manual creates and edits. AI integration is explicitly out of scope (Slice C).

**Tech Stack:** Next.js 14 App Router, Prisma 5 + Vercel Postgres, React 18, Tailwind, Jest + React Testing Library.

**Spec:** [`docs/superpowers/specs/2026-05-18-slice-b-anchor-pairing-design.md`](../specs/2026-05-18-slice-b-anchor-pairing-design.md)

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/src/lib/anchors.js` | `LIFE_MOMENTS` 15-item const |
| `web-app/src/components/explore/AnchorPicker.jsx` | Controlled anchor selection UI |
| `web-app/src/__tests__/components/AnchorPicker.test.jsx` | RTL tests for selection / custom / skip |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | `Task.cue String?` |
| `web-app/src/app/api/tasks/route.js` | POST accepts `cue` |
| `web-app/src/app/api/tasks/[id]/route.js` | PUT accepts `cue` |
| `web-app/src/components/TaskCard.jsx` | Render anchor chip when `task.cue` |
| `web-app/src/components/TaskDetailModal.jsx` | Render anchor chip when `task.cue` |
| `web-app/src/components/TaskFormModal.jsx` | `cue` in form state + AnchorPicker embed; pass `cue` to onSave |
| `web-app/src/components/TaskLibraryModal.jsx` | Add `view='anchor'` state; render AnchorPicker as View 3 |
| `web-app/src/components/MainApp.jsx` | Pass `yourTasks={tasks}` prop to TaskLibraryModal and TaskFormModal |

---

## Task 1: Schema — `Task.cue String?`

**Files:**
- Modify: `web-app/prisma/schema.prisma`

- [ ] **Step 1: Update schema**

In `web-app/prisma/schema.prisma`, locate `model Task { ... }`. Add a `cue` line. The block currently looks roughly like:

```prisma
model Task {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String
  details      String?
  type         String
  category     String
  frequency    String
  recurrence   Json
  reminder     Json
  subtasks     Json
  dailyTarget  Int?
  unit         String?
  stepValue    Int?
  date         String?
  time         String?
  assignmentId String?
  isLocked     Boolean  @default(false)
  expertName   String?
  metadata     Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  history      TaskHistory[]
}
```

Insert a new line right after `details String?` so the field sits next to the description:

```prisma
  details      String?
  cue          String?  // 錨點，例「起床後」(BJ Fogg ABC anchor)
  type         String
```

- [ ] **Step 2: Push schema**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && npx prisma db push
```

Expected output ending with `Your database is now in sync with your Prisma schema.` `cue` is nullable, no `--accept-data-loss` needed.

- [ ] **Step 3: Regenerate client**

`npx prisma db push` runs `prisma generate` automatically. If you want to be sure: `npx prisma generate`.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): add Task.cue for anchor (BJ Fogg ABC)"
```

---

## Task 2: LIFE_MOMENTS constants

**Files:**
- Create: `web-app/src/lib/anchors.js`

- [ ] **Step 1: Create file**

```js
// src/lib/anchors.js
// Curated list of common daily transition moments, used as anchor candidates
// in AnchorPicker. The `id` is React key only; `label` is the string written
// to Task.cue.

export const LIFE_MOMENTS = [
  { id: 'wake_up',        label: '起床後',                   timeOfDay: 'morning' },
  { id: 'after_brushing', label: '刷完牙後',                 timeOfDay: 'morning' },
  { id: 'first_water',    label: '喝完第一杯水後',           timeOfDay: 'morning' },
  { id: 'leaving_home',   label: '出門前',                   timeOfDay: 'morning' },
  { id: 'arrive_work',    label: '到辦公室／工作場所後',     timeOfDay: 'morning' },
  { id: 'after_lunch',    label: '午餐後',                   timeOfDay: 'noon' },
  { id: 'arrive_home',    label: '回家進門後',               timeOfDay: 'evening' },
  { id: 'after_dinner',   label: '晚餐後',                   timeOfDay: 'evening' },
  { id: 'after_shower',   label: '洗完澡後',                 timeOfDay: 'evening' },
  { id: 'bedtime',        label: '睡前躺上床後',             timeOfDay: 'evening' },
  { id: 'coffee_tea',     label: '等待煮咖啡／泡茶時',       timeOfDay: 'any' },
  { id: 'before_work',    label: '開電腦／開始工作前',       timeOfDay: 'work' },
  { id: 'first_unlock',   label: '看到手機螢幕第一次解鎖時', timeOfDay: 'work' },
  { id: 'commute',        label: '通勤路上',                 timeOfDay: 'commute' },
  { id: 'waiting',        label: '排隊／等候時',             timeOfDay: 'any' },
];

export const CUSTOM_ANCHOR_MAX_LENGTH = 30;
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/anchors.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): LIFE_MOMENTS curated anchor list (15 items)"
```

---

## Task 3: AnchorPicker component + RTL tests

**Files:**
- Create: `web-app/src/components/explore/AnchorPicker.jsx`
- Create: `web-app/src/__tests__/components/AnchorPicker.test.jsx`

Follow TDD: write failing test → minimal impl → green → refactor.

### Step 1: Write failing test

```jsx
// src/__tests__/components/AnchorPicker.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AnchorPicker from '../../components/explore/AnchorPicker';

const yourTasks = [
  { id: 't1', title: '喝水', isLocked: false },
  { id: 't2', title: '跑步', isLocked: false },
];

describe('AnchorPicker', () => {
  it('renders "你的習慣" section when yourTasks has active items', () => {
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={yourTasks} />);
    expect(screen.getByText('你的習慣')).toBeInTheDocument();
    expect(screen.getByText('喝水')).toBeInTheDocument();
    expect(screen.getByText('跑步')).toBeInTheDocument();
  });

  it('hides "你的習慣" section when yourTasks is empty', () => {
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={[]} />);
    expect(screen.queryByText('你的習慣')).not.toBeInTheDocument();
  });

  it('always renders "生活時刻" section with the 15 curated moments', () => {
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={[]} />);
    expect(screen.getByText('生活時刻')).toBeInTheDocument();
    expect(screen.getByText('起床後')).toBeInTheDocument();
    expect(screen.getByText('睡前躺上床後')).toBeInTheDocument();
  });

  it('calls onChange with the label when a curated moment is clicked', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value={null} onChange={onChange} yourTasks={[]} />);
    fireEvent.click(screen.getByText('起床後'));
    expect(onChange).toHaveBeenCalledWith('起床後');
  });

  it('calls onChange with task title when a your-habit card is clicked', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value={null} onChange={onChange} yourTasks={yourTasks} />);
    fireEvent.click(screen.getByText('喝水'));
    expect(onChange).toHaveBeenCalledWith('喝水');
  });

  it('highlights the selected anchor when value matches', () => {
    render(<AnchorPicker value="起床後" onChange={() => {}} yourTasks={[]} />);
    const selected = screen.getByText('起床後').closest('button');
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });

  it('reveals text input when 自訂... is clicked', () => {
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={[]} />);
    fireEvent.click(screen.getByText(/自訂/));
    expect(screen.getByPlaceholderText(/輸入自訂錨點/)).toBeInTheDocument();
  });

  it('calls onChange when custom text is submitted via Enter', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value={null} onChange={onChange} yourTasks={[]} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂錨點/);
    fireEvent.change(input, { target: { value: '會議結束後  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('會議結束後');
  });

  it('excludes the task referenced by excludeTaskId from your-habits list', () => {
    render(
      <AnchorPicker
        value={null}
        onChange={() => {}}
        yourTasks={yourTasks}
        excludeTaskId="t1"
      />
    );
    expect(screen.queryByText('喝水')).not.toBeInTheDocument();
    expect(screen.getByText('跑步')).toBeInTheDocument();
  });

  it('truncates custom input to CUSTOM_ANCHOR_MAX_LENGTH (30) chars before submit', () => {
    const onChange = jest.fn();
    const long = 'a'.repeat(50);
    render(<AnchorPicker value={null} onChange={onChange} yourTasks={[]} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂錨點/);
    fireEvent.change(input, { target: { value: long } });
    expect(input.value.length).toBeLessThanOrEqual(30);
  });
});
```

### Step 2: Run test, verify FAIL

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/components/AnchorPicker.test.jsx
```

Expected: fail with `Cannot find module '../../components/explore/AnchorPicker'`.

### Step 3: Implement `AnchorPicker.jsx`

```jsx
// src/components/explore/AnchorPicker.jsx
"use client";

import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { LIFE_MOMENTS, CUSTOM_ANCHOR_MAX_LENGTH } from '@/lib/anchors';

function AnchorButton({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected ? 'true' : 'false'}
      className={`px-3 py-2 rounded-xl text-sm font-medium text-center transition-all ${
        selected
          ? 'bg-emerald-500 text-white border border-emerald-500 shadow-sm'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {label}
    </button>
  );
}

export default function AnchorPicker({ value, onChange, yourTasks = [], excludeTaskId = null }) {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const activeYourTasks = (yourTasks || []).filter(
    t => t && !t.isLocked && t.id !== excludeTaskId
  );

  const submitCustom = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setCustomMode(false);
    setCustomText('');
  };

  const handleCustomKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustom();
    }
    if (e.key === 'Escape') {
      setCustomMode(false);
      setCustomText('');
    }
  };

  return (
    <div className="space-y-5">
      {activeYourTasks.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            你的習慣 ({activeYourTasks.length} 個)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeYourTasks.map(t => (
              <AnchorButton
                key={t.id}
                label={t.title}
                selected={value === t.title}
                onClick={() => onChange(t.title)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          生活時刻
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LIFE_MOMENTS.map(m => (
            <AnchorButton
              key={m.id}
              label={m.label}
              selected={value === m.label}
              onClick={() => onChange(m.label)}
            />
          ))}
          {!customMode && (
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-center bg-gray-50 border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-1"
            >
              <Edit3 size={14} /> 自訂...
            </button>
          )}
        </div>
        {customMode && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              autoFocus
              maxLength={CUSTOM_ANCHOR_MAX_LENGTH}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={handleCustomKey}
              placeholder="輸入自訂錨點 (最多 30 字)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={submitCustom}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
            >
              加入
            </button>
            <button
              type="button"
              onClick={() => { setCustomMode(false); setCustomText(''); }}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 4: Run tests, verify PASS

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/components/AnchorPicker.test.jsx
```

Expected: PASS, 10 tests.

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/explore/AnchorPicker.jsx web-app/src/__tests__/components/AnchorPicker.test.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): AnchorPicker component with curated + user-task sources"
```

---

## Task 4: API — POST/PUT accept `cue`

**Files:**
- Modify: `web-app/src/app/api/tasks/route.js`
- Modify: `web-app/src/app/api/tasks/[id]/route.js`

### Step 1: Modify POST (`api/tasks/route.js`)

Locate the `prisma.task.create` call (around line 36-54). Add `cue` to the `data` object:

```js
        const task = await prisma.task.create({
            data: {
                userId,
                title: taskData.title,
                details: taskData.details,
                cue: taskData.cue?.trim() || null,
                type: taskData.type,
                category: taskData.category,
                frequency: taskData.frequency,
                recurrence: taskData.recurrence || {},
                reminder: taskData.reminder || {},
                subtasks: taskData.subtasks || [],
                dailyTarget: taskData.dailyTarget,
                unit: taskData.unit,
                stepValue: taskData.stepValue,
                date: taskData.date,
                time: taskData.time,
            },
            include: { history: true }
        });
```

### Step 2: Modify PUT (`api/tasks/[id]/route.js`)

Locate the `prisma.task.update` call (around line 12-29). Add `cue` to the `data` object (always overwriting allowed — caller controls value):

```js
        let updatedTask = await prisma.task.update({
            where: { id },
            data: {
                title: taskData.title,
                details: taskData.details,
                cue: taskData.cue?.trim() || null,
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
            }
        });
```

GET endpoints auto-return `cue` (Prisma selects all fields).

### Step 3: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/app/api/tasks/ && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): accept cue in POST/PUT /api/tasks"
```

---

## Task 5: TaskCard + TaskDetailModal — display anchor chip

**Files:**
- Modify: `web-app/src/components/TaskCard.jsx`
- Modify: `web-app/src/components/TaskDetailModal.jsx`

### Step 1: Add chip to TaskCard

In `web-app/src/components/TaskCard.jsx`, locate the title section (around line 64-71):

```jsx
                    <div>
                        <h3 className={`font-bold text-sm ${isCompleted && !isQuant && !isPeriod ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {task.title}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1">
                            {isPeriod ? (task.frequency === 'weekly' ? '本週目標' : '本月目標') : (task.details || '無詳細說明')}
                        </p>
                    </div>
```

Insert the cue chip between the `<h3>` and the description `<p>`:

```jsx
                    <div>
                        <h3 className={`font-bold text-sm ${isCompleted && !isQuant && !isPeriod ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {task.title}
                        </h3>
                        {task.cue && (
                            <span className="inline-block text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full mt-0.5 mb-0.5">
                                錨點：{task.cue}
                            </span>
                        )}
                        <p className="text-xs text-gray-400 line-clamp-1">
                            {isPeriod ? (task.frequency === 'weekly' ? '本週目標' : '本月目標') : (task.details || '無詳細說明')}
                        </p>
                    </div>
```

### Step 2: Add chip to TaskDetailModal

In `web-app/src/components/TaskDetailModal.jsx`, locate the Main Info block (around line 60-66):

```jsx
                    <div className="flex flex-col items-center mb-8">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${config.bg}`}>
                            <IconRenderer category={task.category} size={40} className={config.type === 'emoji' ? 'text-5xl' : ''} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 text-center mb-2">{task.title}</h2>
                        <p className="text-gray-500 text-center text-sm px-4">{task.details || '這個習慣沒有詳細說明，但持續做就對了！'}</p>
                    </div>
```

Insert the cue chip between `<h2>` and `<p>`:

```jsx
                    <div className="flex flex-col items-center mb-8">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${config.bg}`}>
                            <IconRenderer category={task.category} size={40} className={config.type === 'emoji' ? 'text-5xl' : ''} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 text-center mb-2">{task.title}</h2>
                        {task.cue && (
                            <span className="inline-block text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full mb-2">
                                錨點：{task.cue}
                            </span>
                        )}
                        <p className="text-gray-500 text-center text-sm px-4">{task.details || '這個習慣沒有詳細說明，但持續做就對了！'}</p>
                    </div>
```

### Step 3: Run existing tests to confirm no regression

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all suites pass (TaskCard already has snapshot tests in `src/__tests__/components/TaskCard.test.jsx` — confirm they still pass).

If TaskCard snapshot test fails because of added DOM node: that's expected when the test task has no cue (no chip rendered, so no diff) OR when the test task has cue (new chip in snapshot — accept by re-running with `--updateSnapshot` ONLY if the change is intended). For Slice B, test fixtures don't set `cue`, so no snapshot change.

### Step 4: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskCard.jsx web-app/src/components/TaskDetailModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): show anchor chip on TaskCard and TaskDetailModal"
```

---

## Task 6: TaskFormModal — embed AnchorPicker

**Files:**
- Modify: `web-app/src/components/TaskFormModal.jsx`

### Step 1: Add `cue` to form state defaults

In `web-app/src/components/TaskFormModal.jsx`, find the two `setFormData({...})` initializers (around lines 18-24 for the initial useState, lines 52-58 for the reset path). Add `cue: ''` to both:

Initial useState (around line 18):
```jsx
    const [formData, setFormData] = useState({
        title: '', details: '', cue: '', type: 'binary', category: 'star', frequency: 'daily',
        date: defaultDate || getTodayStr(), time: '09:00',
        dailyTarget: 10, unit: '次', stepValue: 1, subtasks: [],
        recurrence: { type: 'daily', interval: 1, endType: 'never', endDate: '', endCount: 10, weekDays: [], monthType: 'date', periodTarget: 3, dailyLimit: true },
        reminder: { enabled: false, offset: 0 }
    });
```

Reset path in useEffect (around line 52):
```jsx
            } else {
                setFormData({
                    title: '', details: '', cue: '', type: 'binary', category: 'star', frequency: 'daily',
                    date: defaultDate || getTodayStr(), time: '09:00',
                    dailyTarget: 10, unit: '次', stepValue: 1, subtasks: [],
                    recurrence: { type: 'daily', mode: 'specific_days', interval: 1, endType: 'never', endDate: '', endCount: 10, weekDays: [], monthType: 'date', periodTarget: 3, dailyLimit: true },
                    reminder: { enabled: false, offset: 0 }
                });
            }
```

And in the initialData path (around line 40), ensure `cue: initialData.cue || ''` is in the spread (since spread already includes it, but be explicit to handle null vs '' for the AnchorPicker):

```jsx
                setFormData({
                    ...initialData,
                    cue: initialData.cue || '',
                    time: initialData.time || '09:00',
                    ...
```

### Step 2: Accept `yourTasks` prop and pass through

Update the component signature at line 9:

```jsx
const TaskFormModal = ({ isOpen, onClose, onSave, onDelete, initialData, defaultDate, templateMode = false, yourTasks = [] }) => {
```

### Step 3: Import AnchorPicker

Add to the imports at the top of the file (alongside `import IconRenderer from './IconRenderer';`):

```jsx
import AnchorPicker from './explore/AnchorPicker';
```

### Step 4: Render AnchorPicker in the "basic" tab

The form has tabs (`activeTab` state, around line 27). The "basic" tab contains title/details/icon/type inputs. Find the section after the `details` (description) textarea — that's the natural place. The patch insertion point: search for where `details` is rendered (likely a textarea with `value={formData.details}`). Right after that textarea's closing element, insert:

```jsx
                            <div className="mt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    錨點 <span className="text-xs font-medium text-gray-400">(選填，做習慣前的提示)</span>
                                </label>
                                <AnchorPicker
                                    value={formData.cue || null}
                                    onChange={(cue) => setFormData(f => ({ ...f, cue: cue || '' }))}
                                    yourTasks={yourTasks}
                                    excludeTaskId={initialData?.id}
                                />
                                {formData.cue && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        目前錨點：<span className="font-medium text-gray-700">{formData.cue}</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(f => ({ ...f, cue: '' }))}
                                            className="ml-2 text-xs text-emerald-600 hover:underline"
                                        >
                                            清除
                                        </button>
                                    </p>
                                )}
                            </div>
```

Locate the details textarea by searching for `formData.details` in the file. If you cannot find the exact JSX shape, place this block inside the "basic" tab branch immediately before its closing fragment/div.

### Step 5: Verify cue is in the save payload

Find the `onSave` call (search for `onSave(`). It typically passes `formData` directly. As long as cue is in formData state, no further change needed.

### Step 6: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskFormModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): cue field in TaskFormModal via AnchorPicker"
```

---

## Task 7: TaskLibraryModal — add anchor view (View 3)

**Files:**
- Modify: `web-app/src/components/TaskLibraryModal.jsx`

### Step 1: Add view state + pending-habit state + yourTasks prop

Locate the component signature (around line 14):

```jsx
const TaskLibraryModal = ({ isOpen, onClose, onSelectTask, onOpenCustomForm }) => {
```

Add `yourTasks = []`:

```jsx
const TaskLibraryModal = ({ isOpen, onClose, onSelectTask, onOpenCustomForm, yourTasks = [] }) => {
```

In the state block (around line 14-21), the existing `view` state values are `'domain'`, `'list'`, `'search'`. Add a new value `'anchor'` (no code change yet — just plan to use this string). Also add two new pieces of state for the pending habit + chosen anchor:

```jsx
    const [habits, setHabits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('domain');           // 'domain' | 'list' | 'search' | 'anchor'
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState({});
    const [pendingHabit, setPendingHabit] = useState(null);    // { habit, diffKey } when entering anchor view
    const [pendingCue, setPendingCue] = useState(null);        // chosen anchor string (null = skip)
```

### Step 2: Update the open-reset effect

Locate the `useEffect` that runs on `isOpen` (around line 22-29). Add the new state resets:

```jsx
    useEffect(() => {
        if (isOpen) {
            fetchHabits();
            setView('domain');
            setSelectedDomain(null);
            setSearch('');
            setPendingHabit(null);
            setPendingCue(null);
        }
    }, [isOpen]);
```

### Step 3: Replace `handleSelectHabit` — re-route to anchor view

Find the existing `handleSelectHabit` (around line 75-95). Currently it constructs a task and calls `onSelectTask(task)`. Replace with a function that stages the habit + difficulty and switches to anchor view:

```jsx
    const handleSelectHabit = (habit, diffKey) => {
        const config = habit.difficulties?.[diffKey];
        if (!config) {
            alert('請先選擇難度');
            return;
        }
        setPendingHabit({ habit, diffKey });
        setPendingCue(null);
        setView('anchor');
    };
```

Add a NEW function that's called from View 3 to actually emit the task:

```jsx
    const emitPendingTask = (cue) => {
        if (!pendingHabit) return;
        const { habit, diffKey } = pendingHabit;
        const config = habit.difficulties[diffKey];
        const task = {
            title: config.label || habit.name,
            details: habit.description || '',
            cue: cue || null,
            type: config.type || 'binary',
            category: habit.category || 'star',
            frequency: config.recurrence?.type || 'daily',
            recurrence: config.recurrence || { type: 'daily', interval: 1, endType: 'never' },
            dailyTarget: config.dailyTarget || 1,
            unit: config.unit || '次',
            stepValue: config.stepValue || 1,
            subtasks: config.subtasks || [],
        };
        onSelectTask(task);
    };
```

### Step 4: Wire back navigation from anchor → list

Locate `handleBack` (around line 49-53). Update so that `view === 'anchor'` goes back to `'list'`:

```jsx
    const handleBack = () => {
        if (view === 'anchor') {
            setView('list');
            setPendingHabit(null);
            setPendingCue(null);
            return;
        }
        setView('domain');
        setSelectedDomain(null);
        setSearch('');
    };
```

### Step 5: Update `headerLabel` and body render for `'anchor'` view

Locate `headerLabel` (around line 110-114). Extend:

```jsx
    const headerLabel = view === 'list' && selectedDomain
        ? selectedDomain.name
        : view === 'search'
            ? '搜尋結果'
            : view === 'anchor'
                ? '選擇錨點'
                : '選擇習慣';
```

### Step 6: Add AnchorPicker import + the View 3 render branch

At the top of the file, add the import:

```jsx
import AnchorPicker from './explore/AnchorPicker';
```

Locate the body render block where `view === 'domain'` and the `else` (list/search) branches are (around line 165-200). Add a new branch at the start (after loading check) so that `view === 'anchor'` renders the picker plus confirm/skip:

```jsx
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Keep manual-create button visible in all non-anchor views */}
                    {view !== 'anchor' && (
                        <button
                            onClick={onOpenCustomForm}
                            className="w-full bg-gray-800 text-white text-base font-bold py-3 rounded-xl shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Edit2 size={20} /> 手動建立新任務
                        </button>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="animate-spin text-emerald-500" size={32} />
                        </div>
                    ) : view === 'domain' ? (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">選擇一個健康面向</p>
                            <DomainGrid categories={categories} onSelect={handleSelectDomain} />
                        </>
                    ) : view === 'anchor' ? (
                        <>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-2">
                                <p className="text-xs text-emerald-700 mb-1">準備加入：</p>
                                <p className="text-sm font-bold text-emerald-900">{pendingHabit?.habit?.name}</p>
                                <p className="text-xs text-emerald-700 mt-0.5">難度：{pendingHabit?.diffKey === 'beginner' ? '入門' : pendingHabit?.diffKey === 'intermediate' ? '進階' : '挑戰'}</p>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">挑一個錨點（你習慣在什麼時候做）</p>
                            <AnchorPicker
                                value={pendingCue}
                                onChange={setPendingCue}
                                yourTasks={yourTasks}
                            />
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => emitPendingTask(null)}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
                                >
                                    跳過此步驟
                                </button>
                                <button
                                    onClick={() => emitPendingTask(pendingCue)}
                                    disabled={!pendingCue}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                                        pendingCue
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {pendingCue ? `確認（錨點：${pendingCue}）` : '請先選一個錨點'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {view === 'search' ? `搜尋「${search}」` : '推薦習慣'}
                            </p>
                            <HabitListView
                                habits={visibleHabits}
                                selectedDifficulty={selectedDifficulty}
                                setSelectedDifficulty={setSelectedDifficulty}
                                onSelectHabit={handleSelectHabit}
                                emptyText={view === 'search' ? '沒有符合的習慣' : '這個面向目前還沒有推薦習慣'}
                            />
                        </>
                    )}
                </div>
```

### Step 7: Hide the search input on anchor view

The search input is rendered above the body. Wrap it so it only shows on non-anchor views. Locate the `{/* Search */}` block (around line 137-149) and wrap:

```jsx
                {/* Search */}
                {view !== 'anchor' && (
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={view === 'list' ? `在「${selectedDomain?.name || ''}」內搜尋…` : '搜尋習慣…'}
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                )}
```

### Step 8: Run all tests

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all green (Slice A tests + Slice A.5 + new AnchorPicker).

### Step 9: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskLibraryModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskLibraryModal anchor view (View 3)"
```

---

## Task 8: MainApp — thread `yourTasks` prop

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`

### Step 1: Pass `yourTasks` to TaskLibraryModal

Find the `<TaskLibraryModal ... />` render (around line 598 per Slice A.5 exploration). Add the `yourTasks` prop:

```jsx
            <TaskLibraryModal
                isOpen={isLibraryModalOpen}
                onClose={() => setIsLibraryModalOpen(false)}
                onSelectTask={(task) => { handleSaveTask({ ...task, id: generateId() }); setIsLibraryModalOpen(false); }}
                onOpenCustomForm={() => { setIsLibraryModalOpen(false); setIsFormModalOpen(true); }}
                yourTasks={tasks}
            />
```

### Step 2: Pass `yourTasks` to TaskFormModal

Find the `<TaskFormModal ... />` render in MainApp (also around line 600+). Add `yourTasks={tasks}`:

```jsx
            <TaskFormModal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setEditingTask(null); }}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                initialData={editingTask}
                defaultDate={selectedDate}
                yourTasks={tasks}
            />
```

If there are multiple `<TaskFormModal>` renders, add to all of them.

### Step 3: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): pass yourTasks to TaskLibraryModal + TaskFormModal"
```

---

## Task 9: Browser smoke verification

Verification only. No commits unless an issue surfaces.

### Step 1: Start dev server

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npm run dev
```

Run in background. Wait for `Ready in Xs`.

### Step 2: Walk the new flow via preview tool

Open the preview tool, log in (reuse the SliceAtest user or recreate):

1. Open the app, log in
2. Click "探索習慣" in sidebar
3. Pick a domain (e.g. 飲食)
4. Pick a habit (e.g. 每天喝足 2500cc 水)
5. Select 入門 difficulty
6. Click "+ 新增"
7. **Expect View 3 anchor select**:
   - Top "準備加入" emerald box shows habit + difficulty
   - "你的習慣" section visible if test user has tasks (might be empty for new test user)
   - "生活時刻" 15-button grid
   - "+ 自訂..." button
   - Bottom: "跳過此步驟" + disabled "請先選一個錨點"
8. Click "起床後"
9. Verify Confirm button becomes "確認（錨點：起床後）" emerald
10. Click Confirm → TaskFormModal opens preview
11. Inside TaskFormModal, scroll to find AnchorPicker — `起床後` should be pre-highlighted
12. Save the task
13. Verify TaskCard on dashboard shows "錨點：起床後" chip

### Step 3: Test the skip path

1. Open 探索習慣 again
2. Pick a different habit
3. Click "+ 新增"
4. In View 3, click "跳過此步驟" → no anchor passed
5. TaskFormModal opens with empty cue
6. Save → TaskCard shows no anchor chip (matches existing behavior)

### Step 4: Test custom anchor

1. Open 探索習慣 → pick habit → +新增
2. In View 3, click "+ 自訂..."
3. Type "看完手機新聞後" → Enter
4. Confirm becomes active with that text
5. Save → TaskCard shows "錨點：看完手機新聞後"

### Step 5: Test editing an existing task

1. Click an existing TaskCard with cue
2. TaskDetailModal opens — anchor chip visible
3. Click "編輯" → TaskFormModal opens
4. AnchorPicker shows the current cue pre-selected
5. Pick a different anchor → save
6. TaskCard now shows new anchor

### Step 6: Stop dev server

(Through preview tool, or just leave running for follow-on dev.)

---

## Task 10: Merge + push

### Step 1: Verify branch state

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git status --short && git log --oneline main..HEAD
```

Should show clean tree and the Task 1-8 commits on `feat/slice-b-anchor-pairing`.

### Step 2: Run full test suite once more

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all suites pass (Slice A.5's 26 tests + 10 new AnchorPicker tests = 36 total).

### Step 3: Merge to main

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git checkout main && git merge --ff-only feat/slice-b-anchor-pairing
```

### Step 4: Push

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git push origin main
```

### Step 5: Verify Vercel deploy

```bash
vercel --scope johnson-cofitmes-projects ls habitnext1 2>&1 | head -5
```

Wait for `● Ready`.

### Step 6: Live smoke (optional)

Reload https://habitnext1.vercel.app and repeat the Task 9 walkthrough on real prod.

---

## Self-Review Notes

- Spec section 3 (Schema): Task 1
- Spec section 4.1 (LIFE_MOMENTS): Task 2
- Spec section 4.2 (your habits filter): Task 3 implementation + Task 8 prop threading
- Spec section 4.3 (custom anchor): Task 3 implementation
- Spec section 5 (3-view state machine): Task 7
- Spec section 6 (component file structure): every task points at the exact path in spec section 6
- Spec section 7 (AnchorPicker API): Task 3 implements exactly the documented props (value, onChange, yourTasks, excludeTaskId)
- Spec section 8 (TaskCard display): Task 5
- Spec section 9 (API): Task 4
- Spec section 10 (edit existing task): Task 6 (TaskFormModal cue field + initialData.cue handling)
- Spec section 11 (risks): mitigations baked in — nullable schema (Task 1), skip-friendly disabled-confirm UI (Task 7), 30-char limit (Task 3 maxLength), excludeTaskId (Task 3), AnchorPicker preselect (Task 6)
- Spec section 12 (acceptance): Task 9 walks through every acceptance criterion
- No placeholders. Commands have expected output. Types consistent (`cue`, `pendingCue`, `pendingHabit`, `excludeTaskId`, `LIFE_MOMENTS`, `CUSTOM_ANCHOR_MAX_LENGTH` all used consistently).
