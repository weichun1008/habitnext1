# Slice A — GENESIS+IO 探索習慣 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure habitnext1's habit-exploration entry to 9 standard GENESIS+IO categories with a 3×3 card grid, while preserving existing OfficialHabit / difficulty / add-to-tracker downstream flow.

**Architecture:** Add a nullable `icon` field to `HabitCategory`. Seed 9 standard categories (idempotent upsert by name). Migrate existing `OfficialHabit.category` strings via a checked-in mapping JSON. Refactor `TaskLibraryModal` into a 2-view modal (Domain Grid → Habit List). Add Lucide icon picker to admin category form. No new API endpoint.

**Tech Stack:** Next.js 14 App Router, Prisma 5 + Vercel Postgres, React 18, Tailwind CSS, lucide-react, Jest + React Testing Library.

**Spec:** [`docs/superpowers/specs/2026-05-15-explore-habits-slice-a-genesis-io-design.md`](../specs/2026-05-15-explore-habits-slice-a-genesis-io-design.md)

**Important deviation from spec:** `HabitCategory.color` already stores hex (`#10B981`), not Tailwind token names. Seed will use hex matching Tailwind-500 palette; rendering reads hex directly.

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/prisma/seed/genesis-io.json` | 9 GENESIS+IO category records |
| `web-app/prisma/seed/category-migration.json` | Old-category → standard mapping table |
| `web-app/scripts/audit-categories.js` | Read-only DB report of current categories |
| `web-app/scripts/seed-genesis-io.js` | Idempotent upsert of 9 standard categories |
| `web-app/scripts/migrate-categories.js` | Apply mapping to OfficialHabit.category |
| `web-app/scripts/lib/category-resolver.js` | Pure logic for resolving target category (testable without DB) |
| `web-app/src/__tests__/scripts/category-resolver.test.js` | Unit test for pure resolver |
| `web-app/src/components/explore/DomainGrid.jsx` | 3×3 GENESIS+IO entry view |
| `web-app/src/components/explore/HabitListView.jsx` | Habit cards filtered by chosen domain |
| `web-app/src/components/explore/CategoryIcon.jsx` | Maps `icon` string → Lucide component |
| `web-app/src/components/explore/LUCIDE_ICONS.js` | Whitelist of Lucide icon names |
| `web-app/src/__tests__/components/DomainGrid.test.jsx` | RTL render test for grid |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma:144-151` | Add `icon String?` to `HabitCategory` |
| `web-app/src/app/api/habits/route.js:42-45` | Include `icon` in categories response |
| `web-app/src/app/api/admin/categories/route.js:21,33-39` | Accept + persist `icon` on POST |
| `web-app/src/app/api/admin/categories/[id]/route.js:9,12-14` | Accept + persist `icon` on PUT |
| `web-app/src/app/admin/dashboard/habits/categories/page.js` | Icon select in create/edit form |
| `web-app/src/components/TaskLibraryModal.jsx` | View-state machine, render DomainGrid or HabitListView |

---

## Task 1: Prisma — add `icon` field to `HabitCategory`

**Files:**
- Modify: `web-app/prisma/schema.prisma:144-151`

- [ ] **Step 1: Update schema**

```prisma
model HabitCategory {
  id        String   @id @default(cuid())
  name      String   @unique
  color     String?  // Hex color for UI
  order     Int      @default(0)
  icon      String?  // Lucide icon name (e.g. "Dna", "Leaf")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Generate migration**

Run from `web-app/`:
```bash
npx prisma migrate dev --name add_habit_category_icon
```
Expected: new file `prisma/migrations/<timestamp>_add_habit_category_icon/migration.sql` containing `ALTER TABLE "HabitCategory" ADD COLUMN "icon" TEXT;`

- [ ] **Step 3: Verify Prisma client regenerated**

`prisma migrate dev` auto-regenerates the client. Confirm by inspecting `node_modules/@prisma/client/index.d.ts` or simply running `npx prisma generate`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add HabitCategory.icon for Lucide icon name"
```

---

## Task 2: Seed data file — 9 GENESIS+IO categories

**Files:**
- Create: `web-app/prisma/seed/genesis-io.json`

- [ ] **Step 1: Create seed data file**

