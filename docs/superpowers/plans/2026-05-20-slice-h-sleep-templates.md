# Slice H — 14-day Sleep Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `User.sleepTypeKey` second typing dimension, seed 4 sleep-program Templates (14-day, 4-phase), and surface dual CTAs on dashboard (flower + sleep).

**Architecture:** Mirror Slice G Chunk 3 pattern — separate typeKey field per typing dimension, lib file with `SLEEP_TYPE_PROFILES`, seed JSON + script. Reuse existing Template/Phase/Assignment infra (already validated by Slice G phase rollover spike). TemplateExplorer filter extended to 3-layer (flower + sleep + other).

**Tech Stack:** Prisma 5 + Vercel Postgres, Next.js 14 App Router, React 18, Tailwind, lucide-react.

**Spec:** [`docs/superpowers/specs/2026-05-20-slice-h-sleep-templates-design.md`](../specs/2026-05-20-slice-h-sleep-templates-design.md)
**Colleague feedback (parallel):** [`docs/notes/2026-05-20-sleep-course-content-feedback.md`](../../notes/2026-05-20-sleep-course-content-feedback.md)

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/src/lib/sleepTypeKeys.js` | `SLEEP_TYPE_PROFILES` (4 sleep types) + helpers |
| `web-app/src/__tests__/lib/sleepTypeKeys.test.js` | Unit tests (TDD) |
| `web-app/prisma/seed/sleep-templates.json` | 4 sleep Template records |
| `web-app/scripts/seed-sleep-templates.js` | Idempotent seed |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | Add `User.sleepTypeKey String?` |
| `web-app/src/components/explore/LUCIDE_ICONS.js` | Add Brain / Sunrise / Apple / Thermometer + Moon |
| `web-app/src/components/MainApp.jsx` | Sleep CTA + flower CTA refactor (hasJoinedFlowerTemplate vs hasJoinedAnyTemplate) + pass userSleepTypeKey prop |
| `web-app/src/components/TemplateExplorer.jsx` | 3-layer filter (flower + sleep + other) + accept userSleepTypeKey prop |

---

## Task 1: Schema — `User.sleepTypeKey`

**Files:**
- Modify: `web-app/prisma/schema.prisma`

- [ ] **Step 1: Add field**

In `web-app/prisma/schema.prisma`, find `model User { ... }`. Add `sleepTypeKey String?` after `typeKey`:

```prisma
model User {
  id          String       @id @default(cuid())
  nickname    String
  phone       String       @unique
  countryCode String?
  password    String?
  email       String?
  typeKey     String?      // 既有 — 'daisy' | 'rose' | 'orchid' | 'sunflower'
  sleepTypeKey String?     // ★ 新增 — 'stress' | 'rhythm' | 'metabolic' | 'hormone'
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  tasks       Task[]
  assignments Assignment[]
}
```

- [ ] **Step 2: Push schema**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && npx prisma db push
```

Expected ending: `Your database is now in sync with your Prisma schema.` (nullable column, no data-loss prompt).

- [ ] **Step 3: Verify**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.\$queryRaw\`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='User' AND column_name='sleepTypeKey'\`.then(r=>{console.log(JSON.stringify(r,null,2)); return p.\$disconnect();})"
```

Expected: 1 row, `data_type: 'text'`, `is_nullable: 'YES'`.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): User.sleepTypeKey for Slice H"
```

---

## Task 2: `sleepTypeKeys.js` lib + 4 Lucide icons

**Files:**
- Create: `web-app/src/lib/sleepTypeKeys.js`
- Create: `web-app/src/__tests__/lib/sleepTypeKeys.test.js`
- Modify: `web-app/src/components/explore/LUCIDE_ICONS.js`

### Step 1: Write failing tests

Create `web-app/src/__tests__/lib/sleepTypeKeys.test.js`:

```js
const {
  SLEEP_TYPE_PROFILES,
  deriveSleepTypeFromCategory,
  deriveSleepDefaultIdentity,
} = require('../../lib/sleepTypeKeys');

