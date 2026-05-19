# Slice E + G — Identity + 女性小課程 Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Task.identity` field with typeKey-derived defaults (Slice E), then wire up infrastructure to surface type-specific Templates (`User.typeKey` + dashboard CTA + menstrual toggle + 10 new OfficialHabit seed) without yet authoring the 4 flower templates (Slice G content gated on colleague feedback).

**Architecture:** Two schema deltas (`Task.identity String?`, `User.typeKey String?`, `Assignment.isMenstrual`, `Assignment.menstrualStart`). Identity uses an IdentityPicker mirroring AnchorPicker — typeKey-derived recommended option + 4 generic + custom. TaskLibraryModal extends from 3-view to 4-view (domain → habit → anchor → **identity** → save). Dashboard hooks for typeKey CTA + menstrual toggle ready but show "coming soon" until 4 templates land in Chunk 3.

**Tech Stack:** Prisma 5 + Vercel Postgres, Next.js 14 App Router, React 18, Tailwind, Jest + RTL.

**Spec:** [`docs/superpowers/specs/2026-05-19-slice-e-g-identity-and-women-templates-design.md`](../specs/2026-05-19-slice-e-g-identity-and-women-templates-design.md)
**Colleague feedback (parallel):** [`docs/notes/2026-05-19-women-course-content-feedback.md`](../../notes/2026-05-19-women-course-content-feedback.md)

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/src/lib/typeKeys.js` | `USER_TYPE_PROFILES` (4 flower types) + `GENERIC_IDENTITIES` + `IDENTITY_MAX_LENGTH` + `deriveDefaultIdentity(typeKey)` helper |
| `web-app/src/__tests__/lib/typeKeys.test.js` | Unit tests for `deriveDefaultIdentity` (TDD) |
| `web-app/src/components/explore/IdentityPicker.jsx` | UI component, mirrors AnchorPicker pattern |
| `web-app/src/__tests__/components/IdentityPicker.test.jsx` | RTL tests for picker (typeKey present / absent, custom input, skip) |
| `web-app/scripts/spike-template-rollover.js` | One-shot diagnostic — does join-assignment expand all phases or rollover by phase.days? |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | Add `Task.identity String?` + `User.typeKey String?` + `Assignment.isMenstrual Boolean @default(false)` + `Assignment.menstrualStart DateTime?` |
| `web-app/src/components/TaskLibraryModal.jsx` | 3-view → 4-view (add identity step after anchor) |
| `web-app/src/components/TaskFormModal.jsx` | Add IdentityPicker to edit form |
| `web-app/src/components/TaskCard.jsx` | Render identity above cue (極小灰字) when present |
| `web-app/src/components/TaskDetailModal.jsx` | Same identity-above-cue treatment |
| `web-app/src/app/api/tasks/route.js` | POST accept `identity` |
| `web-app/src/app/api/tasks/[id]/route.js` | PUT accept `identity` |
| `web-app/src/components/MainApp.jsx` | typeKey-aware CTA placeholder + menstrual toggle wiring |
| `web-app/src/components/TemplateExplorer.jsx` | Filter by `category === user.typeKey` (when typeKey set) |
| `web-app/prisma/seed/genesis-io-habits.json` | Append 10 new OfficialHabit records used by future flower templates |

---

## Chunk 1 — Slice E (Identity foundation)

Independent ship. Can be deployed before colleague replies. 8 tasks.

---

### Task 1: Schema — `Task.identity` + `User.typeKey`

**Files:**
- Modify: `web-app/prisma/schema.prisma`

- [ ] **Step 1: Add fields**

Edit `web-app/prisma/schema.prisma`. In `model User { ... }` add `typeKey`:

```prisma
model User {
  id          String       @id @default(cuid())
  nickname    String
  phone       String       @unique
  countryCode String?
  password    String?
  email       String?
  typeKey     String?      // ★ 新增 — 'daisy' | 'rose' | 'orchid' | 'sunflower' (set by quiz module)
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  tasks       Task[]
  assignments Assignment[]
}
```

In `model Task { ... }` add `identity` near the existing `cue` field:

```prisma
model Task {
  ...
  cue          String?   // 既有 — 錨點
  identity     String?   // ★ 新增 — 身分宣告「我是個照顧週期身體的人」
  ...
}
```

- [ ] **Step 2: Push schema**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && npx prisma db push
```

Expected ending: `Your database is now in sync with your Prisma schema.` (Both fields nullable — no data-loss prompt.)