```json
[
  { "name": "基因與腸道", "order": 1, "icon": "Dna",          "color": "#6366F1" },
  { "name": "環境",       "order": 2, "icon": "Leaf",         "color": "#10B981" },
  { "name": "飲食",       "order": 3, "icon": "Utensils",     "color": "#F97316" },
  { "name": "運動",       "order": 4, "icon": "Dumbbell",     "color": "#EF4444" },
  { "name": "壓力與睡眠", "order": 5, "icon": "Moon",         "color": "#8B5CF6" },
  { "name": "社交互動",   "order": 6, "icon": "Users",        "color": "#F43F5E" },
  { "name": "心靈",       "order": 7, "icon": "Sparkles",     "color": "#0EA5E9" },
  { "name": "認知與智慧", "order": 8, "icon": "BrainCircuit", "color": "#3B82F6" },
  { "name": "職涯與平衡", "order": 9, "icon": "Briefcase",    "color": "#64748B" }
]
```

- [ ] **Step 2: Commit**

```bash
git add prisma/seed/genesis-io.json
git commit -m "feat(seed): GENESIS+IO 9 standard categories data"
```

---

## Task 3: Audit script (read-only)

**Files:**
- Create: `web-app/scripts/audit-categories.js`

- [ ] **Step 1: Implement audit script**

```js
// scripts/audit-categories.js
// Read-only report: shows existing HabitCategory rows and habit counts.
// Usage: node scripts/audit-categories.js

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const cats = await prisma.habitCategory.findMany({ orderBy: { order: 'asc' } });
  const habitCounts = await prisma.officialHabit.groupBy({
    by: ['category'],
    _count: { _all: true },
  });
  const countByName = new Map(habitCounts.map(h => [h.category, h._count._all]));

  console.log(`Existing HabitCategory rows (${cats.length}):`);
  for (const c of cats) {
    const count = countByName.get(c.name) || 0;
    console.log(`  • ${c.name}  (order=${c.order}, icon=${c.icon || '-'}, color=${c.color || '-'})  → ${count} habits`);
  }

  const known = new Set(cats.map(c => c.name));
  const orphans = habitCounts.filter(h => !known.has(h.category));
  if (orphans.length) {
    console.log('\nOfficialHabits referencing a category NOT in HabitCategory table:');
    for (const o of orphans) {
      console.log(`  • "${o.category}" → ${o._count._all} habits`);
    }
  } else {
    console.log('\nNo orphan habit categories.');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run audit against current DB**

```bash
node scripts/audit-categories.js
```
Expected: prints a list of current categories and habit counts. Output goes to your terminal — copy/paste the list of distinct categories somewhere; you'll need them to author `category-migration.json` in Task 4.

- [ ] **Step 3: Commit**

```bash
git add scripts/audit-categories.js
git commit -m "feat(scripts): audit-categories read-only report"
```

---

## Task 4: Category migration mapping JSON

**Files:**
- Create: `web-app/prisma/seed/category-migration.json`

- [ ] **Step 1: Create starter mapping file**

Authoring rule: every distinct category name found by Task 3's audit must map to one of the 9 standard names from `genesis-io.json`. The special key `_unmapped` is the fallback for any string not listed.

```json
{
  "_unmapped": "心靈",
  "_comment": "Map each old category name (key) to one of the 9 standard names (value). Run scripts/audit-categories.js to see current categories. _unmapped is the fallback. Edit before running migrate-categories.js."
}
```

> Add one line per category Task 3 surfaced. Example: `"健康": "飲食"`, `"運動": "運動"`. If the old name already equals a standard name, listing it as identity (`"運動": "運動"`) is fine and idempotent.

- [ ] **Step 2: Commit the template**

```bash
git add prisma/seed/category-migration.json
git commit -m "chore(seed): category-migration.json template"
```

---

## Task 5: Pure resolver library + test

**Files:**
- Create: `web-app/scripts/lib/category-resolver.js`
- Create: `web-app/src/__tests__/scripts/category-resolver.test.js`

- [ ] **Step 1: Write failing test**

```js
// src/__tests__/scripts/category-resolver.test.js
const { resolveTargetCategory } = require('../../../scripts/lib/category-resolver');