describe('SLEEP_TYPE_PROFILES', () => {
  it('has 4 sleep types with required fields', () => {
    expect(Object.keys(SLEEP_TYPE_PROFILES).sort()).toEqual(['hormone', 'metabolic', 'rhythm', 'stress']);
    for (const p of Object.values(SLEEP_TYPE_PROFILES)) {
      expect(typeof p.label).toBe('string');
      expect(typeof p.categorySlug).toBe('string');
      expect(p.categorySlug.startsWith('sleep_')).toBe(true);
      expect(typeof p.iconName).toBe('string');
      expect(typeof p.identity).toBe('string');
    }
  });

  it('uses sleep-specific identities', () => {
    expect(SLEEP_TYPE_PROFILES.stress.identity).toBe('我是個照顧大腦放鬆的人');
    expect(SLEEP_TYPE_PROFILES.rhythm.identity).toBe('我是個尊重生理節律的人');
    expect(SLEEP_TYPE_PROFILES.metabolic.identity).toBe('我是個照顧代謝健康的人');
    expect(SLEEP_TYPE_PROFILES.hormone.identity).toBe('我是個照顧週期身體的人');
  });
});

describe('deriveSleepTypeFromCategory', () => {
  it('extracts sleep type from sleep_<key> category strings', () => {
    expect(deriveSleepTypeFromCategory('sleep_stress')).toBe('stress');
    expect(deriveSleepTypeFromCategory('sleep_rhythm')).toBe('rhythm');
  });

  it('returns null for unknown / non-sleep categories', () => {
    expect(deriveSleepTypeFromCategory('daisy')).toBeNull();
    expect(deriveSleepTypeFromCategory('sleep_unknown')).toBeNull();
    expect(deriveSleepTypeFromCategory('')).toBeNull();
    expect(deriveSleepTypeFromCategory(null)).toBeNull();
    expect(deriveSleepTypeFromCategory(undefined)).toBeNull();
  });
});

describe('deriveSleepDefaultIdentity', () => {
  it('returns the type identity when sleepTypeKey matches', () => {
    expect(deriveSleepDefaultIdentity('stress')).toBe('我是個照顧大腦放鬆的人');
    expect(deriveSleepDefaultIdentity('hormone')).toBe('我是個照顧週期身體的人');
  });

  it('returns null for unknown / null', () => {
    expect(deriveSleepDefaultIdentity(null)).toBeNull();
    expect(deriveSleepDefaultIdentity(undefined)).toBeNull();
    expect(deriveSleepDefaultIdentity('UNKNOWN')).toBeNull();
  });
});
```

### Step 2: Run test, verify FAIL

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/sleepTypeKeys.test.js
```

Expected: `Cannot find module '../../lib/sleepTypeKeys'`.

### Step 3: Implement `sleepTypeKeys.js`

Create `web-app/src/lib/sleepTypeKeys.js`:

```js
// src/lib/sleepTypeKeys.js
// Profile metadata for the 4 sleep-typing categories.
// `sleepTypeKey` lives on User.sleepTypeKey, set externally by the
// sleep quiz module (parallel to User.typeKey for women's flowers).
// Identity strings are per-type defaults — users can override per task.

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
    identity: '我是個照顧代謝健康的人',  // 跟向日葵型小課程相通
  },
  hormone: {
    label: '荷爾蒙波動型',
    categorySlug: 'sleep_hormone',
    iconName: 'Thermometer',
    identity: '我是個照顧週期身體的人',  // 跟玫瑰型小課程相通
  },
};

function deriveSleepTypeFromCategory(category) {
  if (!category || typeof category !== 'string') return null;
  if (!category.startsWith('sleep_')) return null;
  const key = category.slice('sleep_'.length);
  return key in SLEEP_TYPE_PROFILES ? key : null;
}

function deriveSleepDefaultIdentity(sleepTypeKey) {
  if (!sleepTypeKey) return null;
  const profile = SLEEP_TYPE_PROFILES[sleepTypeKey];
  return profile ? profile.identity : null;
}

module.exports = {
  SLEEP_TYPE_PROFILES,
  deriveSleepTypeFromCategory,
  deriveSleepDefaultIdentity,
};
```