- [ ] **Step 3: Verify**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); Promise.all([p.\$queryRaw\`SELECT column_name FROM information_schema.columns WHERE table_name='User' AND column_name='typeKey'\`, p.\$queryRaw\`SELECT column_name FROM information_schema.columns WHERE table_name='Task' AND column_name='identity'\`]).then(r=>{console.log('User.typeKey:', r[0].length>0); console.log('Task.identity:', r[1].length>0); return p.\$disconnect();})"
```

Expected: `User.typeKey: true` and `Task.identity: true`.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): Task.identity + User.typeKey for Slice E/G"
```

---

### Task 2: Pure helper lib + TDD

**Files:**
- Create: `web-app/src/lib/typeKeys.js`
- Create: `web-app/src/__tests__/lib/typeKeys.test.js`

- [ ] **Step 1: Write failing test**

```js
// src/__tests__/lib/typeKeys.test.js
const {
  USER_TYPE_PROFILES,
  GENERIC_IDENTITIES,
  IDENTITY_MAX_LENGTH,
  deriveDefaultIdentity,
} = require('../../lib/typeKeys');

describe('typeKeys', () => {
  it('exposes the 4 flower profiles with label + identity', () => {
    expect(Object.keys(USER_TYPE_PROFILES).sort()).toEqual(['daisy', 'orchid', 'rose', 'sunflower']);
    for (const profile of Object.values(USER_TYPE_PROFILES)) {
      expect(typeof profile.label).toBe('string');
      expect(typeof profile.identity).toBe('string');
    }
  });

  it('exposes 4 generic identities', () => {
    expect(GENERIC_IDENTITIES).toHaveLength(4);
    GENERIC_IDENTITIES.forEach(s => expect(typeof s).toBe('string'));
  });

  it('exposes a 40-character max length', () => {
    expect(IDENTITY_MAX_LENGTH).toBe(40);
  });
});

describe('deriveDefaultIdentity', () => {
  it('returns the type identity when typeKey matches a profile', () => {
    expect(deriveDefaultIdentity('rose')).toBe(USER_TYPE_PROFILES.rose.identity);
    expect(deriveDefaultIdentity('daisy')).toBe(USER_TYPE_PROFILES.daisy.identity);
  });

  it('returns null when typeKey is unknown / null / undefined / empty', () => {
    expect(deriveDefaultIdentity(null)).toBeNull();
    expect(deriveDefaultIdentity(undefined)).toBeNull();
    expect(deriveDefaultIdentity('')).toBeNull();
    expect(deriveDefaultIdentity('UNKNOWN')).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/typeKeys.test.js
```

Expected: `Cannot find module '../../lib/typeKeys'`.

- [ ] **Step 3: Implement**

```js
// src/lib/typeKeys.js
// Profile metadata for the 4 user-typing flower categories.
// The `typeKey` value lives on User.typeKey, set externally by the
// quiz module. Identity strings here are the default seeded
//身分認同 (per James Clear / 原子習慣) — users can override.

const USER_TYPE_PROFILES = {
  daisy:     { label: '雛菊型', identity: '我是個穩定照顧自己的人' },
  rose:      { label: '玫瑰型', identity: '我是個照顧週期身體的人' },
  orchid:    { label: '蘭花型', identity: '我是個重視生活節律的人' },
  sunflower: { label: '向日葵型', identity: '我是個照顧代謝健康的人' },
};

// Generic identity options — shown alongside the typeKey-derived
// recommendation, available even when typeKey is null.
const GENERIC_IDENTITIES = [
  '我是個有紀律的人',
  '我是個珍惜身體的人',
  '我是個堅持微小行動的人',
  '我是個照顧自己心靈的人',
];

const IDENTITY_MAX_LENGTH = 40;

function deriveDefaultIdentity(typeKey) {
  if (!typeKey) return null;
  const profile = USER_TYPE_PROFILES[typeKey];
  return profile ? profile.identity : null;
}

module.exports = {
  USER_TYPE_PROFILES,
  GENERIC_IDENTITIES,
  IDENTITY_MAX_LENGTH,
  deriveDefaultIdentity,
};
```

- [ ] **Step 4: Run, verify PASS**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/typeKeys.test.js
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/typeKeys.js web-app/src/__tests__/lib/typeKeys.test.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(lib): typeKeys with USER_TYPE_PROFILES + deriveDefaultIdentity + tests"
```

---

### Task 3: IdentityPicker component + RTL test

**Files:**
- Create: `web-app/src/components/explore/IdentityPicker.jsx`
- Create: `web-app/src/__tests__/components/IdentityPicker.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// src/__tests__/components/IdentityPicker.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IdentityPicker from '../../components/explore/IdentityPicker';
import { USER_TYPE_PROFILES, GENERIC_IDENTITIES } from '../../lib/typeKeys';

describe('IdentityPicker', () => {
  it('renders the typeKey-derived recommendation with star marker when typeKey is set', () => {
    render(<IdentityPicker value={null} onChange={() => {}} userTypeKey="rose" />);
    expect(screen.getByText(USER_TYPE_PROFILES.rose.identity)).toBeInTheDocument();
    expect(screen.getByText(/推薦/)).toBeInTheDocument();
  });

  it('hides the recommendation chip when typeKey is null', () => {
    render(<IdentityPicker value={null} onChange={() => {}} userTypeKey={null} />);
    expect(screen.queryByText(/推薦/)).not.toBeInTheDocument();
    // Generic options still shown
    GENERIC_IDENTITIES.forEach(s => expect(screen.getByText(s)).toBeInTheDocument());
  });

  it('calls onChange with the identity string when an option is clicked', () => {
    const onChange = jest.fn();
    render(<IdentityPicker value={null} onChange={onChange} userTypeKey={null} />);
    fireEvent.click(screen.getByText(GENERIC_IDENTITIES[0]));
    expect(onChange).toHaveBeenCalledWith(GENERIC_IDENTITIES[0]);
  });

  it('highlights the selected identity when value matches', () => {
    render(<IdentityPicker value={GENERIC_IDENTITIES[1]} onChange={() => {}} userTypeKey={null} />);
    const selected = screen.getByText(GENERIC_IDENTITIES[1]).closest('button');
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });

  it('reveals text input when "+ 自訂" is clicked and submits via Enter', () => {
    const onChange = jest.fn();
    render(<IdentityPicker value={null} onChange={onChange} userTypeKey={null} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂身分/);
    fireEvent.change(input, { target: { value: '我是個全力以赴的人' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('我是個全力以赴的人');
  });

  it('truncates custom input to IDENTITY_MAX_LENGTH (40)', () => {
    render(<IdentityPicker value={null} onChange={() => {}} userTypeKey={null} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂身分/);
    const long = 'a'.repeat(60);
    fireEvent.change(input, { target: { value: long } });
    expect(input.value.length).toBeLessThanOrEqual(40);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/components/IdentityPicker.test.jsx
```

Expected: `Cannot find module '../../components/explore/IdentityPicker'`.

- [ ] **Step 3: Implement**

```jsx
// src/components/explore/IdentityPicker.jsx
"use client";

import React, { useState } from 'react';
import { Edit3, Sparkles } from 'lucide-react';
import {
  USER_TYPE_PROFILES,
  GENERIC_IDENTITIES,
  IDENTITY_MAX_LENGTH,
  deriveDefaultIdentity,
} from '@/lib/typeKeys';

function IdentityButton({ label, selected, recommended, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected ? 'true' : 'false'}
      className={`relative w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
        selected
          ? 'bg-emerald-500 text-white border border-emerald-500 shadow-sm'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {recommended && (
        <span className="absolute -top-1.5 -right-1.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Sparkles size={10} /> 推薦
        </span>
      )}
      {label}
    </button>
  );
}

export default function IdentityPicker({ value, onChange, userTypeKey = null }) {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const recommended = deriveDefaultIdentity(userTypeKey);

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
    <div className="space-y-3">
      {recommended && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            為你推薦的身分（{USER_TYPE_PROFILES[userTypeKey]?.label}）
          </p>
          <IdentityButton
            label={recommended}
            selected={value === recommended}
            recommended
            onClick={() => onChange(recommended)}
          />
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          或自選
        </p>
        <div className="space-y-2">
          {GENERIC_IDENTITIES.map(s => (
            <IdentityButton
              key={s}
              label={s}
              selected={value === s}
              recommended={false}
              onClick={() => onChange(s)}
            />
          ))}
        </div>
      </div>

      <div>
        {!customMode ? (
          <button
            type="button"
            onClick={() => setCustomMode(true)}
            className="w-full px-3 py-2 rounded-xl text-sm font-medium text-center bg-gray-50 border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-1"
          >
            <Edit3 size={14} /> 自訂身分
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              maxLength={IDENTITY_MAX_LENGTH}
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, IDENTITY_MAX_LENGTH))}
              onKeyDown={handleCustomKey}
              placeholder={`輸入自訂身分（最多 ${IDENTITY_MAX_LENGTH} 字）`}
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

- [ ] **Step 4: Run tests, verify PASS**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/components/IdentityPicker.test.jsx
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/explore/IdentityPicker.jsx web-app/src/__tests__/components/IdentityPicker.test.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): IdentityPicker with typeKey-derived recommendation"
```

---

### Task 4: TaskLibraryModal — 3-view → 4-view (add identity step)

**Files:**
- Modify: `web-app/src/components/TaskLibraryModal.jsx`

The current flow is `domain → habit → anchor → save`. After Task 4 it becomes `domain → habit → anchor → identity → save`.

- [ ] **Step 1: Read existing TaskLibraryModal**

Read the file to identify:
- `view` state values (`'domain' | 'list' | 'anchor' | ...`)
- `handleSelectDomain`, `handleSelectHabit`, anchor view confirm flow
- Where `emitPendingTask(cue)` is called — that's the spot to redirect into the identity view first

- [ ] **Step 2: Add identity view + state**

At the top of the component, add new state and import:

```jsx
import IdentityPicker from './explore/IdentityPicker';
```

Add state for the identity step:

```jsx
const [pendingCue, setPendingCue] = useState(null);
const [identityChoice, setIdentityChoice] = useState(null);
```

Extend the `view` enum to include `'identity'`. The user's typeKey comes via prop `userTypeKey` (forwarded from MainApp; can be null).

Add prop to the component signature:

```jsx
const TaskLibraryModal = ({ isOpen, onClose, onSelectTask, onOpenCustomForm, userTypeKey = null, yourTasks = [] }) => {
```

(Note: `yourTasks` was already there from Slice B; `userTypeKey` is new — must be added to `MainApp.jsx`'s use of this modal in Task 7.)

- [ ] **Step 3: Redirect anchor confirm to identity view**

Locate where anchor confirm currently calls `emitPendingTask(cue)`. Replace that single call with:

```jsx
// Old:
// emitPendingTask(cue);

// New:
setPendingCue(cue);
setIdentityChoice(null);
setView('identity');
```

- [ ] **Step 4: Render identity view body**

Find the body switch (currently has `view === 'domain'` and `view === 'list' / 'search'` branches). Add a new branch for `'identity'`:

```jsx
) : view === 'identity' ? (
    <>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            為什麼做這個習慣？(可跳過)
        </p>
        <IdentityPicker
            value={identityChoice}
            onChange={setIdentityChoice}
            userTypeKey={userTypeKey}
        />
        <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button
                type="button"
                onClick={() => { emitPendingTask(pendingCue, null); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
                跳過
            </button>
            <button
                type="button"
                disabled={!identityChoice}
                onClick={() => { emitPendingTask(pendingCue, identityChoice); }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
                    identityChoice
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
                確認
            </button>
        </div>
    </>
) : (
```

- [ ] **Step 5: Update `emitPendingTask` to take both cue + identity**

The current signature is `emitPendingTask(cue)`. Change to:

```jsx
const emitPendingTask = (cue, identity) => {
    if (!pendingHabit) return;
    const { habit, diffKey } = pendingHabit;
    const config = habit.difficulties[diffKey];
    const task = {
        title: habit.name,
        details: habit.description || '',
        cue: cue || null,
        identity: identity || null,    // ★ 新增
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
    // Reset state so next-open starts clean
    setPendingCue(null);
    setIdentityChoice(null);
};
```

- [ ] **Step 6: Wire back-chevron to navigate identity → anchor**

The existing back chevron uses `handleBack`. Extend it to handle the new view:

```jsx
const handleBack = () => {
    if (view === 'identity') {
        setView('anchor');
        return;
    }
    if (view === 'anchor') {
        setView('list');
        return;
    }
    if (view === 'list') {
        setView('domain');
        setSelectedDomain(null);
        return;
    }
    setView('domain');
    setSelectedDomain(null);
};
```

(Adjust per existing branches — if `handleBack` already has these conditions for anchor/list, just add the `'identity'` branch at the top.)

- [ ] **Step 7: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all suites pass (47+ tests).

- [ ] **Step 8: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskLibraryModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskLibraryModal 4-view flow (adds identity step after anchor)"
```

---

### Task 5: TaskFormModal — add IdentityPicker to edit form

**Files:**
- Modify: `web-app/src/components/TaskFormModal.jsx`

- [ ] **Step 1: Read existing form state**

Find `formData` state. Likely includes `cue` already (from Slice B). We're adding `identity` alongside.

- [ ] **Step 2: Add import + state field**

At top of `TaskFormModal.jsx`:

```jsx
import IdentityPicker from './explore/IdentityPicker';
```

In the `formData` state default, add `identity: ''`:

```jsx
const [formData, setFormData] = useState({
    // ...existing fields
    cue: '',
    identity: '',         // ★ 新增
    // ...
});
```

In the `useEffect` that hydrates from `initialData`, also pull `identity`:

```jsx
useEffect(() => {
    if (initialData) {
        setFormData({
            // ...existing
            cue: initialData.cue || '',
            identity: initialData.identity || '',     // ★ 新增
            // ...
        });
    }
}, [initialData]);
```

- [ ] **Step 3: Add IdentityPicker UI block**

Add this near where the anchor (cue) editing UI lives. The form receives `userTypeKey` as a new prop from MainApp:

```jsx
const TaskFormModal = ({ isOpen, onSave, onClose, initialData, userTypeKey = null, ... }) => {
```

In the JSX body, after the cue picker block, add:

```jsx
<div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">身分認同 (可跳過)</label>
    <IdentityPicker
        value={formData.identity || null}
        onChange={(s) => setFormData(f => ({ ...f, identity: s || '' }))}
        userTypeKey={userTypeKey}
    />
</div>
```

- [ ] **Step 4: Ensure save path includes identity**

In `handleSave` (or wherever the form posts), `formData.identity` should already flow through if `onSave(formData)` passes the whole object. If the save function explicitly picks fields, add `identity: formData.identity || null` to the payload object.

- [ ] **Step 5: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskFormModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskFormModal IdentityPicker in edit form"
```

---

### Task 6: TaskCard + TaskDetailModal — display identity above cue

**Files:**
- Modify: `web-app/src/components/TaskCard.jsx`
- Modify: `web-app/src/components/TaskDetailModal.jsx`

- [ ] **Step 1: TaskCard — identity row above cue**

In `web-app/src/components/TaskCard.jsx`, locate the cue-rendering block (currently lines around 74-79, looks like):

```jsx
{task.cue && (
    <p className="text-[11px] font-medium text-emerald-600 mb-0.5 flex items-center gap-1 leading-tight">
        <span>{task.cue}</span>
        <span className="text-gray-300">→</span>
    </p>
)}
```

**Add an identity line ABOVE the cue block**:

```jsx
{task.identity && (
    <p className="text-[10px] font-medium text-gray-400 mb-0.5 leading-tight">
        {task.identity}
    </p>
)}
{task.cue && (
    <p className="text-[11px] font-medium text-emerald-600 mb-0.5 flex items-center gap-1 leading-tight">
        <span>{task.cue}</span>
        <span className="text-gray-300">→</span>
    </p>
)}
```

- [ ] **Step 2: TaskDetailModal — same treatment**

In `web-app/src/components/TaskDetailModal.jsx`, locate the cue display (probably around line 65 from prior slices):

```jsx
{task.cue && (
    <p className="text-sm font-medium text-emerald-600 mb-1 flex items-center gap-1">
        <span>{task.cue}</span>
        <span className="text-gray-300">→</span>
    </p>
)}
```

**Add identity above**:

```jsx
{task.identity && (
    <p className="text-xs font-medium text-gray-500 mb-1">
        {task.identity}
    </p>
)}
{task.cue && (
    <p className="text-sm font-medium text-emerald-600 mb-1 flex items-center gap-1">
        <span>{task.cue}</span>
        <span className="text-gray-300">→</span>
    </p>
)}
```

- [ ] **Step 3: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all pass. Existing TaskCard tests should still work since `task.identity` is undefined in existing fixtures.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskCard.jsx web-app/src/components/TaskDetailModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): show identity above cue on TaskCard and TaskDetailModal"
```

---

### Task 7: API persistence — accept identity in POST/PUT

**Files:**
- Modify: `web-app/src/app/api/tasks/route.js`
- Modify: `web-app/src/app/api/tasks/[id]/route.js`

- [ ] **Step 1: POST handler — accept identity**

In `web-app/src/app/api/tasks/route.js` POST, find where the request body is destructured. Add `identity` to the destructure and pass through to `prisma.task.create`:

```js
const { /* existing */ cue, identity, /* existing */ } = body;

// ...

const task = await prisma.task.create({
    data: {
        // ...existing fields
        cue: cue?.trim() || null,
        identity: identity?.trim() || null,     // ★ 新增
        // ...
    }
});
```

If `cue` is currently the only field pulled in this destructure, just add `identity` next to it. Don't restructure surrounding code.

- [ ] **Step 2: PUT handler — accept identity**

In `web-app/src/app/api/tasks/[id]/route.js` PUT, find the existing conditional updates (likely a `updateData = {}` followed by `if (cue !== undefined) ...`):

```js
if (cue !== undefined) updateData.cue = cue?.trim() || null;
if (identity !== undefined) updateData.identity = identity?.trim() || null;   // ★ 新增
```

Add `identity` to the destructure at the top of the handler.

- [ ] **Step 3: Wire MainApp to forward identity & typeKey**

In `web-app/src/components/MainApp.jsx`, ensure the TaskLibraryModal and TaskFormModal usages pass `userTypeKey={user?.typeKey || null}`:

Find:
```jsx
<TaskLibraryModal
    isOpen={isLibraryModalOpen}
    onClose={...}
    onSelectTask={...}
    onOpenCustomForm={...}
    yourTasks={tasks}
/>
```

Add prop:
```jsx
<TaskLibraryModal
    isOpen={isLibraryModalOpen}
    onClose={...}
    onSelectTask={...}
    onOpenCustomForm={...}
    yourTasks={tasks}
    userTypeKey={user?.typeKey || null}    // ★ 新增
/>
```

Same for TaskFormModal:
```jsx
<TaskFormModal
    // ...existing props
    userTypeKey={user?.typeKey || null}    // ★ 新增
/>
```

Also: when `handleSaveTask` constructs/persists tasks, ensure `identity` flows through (similar pattern to `cue`).

- [ ] **Step 4: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/app/api/tasks/route.js "web-app/src/app/api/tasks/[id]/route.js" web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): persist Task.identity in POST/PUT and forward userTypeKey from MainApp"
```

---

### Task 8: Slice E browser smoke

Manual verification. No commit unless fix needed.

- [ ] **Step 1: Start dev server**

Use preview tool config `Habitnext Dev`.

- [ ] **Step 2: Set typeKey on a test user**

For a known test user (or new one), set `typeKey='rose'` via DB:

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
require('./scripts/lib/env');
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('SliceEtest', 10);
  const u = await p.user.upsert({
    where: { phone: '0900000003' },
    update: { password: hash, typeKey: 'rose', isActive: true },
    create: { nickname: 'SliceEtest', phone: '0900000003', countryCode: '+886', password: hash, typeKey: 'rose', isActive: true }
  });
  console.log('user:', u.id, 'typeKey:', u.typeKey);
  await p.\$disconnect();
})();
"
```

- [ ] **Step 3: Walk the flow**

Login → 探索習慣 → 飲食 → 點某 habit → 選難度 + 加入 → anchor view → 確認某 anchor → **identity view 出現** with 「⭐ 推薦：我是個照顧週期身體的人」 → 點 confirm → TaskFormModal → save.

Open the new task card → confirm identity shown above cue in grey small text.

Edit task → IdentityPicker pre-selects the chosen identity.

- [ ] **Step 4: Verify typeKey=null path**

Set the user's typeKey back to null (via DB) → re-walk explore flow → identity view shows 4 generic options without 「⭐ 推薦」 badge.

- [ ] **Step 5: Clean up test user**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
require('./scripts/lib/env');
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.delete({ where: { phone: '0900000003' } }).then(u => console.log('deleted', u.id)).catch(e => console.error(e.message)).finally(() => p.\$disconnect());
"
```

If reusing existing user, skip cleanup.

---

## Chunk 2 — Slice G infrastructure (no flower content)

Can ship independently after Chunk 1. CTA placeholder mode "coming soon".

---

### Task 9: Schema — `Assignment.isMenstrual` + `menstrualStart`

**Files:**
- Modify: `web-app/prisma/schema.prisma`

- [ ] **Step 1: Add fields to Assignment**

```prisma
model Assignment {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  templateId      String
  template        Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  expertId        String
  expert          Expert    @relation(fields: [expertId], references: [id], onDelete: Cascade)
  status          String    @default("active")
  startDate       DateTime  @default(now())
  endDate         DateTime?
  isMenstrual     Boolean   @default(false)  // ★ 新增
  menstrualStart  DateTime?                   // ★ 新增
  notes           String?
  createdAt       DateTime  @default(now())
}
```

- [ ] **Step 2: Push schema**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && npx prisma db push
```

Expected: success, no data-loss prompt.

- [ ] **Step 3: Verify**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.\$queryRaw\`SELECT column_name FROM information_schema.columns WHERE table_name='Assignment' AND column_name IN ('isMenstrual','menstrualStart')\`.then(r=>{console.log(r); return p.\$disconnect();})"
```

Expected: 2 rows.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): Assignment.isMenstrual + menstrualStart for Slice G"
```

---

### Task 10: Spike — Template phase rollover behavior

**Files:**
- Create: `web-app/scripts/spike-template-rollover.js`

This is a **diagnostic script** to determine whether the existing `/api/user/assignments` POST expands all phase tasks at once or rollover by `phase.days`. Result drives whether we need a remediation task.

- [ ] **Step 1: Implement diagnostic**

```js
// scripts/spike-template-rollover.js
// One-shot diagnostic: how does the existing system handle phase rollover?
// Creates a test template + assignment, inspects Task records that get created.
// Cleans up afterwards.

require('./lib/env');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  console.log('=== Spike: Template phase rollover ===\n');

  // 1. Find any existing expert (or create a throwaway one)
  let expert = await prisma.expert.findFirst();
  let createdExpert = false;
  if (!expert) {
    expert = await prisma.expert.create({
      data: {
        name: 'SPIKE Test Expert',
        email: 'spike-test@example.com',
        password: 'unused',
        isActive: true,
        isApproved: true,
      },
    });
    createdExpert = true;
    console.log('Created throwaway expert:', expert.id);
  } else {
    console.log('Using existing expert:', expert.id, expert.name);
  }

  // 2. Find or create test user
  const userPhone = '0900000099';
  const user = await prisma.user.upsert({
    where: { phone: userPhone },
    update: { isActive: true },
    create: { nickname: 'SPIKE Test User', phone: userPhone, isActive: true },
  });
  console.log('Test user:', user.id);

  // 3. Create test template with 2 phases (3 days each)
  const template = await prisma.template.create({
    data: {
      expertId: expert.id,
      name: 'SPIKE Rollover Test',
      description: 'diagnostic only',
      category: 'spike',
      isPublic: false,
      startDateType: 'user_choice',
      tasks: {
        version: '2.0',
        phases: [
          {
            id: 'phase1',
            name: 'Phase 1',
            days: 3,
            tasks: [{ title: 'SPIKE Task A (phase 1)', type: 'binary' }],
          },
          {
            id: 'phase2',
            name: 'Phase 2',
            days: 3,
            tasks: [{ title: 'SPIKE Task B (phase 2)', type: 'binary' }],
          },
        ],
      },
    },
  });
  console.log('Test template:', template.id);

  // 4. Simulate user joining via the existing API
  const baseUrl = process.env.SPIKE_BASE_URL || 'http://localhost:3000';
  let assignment = null;
  let tasksCreated = [];
  try {
    const res = await fetch(`${baseUrl}/api/user/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        templateId: template.id,
        startDate: new Date().toISOString().slice(0, 10),
      }),
    });
    console.log('POST /api/user/assignments:', res.status);
    if (res.ok) {
      const body = await res.json();
      console.log('Response:', JSON.stringify(body, null, 2));
      // Look up resulting assignment + tasks
      assignment = await prisma.assignment.findFirst({
        where: { userId: user.id, templateId: template.id },
        orderBy: { createdAt: 'desc' },
      });
      console.log('\nAssignment created:', assignment?.id);
      tasksCreated = await prisma.task.findMany({
        where: { userId: user.id, assignmentId: assignment?.id },
      });
      console.log(`Tasks created (n=${tasksCreated.length}):`);
      tasksCreated.forEach(t => console.log(`  - "${t.title}" (date=${t.date || 'none'}, isActive=${t.isLocked === false}, metadata=${JSON.stringify(t.metadata)})`));
    } else {
      console.log('Response body:', await res.text());
    }
  } catch (e) {
    console.error('API call failed (is dev server running?):', e.message);
  }

  // 5. Verdict
  console.log('\n=== VERDICT ===');
  if (tasksCreated.length === 0) {
    console.log('No tasks created — API did not expand template tasks. Check existing assignment endpoint.');
  } else {
    const hasBoth = tasksCreated.some(t => t.title.includes('phase 1')) && tasksCreated.some(t => t.title.includes('phase 2'));
    if (hasBoth) {
      console.log('!! All phase tasks created at once (NO ROLLOVER).');
      console.log('   → Need phase-rollover remediation task: render only active-phase tasks based on assignment.startDate + phase.days');
    } else {
      console.log('Only phase 1 tasks created — system already does rollover.');
    }
  }

  // 6. Cleanup
  console.log('\n=== Cleanup ===');
  if (tasksCreated.length) {
    await prisma.task.deleteMany({ where: { id: { in: tasksCreated.map(t => t.id) } } });
    console.log('Deleted', tasksCreated.length, 'test tasks');
  }
  if (assignment) {
    await prisma.assignment.delete({ where: { id: assignment.id } });
    console.log('Deleted test assignment');
  }
  await prisma.template.delete({ where: { id: template.id } });
  console.log('Deleted test template');
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Deleted test user');
  if (createdExpert) {
    await prisma.expert.delete({ where: { id: expert.id } });
    console.log('Deleted throwaway expert');
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Start dev server**

In one terminal:
```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npm run dev
```

Wait for `Ready in ...`.

- [ ] **Step 3: Run the spike**

In another terminal:
```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/spike-template-rollover.js
```

Capture the verdict line. Save the full output in the commit message.

- [ ] **Step 4: Commit (with verdict in message)**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/scripts/spike-template-rollover.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "chore(spike): diagnose Template phase rollover behavior

Verdict: [PASTE VERDICT HERE — 'rollover ✓' or 'all-at-once ✗ — needs remediation']"
```

- [ ] **Step 5: If rollover is broken, add remediation note**

If the verdict is "all at once", document in the plan a follow-up task to add phase-active-window filtering. The cleanest place is `/api/tasks?userId=` GET — filter out tasks whose `metadata.phase.startDay > daysSinceAssignment`. Out-of-scope for this plan's Chunk 2 if remediation needed; reopen plan.

---

### Task 11: Seed — add 10 OfficialHabit records

**Files:**
- Modify: `web-app/prisma/seed/genesis-io-habits.json`

The 10 new habits are derived from the colleague's content. We seed them as full OfficialHabit records (with 3 difficulty configs each) so future flower templates can reference them by name.

- [ ] **Step 1: Append 10 records**

Open `web-app/prisma/seed/genesis-io-habits.json`. The file currently has 92 records (after Slice F). Append these 10 to the end of the array:

```json
{
  "name": "睡前做 2 分鐘深呼吸（4-7-8）",
  "description": "4-7-8 呼吸法降低交感神經活性、放鬆肌肉、幫助入眠。約 2-3 個循環即有放鬆效應。",
  "category": "壓力與睡眠",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "第一餐吃完後吃保健品",
  "description": "保健品配餐吸收率較高，胃部食物緩衝降低不適。設定固定錨點減少忘記。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "起床後喝兩大口水",
  "description": "經過一夜代謝，身體處於輕度脫水。早晨補水活化代謝、減少早晨頭痛感。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "上完廁所後伸展 10 分鐘",
  "description": "如廁是天然的「站起來」錨點。利用這個 cue 累積伸展時間、避免久坐。",
  "category": "運動",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "空腹吃益生菌",
  "description": "空腹狀態胃酸暫時較低，益生菌通過胃部到腸道的存活率較高。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "睡前補充鎂",
  "description": "鎂幫助肌肉放鬆與神經穩定，睡前補充改善入眠品質。建議遠離鈣與奶製品。",
  "category": "壓力與睡眠",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "飯後補充薑黃和葉酸鐵",
  "description": "薑黃配油脂吸收較好，葉酸鐵建議避免空腹（減低胃部不適）。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "想吃甜食先吃堅果等 10 分鐘",
  "description": "甜食慾望多源於血糖快速波動。先吃堅果延緩吸收、10 分鐘後常自然降低渴求。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "把含糖飲料換成白開水或無糖飲品",
  "description": "含糖飲料快速衝高血糖且不會增加飽足感。替換為無糖選項是減糖最簡單的一步。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
},
{
  "name": "找一個 5 分鐘什麼都不做的時間",
  "description": "短暫停頓讓神經系統從持續活躍的狀態切換到副交感模式，是日常情緒緩衝。",
  "category": "壓力與睡眠",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
}
```

Make sure JSON syntax is valid — preceding record must end with `}` followed by `,` then these new records.

- [ ] **Step 2: Validate**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
const h = JSON.parse(require('fs').readFileSync('prisma/seed/genesis-io-habits.json','utf-8'));
console.log('records:', h.length);
const last10 = h.slice(-10).map(x => x.name);
console.log('last 10:', last10);
const dupes = h.map(x=>x.name).filter((n,i,a)=>a.indexOf(n)!==i);
if (dupes.length) { console.log('DUPLICATES:', dupes); process.exit(1); }
console.log('OK');
"
```

Expected: `records: 102`, last 10 = the new ones, `OK`.

- [ ] **Step 3: Run seed**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-genesis-io-habits.js
```

Expected: `created=10, updated=92`. After: ~105 habits in DB.

- [ ] **Step 4: Idempotency**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-genesis-io-habits.js
```

Expected: `created=0, updated=102`.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/seed/genesis-io-habits.json && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(seed): 10 additional OfficialHabit for future flower templates"
```

---

### Task 12: Dashboard typeKey-aware CTA (placeholder mode)

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`

- [ ] **Step 1: Add CTA above daily view content**

In `MainApp.jsx`, near where dashboard content renders for the `'daily'` view, add a typeKey-aware banner. Find the section that shows `今日健康分數` / `本週目標` / `連續紀錄` cards (look for those Chinese strings).

Add this banner above them:

```jsx
{user?.typeKey && (() => {
  const { USER_TYPE_PROFILES } = require('@/lib/typeKeys');
  const profile = USER_TYPE_PROFILES[user.typeKey];
  if (!profile) return null;
  return (
    <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-100 rounded-2xl p-4 mb-4">
      <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">為你準備的小課程</p>
      <h3 className="text-lg font-black text-gray-800 mt-1">{profile.label}小課程</h3>
      <p className="text-xs text-gray-500 mt-1">根據你的問卷結果量身打造（即將上線）</p>
      <button
        type="button"
        disabled
        className="mt-3 px-4 py-2 rounded-xl bg-rose-200 text-rose-700 text-sm font-bold cursor-not-allowed opacity-70"
      >
        即將上線
      </button>
    </div>
  );
})()}
```

Move the `require` to a top-level `import` instead if possible:

At the top of `MainApp.jsx`:
```jsx
import { USER_TYPE_PROFILES } from '@/lib/typeKeys';
```

Then in the JSX:
```jsx
{user?.typeKey && USER_TYPE_PROFILES[user.typeKey] && (
  <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-100 rounded-2xl p-4 mb-4">
    <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">為你準備的小課程</p>
    <h3 className="text-lg font-black text-gray-800 mt-1">{USER_TYPE_PROFILES[user.typeKey].label}小課程</h3>
    <p className="text-xs text-gray-500 mt-1">根據你的問卷結果量身打造（即將上線）</p>
    <button
      type="button"
      disabled
      className="mt-3 px-4 py-2 rounded-xl bg-rose-200 text-rose-700 text-sm font-bold cursor-not-allowed opacity-70"
    >
      即將上線
    </button>
  </div>
)}
```

- [ ] **Step 2: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -5
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): typeKey-aware dashboard CTA placeholder (即將上線)"
```

---

### Task 13: TemplateExplorer — filter by typeKey when set

**Files:**
- Modify: `web-app/src/components/TemplateExplorer.jsx`

- [ ] **Step 1: Read existing fetch**

Open `web-app/src/components/TemplateExplorer.jsx`. It currently fetches `/api/templates/public` and shows all templates.

- [ ] **Step 2: Accept userTypeKey prop and filter client-side**

Change the component signature:

```jsx
const TemplateExplorer = ({ isOpen, onClose, userId, onJoin, userTypeKey = null }) => {
```

After templates are fetched, filter by typeKey when set:

```jsx
const visibleTemplates = (() => {
    if (!userTypeKey) return templates;
    return templates.filter(t => t.category === userTypeKey);
})();
```

Replace existing `templates.map(...)` with `visibleTemplates.map(...)`.

If `visibleTemplates.length === 0` and `userTypeKey` is set, show fallback:
```jsx
{visibleTemplates.length === 0 && userTypeKey ? (
    <p className="text-sm text-gray-500 text-center py-6">尚未有適合你類型的小課程</p>
) : visibleTemplates.map(t => (/* existing card */))}
```

- [ ] **Step 3: Wire MainApp to pass userTypeKey**

In `web-app/src/components/MainApp.jsx`, find the `<TemplateExplorer ... />` usage and add:

```jsx
userTypeKey={user?.typeKey || null}
```

- [ ] **Step 4: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -5
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TemplateExplorer.jsx web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TemplateExplorer filters by user.typeKey when set"
```

---

### Task 14: Menstrual mode toggle + 5-day expiry check

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`
- Create: `web-app/src/app/api/user/menstrual/route.js`

Lightweight implementation: a toggle on dashboard that sets `Assignment.isMenstrual` + `menstrualStart` on all active assignments. Doesn't yet trigger task creation (that's gated on Chunk 3).

- [ ] **Step 1: API endpoint**

```js
// src/app/api/user/menstrual/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/user/menstrual { userId, isMenstrual }
// Toggles isMenstrual + menstrualStart on all active Assignment for the user.
export async function POST(request) {
    try {
        const { userId, isMenstrual } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const now = new Date();
        if (isMenstrual) {
            await prisma.assignment.updateMany({
                where: { userId, status: 'active' },
                data: { isMenstrual: true, menstrualStart: now },
            });
        } else {
            await prisma.assignment.updateMany({
                where: { userId, status: 'active' },
                data: { isMenstrual: false, menstrualStart: null },
            });
        }

        const assignments = await prisma.assignment.findMany({
            where: { userId, status: 'active' },
            select: { id: true, isMenstrual: true, menstrualStart: true },
        });
        return NextResponse.json({ assignments });
    } catch (error) {
        console.error('Menstrual toggle error:', error);
        return NextResponse.json({ error: 'Failed to toggle' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Dashboard toggle UI**

In `web-app/src/components/MainApp.jsx`, add state + UI for the menstrual toggle. Add state near other UI flags:

```jsx
const [isMenstrualMode, setIsMenstrualMode] = useState(false);
const [menstrualStart, setMenstrualStart] = useState(null);
```

In the `fetchTasks` / `fetchAssignments` flow, derive these from response:

After `setAssignments(data)` in `fetchAssignments`:
```jsx
const anyActive = (data || []).find(a => a.isMenstrual);
setIsMenstrualMode(Boolean(anyActive));
setMenstrualStart(anyActive?.menstrualStart || null);
```

Add a toggle handler:
```jsx
const handleToggleMenstrual = async (next) => {
    if (!user?.id) return;
    setIsMenstrualMode(next);
    if (next) setMenstrualStart(new Date().toISOString());
    else setMenstrualStart(null);
    try {
        await fetch('/api/user/menstrual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, isMenstrual: next }),
        });
    } catch (e) {
        console.error('Menstrual toggle failed', e);
    }
};

const menstrualExpired = (() => {
    if (!isMenstrualMode || !menstrualStart) return false;
    const startDate = new Date(menstrualStart);
    const days = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return days > 5;
})();
```

In the dashboard daily view (above CTA from Task 12), add a small toggle:

```jsx
<div className="flex items-center justify-between gap-2 mb-3 px-1">
    <span className="text-sm text-gray-600">{isMenstrualMode ? (menstrualExpired ? '生理期模式（超過 5 天）' : '生理期模式進行中') : '生理期模式'}</span>
    <button
        type="button"
        onClick={() => handleToggleMenstrual(!isMenstrualMode)}
        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
            isMenstrualMode
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
    >
        {isMenstrualMode ? '結束生理期' : '我正在生理期'}
    </button>
</div>
```

- [ ] **Step 3: Run tests**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -5
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/app/api/user/menstrual web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): menstrual mode toggle + 5-day expiry check"
```

---

### Task 15: Chunk 2 browser smoke + merge

Manual verification + commit-free.

- [ ] **Step 1: Start preview server**

`Habitnext Dev` config.

- [ ] **Step 2: Set test user typeKey + walk**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
require('./scripts/lib/env');
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('SliceEGtest', 10);
  const u = await p.user.upsert({
    where: { phone: '0900000004' },
    update: { password: hash, typeKey: 'sunflower', isActive: true },
    create: { nickname: 'SliceEGtest', phone: '0900000004', countryCode: '+886', password: hash, typeKey: 'sunflower', isActive: true }
  });
  console.log('user:', u.id, 'typeKey:', u.typeKey);
  await p.\$disconnect();
})();
"
```

Login → dashboard → verify:
- 「向日葵型小課程」banner with 「即將上線」disabled button shows
- 「生理期模式」toggle exists; clicking 「我正在生理期」turns it on
- Going through 探索習慣 flow → identity step works with 「⭐ 推薦：我是個照顧代謝健康的人」

- [ ] **Step 3: Cleanup test user**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
require('./scripts/lib/env');
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.delete({ where: { phone: '0900000004' } }).then(u => console.log('deleted', u.id)).catch(e => console.error(e.message)).finally(() => p.\$disconnect());
"
```

- [ ] **Step 4: Merge to main + push**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git checkout main && git merge --ff-only feat/slice-e-g-identity-and-women-templates && git push origin main
```

Vercel auto-deploys.

---

## Chunk 3 — Slice G content (DEFERRED, gated on colleague)

**Do not execute until colleague confirms:**
- Accumulate vs Replace (L1→L4 task model)
- Expanded 生理期 task list per type
- 雛菊型 water-path methodology unification

Once received, the work is:

- Create 4 `Template` records (daisy / rose / orchid / sunflower) in DB. Best done as a seed script: `web-app/scripts/seed-women-templates.js` reads from `web-app/prisma/seed/women-templates.json`.
- Each Template's `tasks` JSON contains 4 phases (L1-L4) with `days` per phase (likely 7 each) plus `menstrualPhase` add-on.
- Each phase task references an OfficialHabit by name (now 102 available), with `defaultCue` + `defaultIdentity` metadata.
- Dashboard CTA from Task 12 switches from `即將上線` (disabled) to active join button → opens filtered TemplateExplorer.
- Menstrual toggle from Task 14 extends to materialize `menstrualPhase.tasks` as live Task records (5-day auto-archive via client-side check).
- End-to-end QA pass for each of the 4 types.

Estimate 4-5 implementation tasks once content lands. Will be filed as a new plan or appended here.

---

## Self-Review Notes

**Spec coverage:**
- Spec §3 合約 (User.typeKey + Template.tasks JSON extensions): Task 1 (typeKey), Task 11 (OfficialHabit prep), deferred to Chunk 3 for template tasks JSON
- Spec §4 Slice E full design: Task 1 (schema), Task 2 (helper lib), Task 3 (picker), Task 4 (modal 4-view), Task 5 (form), Task 6 (display), Task 7 (API + wiring), Task 8 (smoke)
- Spec §5 Slice G design: Task 9 (schema), Task 10 (spike), Task 11 (OfficialHabit seed), Task 12 (CTA placeholder), Task 13 (TemplateExplorer filter), Task 14 (menstrual toggle), Chunk 3 deferred for templates seed
- Spec §6 拆解 (3 chunks): plan organised by chunk
- Spec §7 風險: Task 10 spike addresses phase-rollover unknown; other risks structurally mitigated by chunk-1-independent-of-content design
- Spec §8 驗收: Tasks 8 and 15 cover chunk-by-chunk acceptance

**Placeholder scan:** No "TBD" / "TODO". All code blocks complete. All commands have expected output.

**Type consistency:** `Task.identity`, `User.typeKey`, `Assignment.isMenstrual`, `Assignment.menstrualStart` consistent. `IdentityPicker` props `(value, onChange, userTypeKey)` consistent across uses. `deriveDefaultIdentity` signature consistent.

**Engineering flexibility kept:**
- Spike (Task 10) outcome may add a remediation task — explicit pivot point documented
- CTA in Chunk 2 is intentionally placeholder; Chunk 3 will switch behavior
- Slug values `daisy/rose/orchid/sunflower` documented but treated as "current assumption" with quiz module owner — easy to find-replace if changes
- Menstrual auto-archive uses client-side check (lightweight) instead of cron (cron is documented as out-of-scope follow-up)
