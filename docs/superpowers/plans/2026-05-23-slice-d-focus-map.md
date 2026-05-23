# Slice D — Focus Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "impact × ability" 2D focus-map visualization inside the existing add-habit flow. Each `OfficialHabit` gets two new integer columns (`impact`, `ability` — both 1–5), and `HabitListView` gains a 清單/焦點地圖 toggle. No AI — scoring is seeded statically.

**Architecture:**
1. Schema: two `Int` columns on `OfficialHabit` (default 3).
2. Seed: hand-score all 102 habits in `genesis-io-habits.json` using the rubric in the spec.
3. UI: dynamic-imported `FocusMap` (recharts ScatterChart) toggleable inside `HabitListView`.

**Spec:** [`docs/superpowers/specs/2026-05-23-slice-d-focus-map-design.md`](../specs/2026-05-23-slice-d-focus-map-design.md)

**Session map:**
- **Session 1 (done)** — this plan + spec
- **Session 2** — Tasks 1–4 (schema + seed + sanity check)
- **Session 3** — Tasks 5–10 (UI + tests + PR)

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/src/components/explore/FocusMap.jsx` | Recharts ScatterChart, golden-quadrant highlight |
| `web-app/src/__tests__/components/FocusMap.test.jsx` | RTL: dot count, golden quadrant, tap callback |
| `web-app/scripts/check-focus-map-distribution.js` | One-shot CLI to verify every domain has ≥1 high-impact / ≥1 high-ability habit (Session 2 sanity gate) |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | `OfficialHabit` + `impact Int @default(3)` + `ability Int @default(3)` |
| `web-app/prisma/seed/genesis-io-habits.json` | 102 rows each get `impact` + `ability` keys (1–5) |
| `web-app/prisma/seed-habits.js` (or equivalent seed runner) | Read new keys, pass through to upsert |
| `web-app/src/components/explore/HabitListView.jsx` | Add `viewMode` state, render `FocusMap` when `viewMode === 'map'` |
| `web-app/src/__tests__/components/HabitListView.test.jsx` (if exists) | New case for toggle |

### Untouched
- `TaskLibraryModal` — the toggle lives below it, doesn't change its props
- `TemplateExplorer` / `TemplateDetailPanel` — the template path is separate from the add-habit path
- All `/api/*` route files — Prisma auto-selects new columns; no handler change

---

# SESSION 2

## Task 1 — Schema migration

**Files:** `web-app/prisma/schema.prisma`

- [ ] **Step 1:** Edit `OfficialHabit` model — add the two columns:

```prisma
model OfficialHabit {
  // ... existing fields ...
  difficulties Json
  impact      Int      @default(3)
  ability     Int      @default(3)
  isActive    Boolean  @default(true)
  // ...
}
```

- [ ] **Step 2:** Push to DB:

```bash
cd /Users/johnson/habitnext1/web-app && npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema." 0 prompts (defaults make the migration non-interactive).

- [ ] **Step 3:** Regenerate client (usually `db push` does this; sanity):

```bash
cd /Users/johnson/habitnext1/web-app && npx prisma generate
```

- [ ] **Step 4:** Verify the columns exist (psql or Prisma Studio):

```bash
cd /Users/johnson/habitnext1/web-app && npx prisma studio &
# Open OfficialHabit table, confirm impact + ability columns visible
```

(Kill studio after confirming.)

**Done when:** Schema file edited, db push clean, the 102 existing rows show `impact=3, ability=3`.

---

## Task 2 — Score all 102 habits

**Files:** `web-app/prisma/seed/genesis-io-habits.json`

**Approach:** Process domain by domain (9 passes). For each domain, eyeball the habit list against the rubric (spec §4) and assign integer scores.

Suggested per-domain target distribution (rough — adjust per domain reality):
| Impact | Count |
|---|---|
| 5 (旗艦) | 1–2 |
| 4 (主要) | 2–3 |
| 3 (有益) | majority |
| 2 (邊際) | 0–2 |
| 1 (錦上) | 0–1 |

Same shape for ability — most habits cluster at 3, with 1–2 each at the extremes.

- [ ] **Step 1 (per domain × 9):** Open the JSON, find every habit with `category === "<domain name>"`, add `impact` and `ability` keys after `category`.

Example diff for one habit:
```diff
 {
   "name": "每日攝取益生菌/發酵食物",
   "description": "...",
   "category": "基因與腸道",
   "icon": "pill",
+  "impact": 4,
+  "ability": 3,
   "isActive": true,
   ...
 }
```

- [ ] **Step 2:** After all 9 domains done, count check:

```bash
cd /Users/johnson/habitnext1 && jq '[.[] | select(.impact == null or .ability == null)] | length' web-app/prisma/seed/genesis-io-habits.json
```

Expected: `0`.

- [ ] **Step 3:** Range check (no out-of-bounds):

```bash
cd /Users/johnson/habitnext1 && jq '[.[] | select(.impact < 1 or .impact > 5 or .ability < 1 or .ability > 5)] | length' web-app/prisma/seed/genesis-io-habits.json
```

Expected: `0`.

**Done when:** Every habit has `impact` and `ability` integers in [1, 5].

---

## Task 3 — Wire seed runner to pass scores through

**Files:** `web-app/prisma/seed-habits.js` (or whichever script reads `genesis-io-habits.json`)

- [ ] **Step 1:** Grep for how the JSON is currently read:

```bash
cd /Users/johnson/habitnext1 && grep -rn "genesis-io-habits" web-app/prisma/ web-app/scripts/
```

- [ ] **Step 2:** In the upsert call, ensure `impact` and `ability` are in both `create` and `update` payloads:

```js
await prisma.officialHabit.upsert({
  where: { name: row.name },
  create: { ...row },           // spread already includes the new keys
  update: { ...row },
});
```

(If the existing script uses an explicit field list rather than spread, add `impact` and `ability` to both lists.)

- [ ] **Step 3:** Run the seed:

```bash
cd /Users/johnson/habitnext1/web-app && npm run seed:habits   # or whichever script name
```

Expected: 102 upserts, 0 errors.

- [ ] **Step 4:** Spot-check 3 rows in Studio — confirm scores propagated to DB.

**Done when:** DB rows reflect the JSON scores.

---

## Task 4 — Distribution sanity script

**Files:** `web-app/scripts/check-focus-map-distribution.js` (new)

- [ ] **Step 1:** Write a single-purpose script that reads the JSON (no DB needed — JSON is the source of truth post-seed) and asserts:
  - Every one of the 9 domains has `≥1` habit with `impact ≥ 4`
  - Every one of the 9 domains has `≥1` habit with `ability ≥ 4`
  - At most 40% of habits sit at exactly `(3, 3)` (proxy for "did you actually score")

Exit code 1 on any failure, with a clear log of which domain failed which check.

- [ ] **Step 2:** Run it:

```bash
cd /Users/johnson/habitnext1 && node web-app/scripts/check-focus-map-distribution.js
```

Expected: exit 0, log line "All 9 domains pass distribution checks."

**Done when:** Script green. If red, rebalance scores in Task 2 and re-run Task 3.

---

## Session 2 PR

- [ ] Branch already on `feat/slice-d-focus-map` (from Session 1).
- [ ] Commit 1: `feat(schema): add impact + ability to OfficialHabit`
- [ ] Commit 2: `feat(seed): score all 102 official habits on impact × ability`
- [ ] Commit 3: `chore: add focus-map distribution sanity script`
- [ ] Push, surface PR-create URL. **Do not merge yet** — UI lands in Session 3 PR on the same branch (or a stacked branch off this one, decide at the time).

---

# SESSION 3

## Task 5 — `FocusMap` component shell (TDD)

**Files:** `web-app/src/components/explore/FocusMap.jsx`, `web-app/src/__tests__/components/FocusMap.test.jsx`

- [ ] **Step 1:** Write the test first:

```js
// FocusMap.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import FocusMap from '../../components/explore/FocusMap';

const fixtures = [
  { id: 'a', name: '高影響高能力', impact: 5, ability: 5, color: '#10B981' },
  { id: 'b', name: '中庸',         impact: 3, ability: 3, color: '#3B82F6' },
  { id: 'c', name: '低影響低能力', impact: 1, ability: 1, color: '#EF4444' },
];

it('renders one dot per habit', () => {
  render(<FocusMap habits={fixtures} onSelect={() => {}} />);
  // recharts renders <Scatter> as <g class="recharts-scatter"> with N children
  expect(screen.getByTestId('focus-map-dots').children.length).toBe(3);
});

it('calls onSelect when a dot is tapped', () => {
  const onSelect = jest.fn();
  render(<FocusMap habits={fixtures} onSelect={onSelect} />);
  fireEvent.click(screen.getByTestId('dot-a'));
  expect(onSelect).toHaveBeenCalledWith(fixtures[0]);
});
```

- [ ] **Step 2:** Implement `FocusMap.jsx` until both tests pass. Use recharts `ScatterChart`, `XAxis` (domain 0.5–5.5, ticks at 1/3/5, label "影響 →"), `YAxis` (domain 0.5–5.5, ticks 1/3/5, label "容易 →"), `CartesianGrid` (stroke `#E5E7EB`). Render `<Scatter>` once per habit, color by `habit.color`. Apply ±0.15 jitter when ≥2 habits share an integer cell.

- [ ] **Step 3:** Add golden-quadrant highlight (`<ReferenceArea x1=4 x2=5.5 y1=4 y2=5.5 fill="#10B98114" />`) + small "黃金行為" label.

- [ ] **Step 4:** Test for golden-quadrant element:
```js
it('highlights the golden quadrant', () => {
  render(<FocusMap habits={fixtures} onSelect={() => {}} />);
  expect(screen.getByLabelText('黃金行為')).toBeInTheDocument();
});
```

**Done when:** 3 tests green, `FocusMap.jsx` renders independently.

---

## Task 6 — Wire `FocusMap` into `HabitListView`

**Files:** `web-app/src/components/explore/HabitListView.jsx`

- [ ] **Step 1:** Add `viewMode` state (default `'list'`).
- [ ] **Step 2:** Render a chip toggle at the top:
  ```jsx
  <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-3">
    <button onClick={() => setViewMode('list')} className={...}>清單</button>
    <button onClick={() => setViewMode('map')} className={...}>焦點地圖</button>
  </div>
  ```
- [ ] **Step 3:** Conditional render:
  ```jsx
  {viewMode === 'list' && <ExistingListJSX />}
  {viewMode === 'map' && <FocusMap habits={habits} onSelect={onSelectHabit} />}
  ```
  Use dynamic import for `FocusMap`:
  ```jsx
  const FocusMap = dynamic(() => import('./FocusMap'), { ssr: false });
  ```

- [ ] **Step 4:** `onSelect` handler in map mode reuses whatever `HabitListView` already does when a list row is tapped — opening the detail / add-to-plan flow. No new branch.

**Done when:** Manually opening 添加習慣 → 任一 domain → toggle 切到地圖 → see dots → tap one → existing detail opens.

---

## Task 7 — Visual polish

- [ ] **Step 1:** Microcopy below the map: `「點選右上角（高影響 × 高容易）開始，可以最快看到效果」` (text-xs text-gray-500).
- [ ] **Step 2:** Verify mobile breakpoint (360px wide). If dots become too cramped, shrink to 12px and reduce label font.
- [ ] **Step 3:** Verify the toggle survives `viewMode` flip without unmounting the parent (state preserved).

---

## Task 8 — Regression tests

- [ ] **Step 1:** If `HabitListView.test.jsx` exists, add a case: "renders toggle when habits prop is non-empty" + "switching mode does not unmount existing children".
- [ ] **Step 2:** Run full suite:

```bash
cd /Users/johnson/habitnext1/web-app && npm test
```

Expected: 0 failing. Current baseline (per memory 2026-05-21) was 97/0 — Slice D adds ~3–5 tests, target 100–102/0.

---

## Task 9 — Build budget check

- [ ] **Step 1:** Run production build:

```bash
cd /Users/johnson/habitnext1/web-app && npm run build:local   # or npm run build
```

- [ ] **Step 2:** Compare First Load JS on `/` to the baseline 126 kB (post-Slice-I A1). Acceptable: ≤ 130 kB (since FocusMap is dynamic-imported, the delta should be near zero on `/`).
- [ ] **Step 3:** If delta > 30 kB, investigate — likely FocusMap was bundled statically; double-check `dynamic()` wrapper.

---

## Task 10 — PR

- [ ] **Step 1:** Confirm branch state. If Session 2's PR is still open and unmerged, decide:
  - **Option A:** Push more commits to the same branch — single bigger PR for the whole slice.
  - **Option B:** Branch a `feat/slice-d-focus-map-ui` off the Session 2 branch — stacked PRs.
  - Recommendation: **Option A** unless Session 2 PR is large or has reviewer comments still open.
- [ ] **Step 2:** Commits (suggested split):
  - `feat(ui): FocusMap scatter component for officialHabit impact × ability`
  - `feat(ui): list / focus-map toggle inside HabitListView`
  - `test: FocusMap + HabitListView toggle coverage`
- [ ] **Step 3:** Push, create PR with:
  - Spec link
  - Plan link
  - Screenshot/GIF of toggle flow (optional but valuable for review)
  - Build-budget delta call-out
  - Test counts

**Done when:** PR merged, deployed to Vercel preview, smoke-tested on a real device.

---

# Out of scope (revisit after Slice D ships)

- **AI brainstorm (original Slice C)** — Gemini API for user-goal-driven habit generation. Spec separately.
- **Personal weighting** — typeKey/sleepTypeKey-driven score adjustment.
- **Anchor map** — a similar 2D for cues, not habits. Probably not needed; Slice B AnchorPicker already covers the cue side.
- **Cross-domain comparison view** — show top-3 golden habits across all 9 domains on one canvas. Could be a Slice D.5 if users ask.