### Step 4: Run tests, verify PASS

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/sleepTypeKeys.test.js
```

Expected: 7 tests pass.

### Step 5: Add 4 Lucide icons to whitelist

Open `web-app/src/components/explore/LUCIDE_ICONS.js`. The existing `LUCIDE_ICON_MAP` has 10 icons. Add 5 more (4 for sleep types + 1 Moon for sleep CTA):

```js
import {
  Dna,
  Leaf,
  Utensils,
  Dumbbell,
  Moon,
  Users,
  Sparkles,
  BrainCircuit,
  Briefcase,
  Tag,
  // ★ Slice H additions
  Brain,
  Sunrise,
  Apple,
  Thermometer,
} from 'lucide-react';

export const LUCIDE_ICON_MAP = {
  Dna,
  Leaf,
  Utensils,
  Dumbbell,
  Moon,
  Users,
  Sparkles,
  BrainCircuit,
  Briefcase,
  Tag,
  Brain,
  Sunrise,
  Apple,
  Thermometer,
};
```

`Moon` is already in the map (used by 壓力與睡眠 category) — no addition needed.

Verify the 4 new icons exist in lucide-react:

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "const L=require('lucide-react'); ['Brain','Sunrise','Apple','Thermometer'].forEach(n => console.log(n, L[n] ? 'OK' : 'MISSING'))"
```

Expected: all 4 print `OK`.