describe('resolveTargetCategory', () => {
  const stdNames = new Set(['基因與腸道', '環境', '飲食', '心靈']);
  const mapping = { '健康': '飲食', '運動舊': '環境', '_unmapped': '心靈' };

  it('uses explicit mapping when present', () => {
    expect(resolveTargetCategory('健康', mapping, stdNames)).toBe('飲食');
  });

  it('leaves already-standard categories unchanged', () => {
    expect(resolveTargetCategory('飲食', mapping, stdNames)).toBe('飲食');
  });

  it('falls back to _unmapped when neither matches', () => {
    expect(resolveTargetCategory('不存在的舊分類', mapping, stdNames)).toBe('心靈');
  });

  it('throws when mapping has no _unmapped fallback', () => {
    const bad = { '健康': '飲食' };
    expect(() => resolveTargetCategory('不存在', bad, stdNames)).toThrow(/_unmapped/);
  });

  it('throws when fallback is not a standard name', () => {
    const bad = { '_unmapped': '不是標準名' };
    expect(() => resolveTargetCategory('xxx', bad, stdNames)).toThrow(/standard/i);
  });

  it('respects explicit mapping even when key is already a standard name', () => {
    expect(resolveTargetCategory('飲食', { '飲食': '環境', '_unmapped': '心靈' }, stdNames)).toBe('環境');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd web-app && npx jest src/__tests__/scripts/category-resolver.test.js
```
Expected: FAIL (`Cannot find module '../../../scripts/lib/category-resolver'`).

- [ ] **Step 3: Implement the resolver**

```js
// scripts/lib/category-resolver.js

function resolveTargetCategory(currentCategory, mapping, stdNames) {
  const fallback = mapping._unmapped;
  if (!fallback) {
    throw new Error('category-migration.json must define a "_unmapped" fallback key');
  }
  if (!stdNames.has(fallback)) {
    throw new Error(`Fallback "${fallback}" is not a standard category. Run seed-genesis-io.js first or fix the mapping.`);
  }

  if (currentCategory in mapping && currentCategory !== '_unmapped' && currentCategory !== '_comment') {
    const target = mapping[currentCategory];
    if (!stdNames.has(target)) {
      throw new Error(`Mapping target "${target}" for "${currentCategory}" is not a standard category.`);
    }
    return target;
  }

  if (stdNames.has(currentCategory)) {
    return currentCategory;
  }

  return fallback;
}

module.exports = { resolveTargetCategory };
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd web-app && npx jest src/__tests__/scripts/category-resolver.test.js
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/category-resolver.js src/__tests__/scripts/category-resolver.test.js
git commit -m "feat(scripts): pure category-resolver with unit tests"
```

---

## Task 6: Seed script

**Files:**
- Create: `web-app/scripts/seed-genesis-io.js`

- [ ] **Step 1: Implement seed script**

```js
// scripts/seed-genesis-io.js
// Idempotently upserts the 9 GENESIS+IO standard categories.
// Usage: node scripts/seed-genesis-io.js

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'genesis-io.json');
  const categories = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let createdCount = 0;
  let updatedCount = 0;

  for (const c of categories) {
    const existing = await prisma.habitCategory.findUnique({ where: { name: c.name } });
    await prisma.habitCategory.upsert({
      where: { name: c.name },
      update: { order: c.order, icon: c.icon, color: c.color },
      create: { name: c.name, order: c.order, icon: c.icon, color: c.color },
    });
    if (existing) updatedCount++; else createdCount++;
  }

  console.log(`Seeded GENESIS+IO categories: created=${createdCount}, updated=${updatedCount}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run seed against dev DB**

```bash
node scripts/seed-genesis-io.js
```
Expected (first run): `created=9, updated=0` (or some mix if some standard names already exist).

- [ ] **Step 3: Run again to confirm idempotency**

```bash
node scripts/seed-genesis-io.js
```
Expected: `created=0, updated=9`. DB row count unchanged (verify with `node scripts/audit-categories.js`).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-genesis-io.js
git commit -m "feat(scripts): idempotent seed of GENESIS+IO categories"
```

---

## Task 7: Migration script

**Files:**
- Create: `web-app/scripts/migrate-categories.js`

- [ ] **Step 1: Implement migration script**

```js
// scripts/migrate-categories.js
// Re-maps OfficialHabit.category strings to the 9 standard category names
// using prisma/seed/category-migration.json. Idempotent.
// Usage: node scripts/migrate-categories.js [--dry-run]

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { resolveTargetCategory } = require('./lib/category-resolver');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();

  const stdPath = path.join(__dirname, '..', 'prisma', 'seed', 'genesis-io.json');
  const mappingPath = path.join(__dirname, '..', 'prisma', 'seed', 'category-migration.json');
  const standards = JSON.parse(fs.readFileSync(stdPath, 'utf-8'));
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
  const stdNames = new Set(standards.map(c => c.name));

  const dbCats = await prisma.habitCategory.findMany();
  const dbNames = new Set(dbCats.map(c => c.name));
  for (const n of stdNames) {
    if (!dbNames.has(n)) {
      throw new Error(`Standard category "${n}" not present in DB. Run seed-genesis-io.js first.`);
    }
  }

  const habits = await prisma.officialHabit.findMany({ select: { id: true, name: true, category: true } });
  let updated = 0;
  let unchanged = 0;
  const moves = [];

  for (const h of habits) {
    const target = resolveTargetCategory(h.category, mapping, stdNames);
    if (target === h.category) {
      unchanged++;
      continue;
    }
    moves.push({ id: h.id, name: h.name, from: h.category, to: target });
    if (!dryRun) {
      await prisma.officialHabit.update({ where: { id: h.id }, data: { category: target } });
    }
    updated++;
  }

  console.log(`\nMigration ${dryRun ? '(DRY RUN) ' : ''}summary:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  if (moves.length) {
    console.log('\nMoves:');
    for (const m of moves.slice(0, 50)) {
      console.log(`  • "${m.name}"  ${m.from}  →  ${m.to}`);
    }
    if (moves.length > 50) console.log(`  …and ${moves.length - 50} more`);
  }

  // Orphan categories: HabitCategory rows that are NOT one of the 9 standards.
  const leftover = dbCats.filter(c => !stdNames.has(c.name));
  if (leftover.length) {
    console.log(`\nNon-standard HabitCategory rows still in DB (not auto-deleted):`);
    for (const c of leftover) console.log(`  • ${c.name}`);
    console.log('Review and delete via /admin/dashboard/habits/categories if no longer needed.');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Pre-flight — fill in mapping**

Before running, complete `prisma/seed/category-migration.json` based on Task 3's audit output. Every distinct old name must either appear as a key or be covered by `_unmapped`.

- [ ] **Step 3: Dry run**

```bash
node scripts/migrate-categories.js --dry-run
```
Expected: prints planned moves and orphan list, but DB unchanged. Inspect the planned moves — anything surprising? Edit mapping JSON and re-run dry-run until happy.

- [ ] **Step 4: Run for real**

```bash
node scripts/migrate-categories.js
```
Expected: `Updated: N, Unchanged: M`. Re-run and confirm second run shows `Updated: 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-categories.js
git commit -m "feat(scripts): migrate OfficialHabit.category to GENESIS+IO standards"
```

---

## Task 8: API — return `icon` in categories

**Files:**
- Modify: `web-app/src/app/api/habits/route.js:42-45`
- Modify: `web-app/src/app/api/admin/categories/route.js`
- Modify: `web-app/src/app/api/admin/categories/[id]/route.js`

- [ ] **Step 1: Update public habits endpoint**

`web-app/src/app/api/habits/route.js` — change the category mapping at line 44:

```js
        // Also return categories for filtering
        return NextResponse.json({
            habits: sortedHabits,
            categories: categories.map(c => ({ id: c.id, name: c.name, color: c.color, order: c.order, icon: c.icon }))
        });
```

- [ ] **Step 2: Accept `icon` on admin POST**

`web-app/src/app/api/admin/categories/route.js` — at lines 21 and 33-39:

```js
        const body = await request.json();
        const { name, color, icon } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: '請輸入分類名稱' }, { status: 400 });
        }

        // Get max order
        const maxOrder = await prisma.habitCategory.findFirst({
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        const category = await prisma.habitCategory.create({
            data: {
                name: name.trim(),
                color: color || '#10B981',
                icon: icon || null,
                order: (maxOrder?.order ?? 0) + 1
            }
        });
```

- [ ] **Step 3: Accept `icon` on admin PUT**

`web-app/src/app/api/admin/categories/[id]/route.js` — at lines 9 and 12-14:

```js
        const body = await request.json();
        const { name, color, order, icon } = body;

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (color !== undefined) updateData.color = color;
        if (order !== undefined) updateData.order = order;
        if (icon !== undefined) updateData.icon = icon;
```

- [ ] **Step 4: Quick manual API smoke**

Start dev server in another terminal: `npm run dev`. Then:
```bash
curl http://localhost:3000/api/habits | python -m json.tool | head -40
```
Expected: each category object in `categories` array has an `icon` field (may be `null` for non-seeded, or e.g. `"Dna"` for seeded).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/habits/route.js src/app/api/admin/categories/
git commit -m "feat(api): include HabitCategory.icon in category responses"
```

---

## Task 9: Icon registry + CategoryIcon component

**Files:**
- Create: `web-app/src/components/explore/LUCIDE_ICONS.js`
- Create: `web-app/src/components/explore/CategoryIcon.jsx`

- [ ] **Step 1: Create icon whitelist**

```js
// src/components/explore/LUCIDE_ICONS.js
// Whitelist of Lucide icon names usable for HabitCategory.icon.
// Keep in sync with prisma/seed/genesis-io.json. Add more as needed.

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
};

export const FALLBACK_ICON = Tag;

export const SEEDED_ICON_NAMES = [
  'Dna', 'Leaf', 'Utensils', 'Dumbbell', 'Moon',
  'Users', 'Sparkles', 'BrainCircuit', 'Briefcase',
];
```

- [ ] **Step 2: Create CategoryIcon component**

```jsx
// src/components/explore/CategoryIcon.jsx
import React from 'react';
import { LUCIDE_ICON_MAP, FALLBACK_ICON } from './LUCIDE_ICONS';

export default function CategoryIcon({ name, size = 24, className = '', style }) {
  const Icon = (name && LUCIDE_ICON_MAP[name]) || FALLBACK_ICON;
  return <Icon size={size} className={className} style={style} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/explore/
git commit -m "feat(ui): CategoryIcon component + Lucide whitelist"
```

---

## Task 10: DomainGrid component + render test

**Files:**
- Create: `web-app/src/components/explore/DomainGrid.jsx`
- Create: `web-app/src/__tests__/components/DomainGrid.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// src/__tests__/components/DomainGrid.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DomainGrid from '../../components/explore/DomainGrid';

const categories = [
  { id: '1', name: '飲食',   icon: 'Utensils', color: '#F97316', order: 3 },
  { id: '2', name: '運動',   icon: 'Dumbbell', color: '#EF4444', order: 4 },
  { id: '3', name: '心靈',   icon: 'Sparkles', color: '#0EA5E9', order: 7 },
];

describe('DomainGrid', () => {
  it('renders one card per category, sorted by order', () => {
    render(<DomainGrid categories={categories} onSelect={() => {}} />);
    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('飲食');
    expect(cards[1]).toHaveTextContent('運動');
    expect(cards[2]).toHaveTextContent('心靈');
  });

  it('calls onSelect with the category when a card is clicked', () => {
    const onSelect = jest.fn();
    render(<DomainGrid categories={categories} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('運動'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: '運動' }));
  });

  it('renders nothing meaningful when categories array is empty', () => {
    const { container } = render(<DomainGrid categories={[]} onSelect={() => {}} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd web-app && npx jest src/__tests__/components/DomainGrid.test.jsx
```
Expected: FAIL (`Cannot find module '../../components/explore/DomainGrid'`).

- [ ] **Step 3: Implement DomainGrid**

```jsx
// src/components/explore/DomainGrid.jsx
"use client";

import React from 'react';
import CategoryIcon from './CategoryIcon';

function hexToTintBg(hex) {
  // Approximate a light tint by reducing alpha. Inline style avoids JIT class generation.
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return '#F3F4F6';
  return hex + '1A'; // ~10% alpha
}

export default function DomainGrid({ categories, onSelect }) {
  const sorted = [...categories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {sorted.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat)}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-white active:scale-95"
          style={{ minHeight: 110 }}
        >
          <div
            className="p-3 rounded-full flex items-center justify-center"
            style={{ backgroundColor: hexToTintBg(cat.color) }}
          >
            <CategoryIcon name={cat.icon} size={24} style={{ color: cat.color || '#374151' }} />
          </div>
          <span className="text-sm font-bold text-gray-800 text-center leading-tight">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd web-app && npx jest src/__tests__/components/DomainGrid.test.jsx
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/DomainGrid.jsx src/__tests__/components/DomainGrid.test.jsx
git commit -m "feat(ui): DomainGrid 9-card entry view"
```

---

## Task 11: HabitListView component

**Files:**
- Create: `web-app/src/components/explore/HabitListView.jsx`

This component extracts the existing habit-card-list rendering from `TaskLibraryModal` so it can be rendered inside View 2. It accepts a filtered `habits` array; filtering logic stays in the parent.

- [ ] **Step 1: Implement HabitListView**

```jsx
// src/components/explore/HabitListView.jsx
"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import IconRenderer from '../IconRenderer';
import { CATEGORY_CONFIG } from '@/lib/constants';

const DIFFICULTY_OPTIONS = [
  { key: 'beginner',     label: '入門', color: 'emerald' },
  { key: 'intermediate', label: '進階', color: 'amber' },
  { key: 'challenge',    label: '挑戰', color: 'red' },
];

function getDefaultDifficulty(habit) {
  const diffs = habit.difficulties || {};
  if (diffs.beginner?.enabled) return 'beginner';
  if (diffs.intermediate?.enabled) return 'intermediate';
  if (diffs.challenge?.enabled) return 'challenge';
  return 'beginner';
}

function getEnabledDifficulties(habit) {
  const diffs = habit.difficulties || {};
  return DIFFICULTY_OPTIONS.filter(d => diffs[d.key]?.enabled);
}

export default function HabitListView({
  habits,
  selectedDifficulty,
  setSelectedDifficulty,
  onSelectHabit,
  emptyText,
}) {
  if (habits.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyText || '這個面向目前還沒有推薦習慣'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {habits.map(habit => {
        const enabledDiffs = getEnabledDifficulties(habit);
        const currentDiff = selectedDifficulty[habit.id] || getDefaultDifficulty(habit);
        const config = CATEGORY_CONFIG[habit.category] || CATEGORY_CONFIG['star'];

        return (
          <div key={habit.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 flex-1">
                <div className={`${config.bg} p-2 rounded-xl flex-shrink-0`}>
                  <IconRenderer category={habit.category} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-800">{habit.name}</h4>
                  {habit.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{habit.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onSelectHabit(habit, currentDiff)}
                className="flex items-center gap-1 text-sm text-white bg-emerald-500 px-3 py-1.5 rounded-full font-bold hover:bg-emerald-600 transition-colors flex-shrink-0 ml-2"
              >
                <Plus size={16} /> 新增
              </button>
            </div>

            {enabledDiffs.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">選擇難度：</p>
                <div className="flex gap-2">
                  {enabledDiffs.map(diff => {
                    const isSelected = currentDiff === diff.key;
                    const diffConfig = habit.difficulties[diff.key];
                    return (
                      <button
                        key={diff.key}
                        onClick={() => setSelectedDifficulty(prev => ({ ...prev, [habit.id]: diff.key }))}
                        className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                        style={isSelected ? {
                          backgroundColor: diff.color === 'emerald' ? '#10b981' : diff.color === 'amber' ? '#f59e0b' : '#ef4444',
                          color: 'white'
                        } : {
                          backgroundColor: diff.color === 'emerald' ? '#ECFDF5' : diff.color === 'amber' ? '#FEF3C7' : '#FEE2E2',
                          color: diff.color === 'emerald' ? '#047857' : diff.color === 'amber' ? '#B45309' : '#B91C1C',
                        }}
                      >
                        {diffConfig?.label || diff.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/explore/HabitListView.jsx
git commit -m "feat(ui): extract HabitListView from TaskLibraryModal"
```

---

## Task 12: Rewire TaskLibraryModal — 2-view machine

**Files:**
- Modify: `web-app/src/components/TaskLibraryModal.jsx` (full rewrite)

- [ ] **Step 1: Replace TaskLibraryModal**

```jsx
// src/components/TaskLibraryModal.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { Target, X, Edit2, Loader, Search, ChevronLeft } from 'lucide-react';
import DomainGrid from './explore/DomainGrid';
import HabitListView from './explore/HabitListView';
import CategoryIcon from './explore/CategoryIcon';

const TaskLibraryModal = ({ isOpen, onClose, onSelectTask, onOpenCustomForm }) => {
    const [habits, setHabits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('domain');           // 'domain' | 'list' | 'search'
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState({});

    useEffect(() => {
        if (isOpen) {
            fetchHabits();
            setView('domain');
            setSelectedDomain(null);
            setSearch('');
        }
    }, [isOpen]);

    const fetchHabits = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/habits');
            if (res.ok) {
                const data = await res.json();
                setHabits(data.habits || []);
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Fetch habits error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectDomain = (cat) => {
        setSelectedDomain(cat);
        setView('list');
        setSearch('');
    };

    const handleBack = () => {
        setView('domain');
        setSelectedDomain(null);
        setSearch('');
    };

    const handleSearchChange = (value) => {
        setSearch(value);
        if (view === 'domain' && value.trim()) {
            setView('search');
        }
        if (view === 'search' && !value.trim()) {
            setView('domain');
        }
    };

    const handleSelectHabit = (habit, diffKey) => {
        const config = habit.difficulties?.[diffKey];
        if (!config) {
            alert('請先選擇難度');
            return;
        }
        const task = {
            title: config.label || habit.name,
            details: habit.description || '',
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

    const visibleHabits = (() => {
        const q = search.trim().toLowerCase();
        if (view === 'domain') return [];
        if (view === 'search') {
            return habits.filter(h => h.name.toLowerCase().includes(q));
        }
        // view === 'list'
        return habits.filter(h => {
            const matchesDomain = selectedDomain ? h.category === selectedDomain.name : true;
            const matchesSearch = !q || h.name.toLowerCase().includes(q);
            return matchesDomain && matchesSearch;
        });
    })();

    if (!isOpen) return null;

    const headerLabel = view === 'list' && selectedDomain
        ? selectedDomain.name
        : view === 'search'
            ? '搜尋結果'
            : '選擇習慣';

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-xl h-[90vh] md:h-auto md:max-h-[85vh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {view !== 'domain' && (
                            <button onClick={handleBack} className="text-gray-500 hover:text-gray-800 -ml-1">
                                <ChevronLeft size={22} />
                            </button>
                        )}
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            {view === 'list' && selectedDomain?.icon ? (
                                <CategoryIcon name={selectedDomain.icon} size={20} style={{ color: selectedDomain.color || '#10B981' }} />
                            ) : (
                                <Target size={20} className="text-emerald-500" />
                            )}
                            {headerLabel}
                        </h3>
                    </div>
                    <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-gray-800" /></button>
                </div>

                {/* Search */}
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

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <button
                        onClick={onOpenCustomForm}
                        className="w-full bg-gray-800 text-white text-base font-bold py-3 rounded-xl shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Edit2 size={20} /> 手動建立新任務
                    </button>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="animate-spin text-emerald-500" size={32} />
                        </div>
                    ) : view === 'domain' ? (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">選擇一個健康面向</p>
                            <DomainGrid categories={categories} onSelect={handleSelectDomain} />
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
            </div>
        </div>
    );
};

export default TaskLibraryModal;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TaskLibraryModal.jsx
git commit -m "feat(ui): TaskLibraryModal 2-view machine (DomainGrid → HabitList)"
```

---

## Task 13: Admin category form — icon picker

**Files:**
- Modify: `web-app/src/app/admin/dashboard/habits/categories/page.js`

This task assumes the admin category page has a create/edit form posting to `/api/admin/categories`. Read the file first; the patch below shows the addition pattern.

- [ ] **Step 1: Read current file**

```bash
cat src/app/admin/dashboard/habits/categories/page.js | head -120
```

- [ ] **Step 2: Add icon state**

In the component, locate the form state. Add an `icon` field alongside `name` / `color`:

```js
const [form, setForm] = useState({ name: '', color: '#10B981', icon: '' });
```

And when populating the form from an existing category for edit, include `icon: cat.icon || ''`.

- [ ] **Step 3: Add icon select to the form JSX**

Add inside the existing form, near the color picker. Import the icon list at the top:

```js
import { SEEDED_ICON_NAMES } from '@/components/explore/LUCIDE_ICONS';
import CategoryIcon from '@/components/explore/CategoryIcon';
```

Then in the form:

```jsx
<label className="block">
  <span className="text-sm font-medium text-gray-700">圖示 (Lucide)</span>
  <div className="mt-2 grid grid-cols-5 gap-2">
    {SEEDED_ICON_NAMES.map(name => (
      <button
        type="button"
        key={name}
        onClick={() => setForm(f => ({ ...f, icon: name }))}
        className={`flex items-center justify-center p-2 rounded-lg border ${form.icon === name ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
        title={name}
      >
        <CategoryIcon name={name} size={20} />
      </button>
    ))}
  </div>
  <input
    type="text"
    value={form.icon}
    onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
    placeholder="或手動輸入 Lucide 圖示名"
    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
  />
</label>
```

- [ ] **Step 4: Send `icon` in POST/PUT payload**

Locate the fetch call(s) that POST/PUT to `/api/admin/categories[/:id]`. Add `icon: form.icon || null` to the JSON body alongside `name` and `color`.

- [ ] **Step 5: Show icon in list row**

Find the row rendering for each category. Add a `CategoryIcon` to the left of the name (right of the order):

```jsx
<CategoryIcon name={cat.icon} size={18} style={{ color: cat.color || '#374151' }} />
<span>{cat.name}</span>
```

- [ ] **Step 6: Manual verify in admin**

```bash
npm run dev
```
Visit http://localhost:3000/admin/dashboard/habits/categories. Confirm:
- icon picker renders 9 icons
- selecting one + saving persists
- list row shows icon

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/dashboard/habits/categories/page.js
git commit -m "feat(admin): icon picker on HabitCategory form"
```

---

## Task 14: Browser verification + smoke test

This is verification only — make no commits unless an issue is found.

- [ ] **Step 1: Start dev server (if not running)**

```bash
npm run dev
```

- [ ] **Step 2: Use preview tools to walk the explore flow**

Open the app preview. Click "建立習慣" to open `TaskLibraryModal`. Verify:

- 9-card grid renders, 3 cols on desktop, 2 cols on mobile (use preview_resize to 375)
- Each card shows a Lucide icon (not emoji) tinted with category color
- Clicking a card → header shows back chevron + category name + icon
- The habits shown match the chosen category
- Empty-state card (a domain with 0 habits — pick one) shows the empty text
- Search box on grid view → typing switches to "搜尋結果" view, results are global
- Search box on list view → filters within current domain
- Existing "選難度 → 新增" flow still works (creates task as before)
- Mobile bottom-sheet layout intact

- [ ] **Step 3: Screenshot grid + list views**

```bash
# via preview_screenshot
```
Attach to PR description.

- [ ] **Step 4: Regression — admin still works**

- Login to admin (`/admin/login`)
- Open `/admin/dashboard/habits/categories`
- Create a test category with an icon, verify it appears in client modal
- Delete it
- Open `/admin/dashboard/habits`, create/edit a habit assigned to a standard category, verify it shows up under the right domain card

- [ ] **Step 5: Final commit (only if any fixes needed during verification)**

If verification surfaced any issue, fix and commit. Otherwise: done.

---

## Self-Review Notes

- Spec section 4 (schema): covered by Task 1.
- Spec section 3 (9 categories): covered by Task 2 (seed JSON).
- Spec section 5 (migration): covered by Tasks 3, 4, 5, 6, 7.
- Spec section 6 (UI): covered by Tasks 9, 10, 11, 12.
- Spec section 7 (admin): covered by Task 13.
- Spec section 8 (API): covered by Task 8.
- Spec section 9 (testing): covered by Tasks 5 (resolver unit), 10 (DomainGrid render), 14 (manual smoke + idempotency check in Task 6 step 3 + Task 7 step 4).
- Spec section 10 (risks): mitigations explicit in script logic — `_unmapped` fallback (Task 5/7), idempotency tests (Task 5/6/7), responsive grid (Task 10 grid-cols-2 sm:grid-cols-3), icon fallback (Task 9 FALLBACK_ICON).

No remaining placeholders, contradictions, or undefined references.