### Step 6: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/sleepTypeKeys.js web-app/src/__tests__/lib/sleepTypeKeys.test.js web-app/src/components/explore/LUCIDE_ICONS.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(lib): sleepTypeKeys with per-type identity + 4 Lucide icons (Brain/Sunrise/Apple/Thermometer)"
```

---

## Task 3: TemplateExplorer 3-layer filter

**Files:**
- Modify: `web-app/src/components/TemplateExplorer.jsx`
- Modify: `web-app/src/components/MainApp.jsx`

### Step 1: Read existing filter

Open `web-app/src/components/TemplateExplorer.jsx`. The filter from Slice G Task 13 looks like:

```jsx
const visibleTemplates = (() => {
    if (!userTypeKey) return templates;
    return templates.filter(t => t.category === userTypeKey);
})();
```

### Step 2: Accept `userSleepTypeKey` prop + extend filter

Change component signature:

```jsx
const TemplateExplorer = ({ isOpen, onClose, userId, onJoin, userTypeKey = null, userSleepTypeKey = null }) => {
```

Replace the filter logic with the 3-layer version:

```jsx
const FLOWER_TYPES = new Set(['daisy', 'rose', 'orchid', 'sunflower']);
const SLEEP_CATEGORIES = new Set(['sleep_stress', 'sleep_rhythm', 'sleep_metabolic', 'sleep_hormone']);

const visibleTemplates = templates.filter(t => {
    if (FLOWER_TYPES.has(t.category)) {
        return t.category === userTypeKey;
    }
    if (SLEEP_CATEGORIES.has(t.category)) {
        return userSleepTypeKey && t.category === `sleep_${userSleepTypeKey}`;
    }
    return true; // other public templates (e.g. 健康計劃30天)
});
```

The `[visibleTemplates.length === 0 && userTypeKey]` fallback message from Slice G needs widening. Replace it with:

```jsx
{visibleTemplates.length === 0 && (userTypeKey || userSleepTypeKey) ? (
    <p className="text-sm text-gray-500 text-center py-6">尚未有適合你類型的計畫</p>
) : visibleTemplates.map(t => (
    // existing template card JSX
))}
```

### Step 3: MainApp — pass `userSleepTypeKey` to TemplateExplorer

Open `web-app/src/components/MainApp.jsx`. Find the `<TemplateExplorer ... />` usage and add the new prop:

```jsx
<TemplateExplorer
    // existing props (isOpen, onClose, userId, onJoin, userTypeKey)
    userSleepTypeKey={user?.sleepTypeKey || null}      // ★ 新增
/>
```

### Step 4: Run tests

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all pass.

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TemplateExplorer.jsx web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TemplateExplorer 3-layer filter (flower + sleep + other)"
```

---

## Task 4: Dashboard sleep CTA + flower CTA refactor

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`

### Step 1: Add sleepTypeKeys import

At top of `MainApp.jsx`, near other lib imports:

```jsx
import { SLEEP_TYPE_PROFILES } from '@/lib/sleepTypeKeys';
```

### Step 2: Refactor flower CTA judgement

The existing flower CTA conditional uses `!hasJoinedAnyTemplate` (from Slice G Chunk 3 Task 19). Change to a more specific check:

Find the existing block:

```jsx
const hasJoinedAnyTemplate = (assignments || []).some(a => a.status === 'active');
```

Add a more specific check before this:

```jsx
const FLOWER_CATEGORIES = new Set(['daisy', 'rose', 'orchid', 'sunflower']);
const SLEEP_CATEGORIES = new Set(['sleep_stress', 'sleep_rhythm', 'sleep_metabolic', 'sleep_hormone']);

const hasJoinedFlowerTemplate = (() => {
    if (!user?.typeKey) return false;
    return (assignments || []).some(a =>
        a.status === 'active' &&
        a.template?.category === user.typeKey
    );
})();

const hasJoinedSleepTemplate = (() => {
    if (!user?.sleepTypeKey) return false;
    const target = `sleep_${user.sleepTypeKey}`;
    return (assignments || []).some(a =>
        a.status === 'active' &&
        a.template?.category === target
    );
})();
```

(Keep `hasJoinedAnyTemplate` if other code uses it; the new variables are additional.)

### Step 3: Update flower CTA conditional

Find the flower CTA block (from Slice G Chunk 3 Task 19) — replace `!hasJoinedAnyTemplate` with `!hasJoinedFlowerTemplate`:

```jsx
{user?.typeKey && USER_TYPE_PROFILES[user.typeKey] && !hasJoinedFlowerTemplate && (
    <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-100 rounded-2xl p-4 mb-4">
        {/* existing flower CTA inner content */}
    </div>
)}
```

### Step 4: Add sleep CTA after flower CTA

After the flower CTA `</div>` (and its closing `)}`), add the new sleep CTA:

```jsx
{user?.sleepTypeKey && SLEEP_TYPE_PROFILES[user.sleepTypeKey] && !hasJoinedSleepTemplate && (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 mb-4">
        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">為你準備的睡眠處方</p>
        <h3 className="text-lg font-black text-gray-800 mt-1">{SLEEP_TYPE_PROFILES[user.sleepTypeKey].label}睡眠處方</h3>
        <p className="text-xs text-gray-500 mt-1">14 天循序漸進，從 baby step 開始建立睡眠節奏</p>
        <button
            type="button"
            onClick={() => setIsTemplateExplorerOpen(true)}
            className="mt-3 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors"
        >
            查看睡眠處方 →
        </button>
    </div>
)}
```

Cooler color palette (indigo/purple) visually separates from flower CTA (rose/amber).

### Step 5: Run tests

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -8
```

Expected: all pass.

### Step 6: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): sleep CTA + refactor flower CTA judgement to hasJoinedFlowerTemplate"
```

---

## Task 5: Sleep templates seed JSON

**Files:**
- Create: `web-app/prisma/seed/sleep-templates.json`

This is the largest content task. The file contains 4 Template records, each with 4 phases (days `[3, 4, 3, 4]`) and 2 tasks per phase.

### Step 1: Write the JSON

Use the Write tool to create `web-app/prisma/seed/sleep-templates.json`. Structure: JSON array of 4 records.

**Template shape (apply to all 4)**:

```json
{
  "name": "<壓力/節律/代謝失衡/荷爾蒙波動>型睡眠處方",
  "description": "<long form description from sheet content>",
  "category": "sleep_<stress|rhythm|metabolic|hormone>",
  "isPublic": true,
  "startDateType": "user_choice",
  "tasks": {
    "version": "2.0",
    "phases": [
      { "id": "phase1", "name": "Phase 1 (Day 1-3) — Step 1 入門", "days": 3, "tasks": [/* 2 tasks */] },
      { "id": "phase2", "name": "Phase 2 (Day 4-7) — Step 2-3 漸進", "days": 4, "tasks": [/* 2 tasks */] },
      { "id": "phase3", "name": "Phase 3 (Day 8-10) — Step Final 完整", "days": 3, "tasks": [/* 2 tasks */] },
      { "id": "phase4", "name": "Phase 4 (Day 11-14) — Maintain 維持", "days": 4, "tasks": [/* 2 tasks */] }
    ]
  }
}
```

**Each phase task shape**:

```json
{
  "title": "<short Chinese title>",
  "details": "<1-2 sentence rationale + safety note if relevant>",
  "type": "binary",
  "category": "壓力與睡眠",
  "dailyTarget": 1,
  "unit": "次",
  "stepValue": 1,
  "subtasks": [],
  "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 },
  "defaultCue": "<LIFE_MOMENTS label, e.g. 睡前躺上床後>",
  "defaultIdentity": "<the sleep type's identity from SLEEP_TYPE_PROFILES>"
}
```

For the supplement task, use checklist:

```json
{
  "title": "服用今日保健品",
  "details": "依時段服用 — <safety notes>",
  "type": "checklist",
  "category": "飲食",
  "dailyTarget": <subtask count>,
  "unit": "種",
  "stepValue": 1,
  "subtasks": [
    { "id": "<id>", "label": "<product + timing>", "addedAt": "2026-05-20" },
    ...
  ],
  "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 },
  "defaultCue": "起床後",
  "defaultIdentity": "<same as type>"
}
```

### Content per Template

**1. 壓力型睡眠處方** (`sleep_stress`, identity `我是個照顧大腦放鬆的人`)

Description: `"😵‍💫 壓力型：大腦過度活躍、交感神經過度亢奮，明明很累卻睡不著；睡前思緒停不下來、容易焦慮、多夢淺眠。本處方 14 天循序漸進建立數位宵禁，啟動副交感神經回到放鬆模式。"`

| Phase | Main task title | defaultCue |
|---|---|---|
| 1 | 睡前 15 分鐘不滑社群 | 睡前躺上床後 |
| 2 | 手機移出床邊，睡前 30 分鐘停止高刺激內容 | 睡前躺上床後 |
| 3 | 睡前 60 分鐘停止高刺激螢幕 | 睡前躺上床後 |
| 4 | 持續睡前 60 分鐘數位宵禁 + 觀察體感 | 睡前躺上床後 |

Supplement subtasks (same for all 4 phases):
- `{id: "l082_morning", label: "L082 早餐後 1 包"}`
- `{id: "l082_evening", label: "L082 晚餐後 1 包"}`

Supplement details: `"L082：早晚各一包；孕婦、哺乳婦不能吃"`

Phase 4 accelerator #1: `"下午 2 點後避免咖啡因飲品（咖啡、濃茶、能量飲）"` — defaultCue: `午餐後`, type binary

**2. 節律型睡眠處方** (`sleep_rhythm`, identity `我是個尊重生理節律的人`)

Description: `"🌙 節律型：生理時鐘延遲或混亂，不是睡不著，而是睡錯時間；晚睡晚起、週末補眠、作息不固定。本處方 14 天循序固定起床時間（最強 zeitgeber）。"`

| Phase | Main task title | defaultCue |
|---|---|---|
| 1 | 記錄目前實際起床時間 | 起床後 |
| 2 | 每天提前 15-30 分鐘調整 + 起床後立即離開床鋪 | 起床後 |
| 3 | 固定起床時間（誤差 ≤ 30 分鐘） | 起床後 |
| 4 | 持續固定起床 + 觀察體感 | 起床後 |

Supplement subtasks:
- `{id: "ginger_lunch", label: "極黑生薑黃 午餐後 2 顆"}`
- `{id: "bgroup_morning", label: "B 群 早上 1 顆"}`
- `{id: "sleeppack_bedtime", label: "晚安包 睡前 1 包"}`

Supplement details: `"極黑生薑黃午餐後、B 群早上、晚安包睡前；晚安包孕婦不能吃"`

Phase 4 accelerator #1: `"每天 10-20 分鐘晨間自然光照（陽台、戶外散步）"` — defaultCue: `起床後`, type binary

**3. 代謝失衡型睡眠處方** (`sleep_metabolic`, identity `我是個照顧代謝健康的人`)

Description: `"⏰ 代謝失衡型：夜間血糖波動、低血糖反應、胰島素阻抗導致半夜醒、睡眠不穩、醒來疲累。本處方 14 天建立穩糖晚餐結構（蛋白質 + 蔬菜 + 原型澱粉）。"`

| Phase | Main task title | defaultCue |
|---|---|---|
| 1 | 晚餐先加入 1 份蛋白質（蛋、豆腐、雞肉、魚） | 晚餐前 |
| 2 | 加入 1-2 份蔬菜 + 一部分白飯換原型澱粉 | 晚餐前 |
| 3 | 完整穩糖晚餐結構（蛋白質 + 蔬菜 + 原型澱粉） | 晚餐前 |
| 4 | 持續穩糖晚餐 + 觀察體感 | 晚餐前 |

Supplement subtasks (5 items):
- `{id: "bittermelon_before_meal", label: "苦瓜胜肽 每餐前 1 顆"}`
- `{id: "carnitine_morning", label: "肉鹼 早上 2 顆"}`
- `{id: "bgroup_morning", label: "B 群 早上 2 顆"}`
- `{id: "chitosan_dinner", label: "甲殼素 晚餐前 1 顆"}`
- `{id: "magnesium_bedtime", label: "鎂 睡前 1 顆"}`

Supplement details: `"苦瓜胜肽（孕婦忌食）/ 肉鹼 / B 群 / 甲殼素（孕婦、哺乳婦禁食）/ 鎂"`

Phase 4 accelerator #1: `"固定三餐時間（間隔 3-5 小時）"` — defaultCue: `午餐前`, type binary

**4. 荷爾蒙波動型睡眠處方** (`sleep_hormone`, identity `我是個照顧週期身體的人`)

Description: `"🔄 荷爾蒙波動型：荷爾蒙波動影響體溫調節、情緒與睡眠深度；常見於經前、更年期、產後。本處方 14 天透過睡前環境調整降低熱醒與不適。"`

| Phase | Main task title | defaultCue |
|---|---|---|
| 1 | 調整睡衣材質（避免過厚 / 不透氣） | 睡前躺上床後 |
| 2 | 調整棉被厚度或寢具材質 + 優化通風 | 睡前躺上床後 |
| 3 | 完整睡前環境調整（室溫 + 衣物 + 寢具） | 睡前躺上床後 |
| 4 | 持續環境管理 + 觀察體感 | 睡前躺上床後 |

Supplement subtasks (5 items):
- `{id: "folate_iron_morning", label: "活性葉酸鐵 早上餐前 1 小時 1 顆"}`
- `{id: "bgroup_morning", label: "B 群 早上 2 顆"}`
- `{id: "ginger_lunch", label: "極黑生薑黃 午餐後 2 顆"}`
- `{id: "fishoil_dinner", label: "魚油 晚餐後 2 顆"}`
- `{id: "magnesium_bedtime", label: "鎂 睡前 1 顆"}`

Supplement details: `"活性葉酸鐵 / B 群 / 極黑生薑黃 / 魚油（孕婦、哺乳婦禁食 — 同事 typo 修正）/ 鎂"`

Phase 4 accelerator #1: `"每天 20-30 分鐘輕中度活動（散步、瑜伽、伸展）"` — defaultCue: `下班離開工作場所後`, type binary

### Step 2: Validate

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
const t = JSON.parse(require('fs').readFileSync('prisma/seed/sleep-templates.json','utf-8'));
console.log('templates:', t.length);
const cats = t.map(x => x.category).sort();
console.log('categories:', cats.join(','));
if (cats.join(',') !== 'sleep_hormone,sleep_metabolic,sleep_rhythm,sleep_stress') { console.log('BAD'); process.exit(1); }
t.forEach(tmpl => {
  const phases = tmpl.tasks.phases;
  const taskCounts = phases.map(p => p.tasks.length).join('/');
  const dayCounts = phases.map(p => p.days).join('+');
  console.log(' ', tmpl.name, '| phases:', phases.length, '| days:', dayCounts, '| tasks:', taskCounts);
});
let identityMissing = 0;
let cueMissing = 0;
t.forEach(tmpl => {
  for (const phase of tmpl.tasks.phases) {
    for (const task of phase.tasks) {
      if (!task.defaultIdentity) identityMissing++;
      if (!task.defaultCue) cueMissing++;
    }
  }
});
if (identityMissing || cueMissing) { console.log('MISSING — identity:', identityMissing, 'cue:', cueMissing); process.exit(1); }
console.log('OK');
"
```

Expected output:
```
templates: 4
categories: sleep_hormone,sleep_metabolic,sleep_rhythm,sleep_stress
  壓力型睡眠處方 | phases: 4 | days: 3+4+3+4 | tasks: 2/2/2/2
  ...
OK
```

### Step 3: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/seed/sleep-templates.json && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(seed): 4 sleep templates (14-day, 4-phase) with per-type identity"
```

---

## Task 6: Seed script + run

**Files:**
- Create: `web-app/scripts/seed-sleep-templates.js`

### Step 1: Implement seed script

```js
// scripts/seed-sleep-templates.js
// Idempotently seeds the 4 sleep Templates (sleep_<type>).
// Usage: node scripts/seed-sleep-templates.js (run from web-app/)

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'sleep-templates.json');
  const templates = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Find or create system sleep-course expert
  const expertEmail = 'system-sleep-course@habitnext.app';
  let expert = await prisma.expert.findFirst({ where: { email: expertEmail } });
  if (!expert) {
    expert = await prisma.expert.create({
      data: {
        name: 'HabitNext 系統 · 睡眠',
        email: expertEmail,
        password: 'unused',
        title: '系統內建',
        isActive: true,
        isApproved: true,
      },
    });
    console.log('Created system sleep expert:', expert.id);
  } else {
    console.log('Using existing system sleep expert:', expert.id);
  }

  const beforeCount = await prisma.template.count();
  console.log(`Before: ${beforeCount} templates in DB`);

  let created = 0;
  let updated = 0;
  for (const t of templates) {
    const existing = await prisma.template.findFirst({
      where: { expertId: expert.id, name: t.name },
    });
    const data = {
      expertId: expert.id,
      name: t.name,
      description: t.description ?? null,
      category: t.category,
      isPublic: t.isPublic ?? true,
      startDateType: t.startDateType ?? 'user_choice',
      tasks: t.tasks,
    };
    if (existing) {
      await prisma.template.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.template.create({ data });
      created++;
    }
  }

  const afterCount = await prisma.template.count();
  console.log(`Seeded sleep templates: created=${created}, updated=${updated}`);
  console.log(`After: ${afterCount} templates in DB`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

### Step 2: First run

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-sleep-templates.js
```

Expected: `created=4, updated=0`. After: 9 templates (5 existing + 4 new sleep).

### Step 3: Idempotency

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-sleep-templates.js
```

Expected: `created=0, updated=4`.

### Step 4: Verify

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.template.findMany({ where: { category: { startsWith: 'sleep_' } }, select: { name: true, category: true } }).then(r => { r.forEach(t => console.log(' -', t.name, '|', t.category)); return p.\$disconnect(); })"
```

Expected: 4 rows, all categories starting with `sleep_`.

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/scripts/seed-sleep-templates.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(scripts): idempotent seed of 4 sleep templates"
```

---

## Task 7: Browser smoke + merge + push

Manual verification + git ops.

### Step 1: Start preview server

Use `Habitnext Dev` launch config.

### Step 2: Create test user with both typings

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
require('./scripts/lib/env');
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('SliceHtest', 10);
  const u = await p.user.upsert({
    where: { phone: '0900000007' },
    update: { password: hash, typeKey: 'rose', sleepTypeKey: 'stress', isActive: true },
    create: { nickname: 'SliceHtest', phone: '0900000007', countryCode: '+886', password: hash, typeKey: 'rose', sleepTypeKey: 'stress', isActive: true }
  });
  console.log('user:', u.id, 'typeKey:', u.typeKey, 'sleepTypeKey:', u.sleepTypeKey);
  await p.\$disconnect();
})();
"
```

### Step 3: Login + verify dual CTAs

Login as `0900000007` / `SliceHtest`. Verify:

- Dashboard shows **2 CTAs**: 「為你準備的小課程：玫瑰型」(rose/amber) + 「為你準備的睡眠處方：壓力型」(indigo/purple)
- Click sleep CTA → TemplateExplorer opens, showing 玫瑰型小課程 + 壓力型睡眠處方 + 健康計劃30天 (and no other flowers/sleep types)

### Step 4: Join sleep template + verify task creation

In TemplateExplorer, click 加入計畫 on 壓力型睡眠處方 → confirm 今天開始. Verify in DB:

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
require('./scripts/lib/env');
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { phone: '0900000007' } });
  const a = await p.assignment.findMany({ where: { userId: u.id }, include: { template: { select: { name: true, category: true } } } });
  console.log('assignments:', a.length);
  for (const x of a) {
    console.log(' -', x.template.name, '|', x.template.category, '| isActive:', x.status);
    const ts = await p.task.findMany({ where: { assignmentId: x.id }, orderBy: { date: 'asc' } });
    console.log('   tasks:', ts.length);
    ts.forEach(t => console.log('     ['+t.date+']', t.title, '| cue:', t.cue, '| identity:', t.identity));
  }
  await p.\$disconnect();
})();
"
```

Expected: 1 assignment of the sleep template, 8 tasks across 4 phases with cue and identity = '我是個照顧大腦放鬆的人'.

### Step 5: Verify sleep CTA hides after join

Back on dashboard, the sleep CTA should be gone (hasJoinedSleepTemplate=true), but the flower CTA remains (no flower template joined yet).

### Step 6: Cleanup test user + stop preview

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
require('./scripts/lib/env');
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.delete({ where: { phone: '0900000007' } }).then(u => console.log('deleted', u.id)).catch(e => console.error(e.message)).finally(() => p.\$disconnect());
"
```

### Step 7: Merge + push

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git checkout main && git merge --ff-only feat/slice-h-sleep-templates && git push origin main
```

Vercel auto-deploys.

---

## Self-Review Notes

**Spec coverage:**
- Spec §3 (合約): Task 1 (sleepTypeKey schema)
- Spec §4 (資料模型 — sleepTypeKeys.js): Task 2
- Spec §4 (4 Lucide icons): Task 2 Step 5
- Spec §5 (Phase 結構): Task 5 (seed content)
- Spec §6 (Dashboard 雙 CTA + TemplateExplorer filter): Tasks 3, 4
- Spec §10 (驗收條件 1-10): Tasks 1, 2, 5, 6 cover schema/seed; Task 7 covers UI/end-to-end

**Placeholder scan:** No "TBD". All commands include expected output. Each Template's content is concretely specified in Task 5.

**Type consistency:** `User.sleepTypeKey`, `sleepTypeKeys.js`, `SLEEP_TYPE_PROFILES`, `deriveSleepTypeFromCategory`, `deriveSleepDefaultIdentity` consistent. `sleep_<key>` category prefix consistent.

**Engineering flexibility preserved:**
- Per-type identity choice is in seed JSON only — can be overridden per-task later
- Slug values documented as "current assumption" with quiz module owner
- Sleep CTA color (indigo/purple) is a content choice, not architectural
