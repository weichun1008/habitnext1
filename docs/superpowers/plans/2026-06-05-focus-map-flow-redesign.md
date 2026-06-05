# 焦點地圖流程重設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把焦點地圖從「單頁多拉桿」改成引導式三階段流程（逐一評影響力 → 逐一評執行度 → 焦點地圖選擇加入並設定養成期間），移除 BJ Fogg 字樣。

**Architecture:** `FocusMapModal` 改為 `phase` 狀態機（`impact → ability → map`）＋結尾養成期間 sheet。評分邏輯、象限文案、payload 組裝抽到純函式 `lib/focusMap.js`（可單測）；UI 拆成 `RatingStep`（單習慣單維度的拖曳刻度）、`FocusMatrix`（2×2 矩陣＋hover/tap 顯名稱）、`QuadrantSection`（加入切換清單）、`DurationSheet`（養成期間＋背後科學漸進揭露）。資料面新增 nullable `Task.targetDays`，`batch-rate` 在 activate 時寫入；未勾選一律 `keep_candidate`（不再刪除 skip）。

**Tech Stack:** Next.js 14 App Router、React 18、Prisma + PostgreSQL(Neon)、Tailwind、lucide-react、Jest + React Testing Library。

**Conventions:**
- 工作目錄：`web-app/`。所有 `npx` / `npm` / `git` 指令請在 `web-app/` 下執行（git 指令在 repo 根亦可）。
- 測試放 `web-app/src/__tests__/`，純函式用 `require('../../lib/..')`，元件用 `@testing-library/react`。
- 跑單一測試：`cd web-app && npx jest src/__tests__/lib/focusMap.test.js -t "名稱"`。
- 共用 Neon DB + 多 session：schema 僅做 **additive nullable** 變更；push 前先 `git fetch && git pull`，主分支保持 schema superset。
- 回應 zh-TW；UI 不用 emoji，用 lucide-react；commit trailer：`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`；git identity：`HabitNext Dev <dev@habitnext.local>`。

---

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `web-app/prisma/schema.prisma` | 修改 | `Task` 新增 `targetDays Int?` |
| `web-app/src/lib/focusMap.js` | 修改 | 更新 `QUADRANTS`（去 Fogg、加 `iconKey`/`color`）、新增 `DURATION_OPTIONS`、`HABIT_FORMATION_SCIENCE`、`buildBatchPayload` |
| `web-app/src/components/focusMap/RatingStep.jsx` | 建立 | 單一習慣、單一維度的拖曳刻度評分畫面 |
| `web-app/src/components/focusMap/FocusMatrix.jsx` | 建立 | 2×2 矩陣＋編號彩點＋hover/tap 浮層＋圖例（取代 MiniMap） |
| `web-app/src/components/focusMap/DurationSheet.jsx` | 建立 | 養成期間 bottom sheet ＋ 背後科學漸進揭露 |
| `web-app/src/components/focusMap/QuadrantSection.jsx` | 修改 | 移除列內拉桿，改加入切換清單；套新文案＋Lucide |
| `web-app/src/components/focusMap/HabitRatingRow.jsx` | 刪除 | 雙拉桿列（含 Fogg 警語）不再需要 |
| `web-app/src/components/focusMap/MiniMap.jsx` | 刪除 | 由 FocusMatrix 取代 |
| `web-app/src/components/FocusMapModal.jsx` | 修改 | 三階段狀態機；去 Fogg 副標；送出帶 targetDays |
| `web-app/src/app/api/tasks/batch-rate/route.js` | 修改 | 接受並在 activate 寫入 `targetDays` |
| `web-app/src/__tests__/lib/focusMap.test.js` | 修改 | 新增 QUADRANTS/DURATION_OPTIONS/buildBatchPayload 測試 |
| `web-app/src/__tests__/components/focusMap/*.test.jsx` | 建立 | RatingStep / FocusMatrix / QuadrantSection / DurationSheet / FocusMapModal 測試 |
| `web-app/src/__tests__/api/batch-rate.test.js` | 建立 | batch-rate targetDays 行為 |

---

## Task 1: Schema — `Task.targetDays`

**Files:**
- Modify: `web-app/prisma/schema.prisma`（`Task` model，約 line 142 `// ★ end Slice L` 之前）

- [ ] **Step 1: 先同步遠端，避免 schema drift**

```bash
git fetch origin && git pull origin main --no-edit
```
Expected: 已是最新或 fast-forward。若有衝突，先解決再繼續。

- [ ] **Step 2: 在 Task model 新增 targetDays 欄位**

在 `schema.prisma` 的 `Task` model 內，`officialHabit   OfficialHabit? @relation(...)` 那行之後、`// ★ end Slice L` 之前插入：

```prisma
  targetDays      Int? // 養成期間天數；null = 不設限（沒有終止日，持續追蹤）
```

- [ ] **Step 3: 推送 schema（additive、nullable，安全）並重新產生 client**

```bash
cd web-app && npx prisma db push && npx prisma generate
```
Expected: `Your database is now in sync with your Prisma schema.`，且不應出現任何 `DROP`/data-loss 警告（若出現，**停止**並回報——代表本機 schema 不是 superset）。

- [ ] **Step 4: Commit**

```bash
git add web-app/prisma/schema.prisma
git commit -m "feat(focus-map): add Task.targetDays (nullable) for habit duration

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `lib/focusMap.js` — 文案、選項、payload 純函式

**Files:**
- Modify: `web-app/src/lib/focusMap.js`
- Test: `web-app/src/__tests__/lib/focusMap.test.js`

- [ ] **Step 1: 改寫既有 QUADRANTS 測試 + 新增測試（先讓它失敗）**

把 `src/__tests__/lib/focusMap.test.js` 最上方 require 改成：

```js
const {
  QUADRANTS,
  DURATION_OPTIONS,
  HABIT_FORMATION_SCIENCE,
  quadrantOf,
  recommendDefaults,
  sliderSeedFor,
  buildBatchPayload,
} = require('../../lib/focusMap');
```

把現有的 `describe('QUADRANTS', ...)` 整段replace成：

```js
describe('QUADRANTS', () => {
  it('has 4 entries with required fields', () => {
    expect(Object.keys(QUADRANTS).sort()).toEqual(['background', 'big_fish', 'golden', 'skip']);
    for (const q of Object.values(QUADRANTS)) {
      expect(typeof q.label).toBe('string');
      expect(typeof q.advice).toBe('string');
      expect(typeof q.iconKey).toBe('string');
      expect(typeof q.color).toBe('string');
      expect(['recommended', 'optional', 'park', 'skip']).toContain(q.rec);
    }
  });

  it('contains no "Fogg" wording anywhere', () => {
    const blob = JSON.stringify(QUADRANTS);
    expect(blob.toLowerCase()).not.toContain('fogg');
  });

  it('uses plain Chinese labels (no emoji prefix)', () => {
    expect(QUADRANTS.golden.label).toBe('值得優先做');
    expect(QUADRANTS.big_fish.label).toBe('值得挑戰');
    expect(QUADRANTS.background.label).toBe('順手加碼');
    expect(QUADRANTS.skip.label).toBe('建議先跳過');
  });
});

describe('DURATION_OPTIONS', () => {
  it('has 4 options with exactly one recommended (66 days)', () => {
    expect(DURATION_OPTIONS).toHaveLength(4);
    const rec = DURATION_OPTIONS.filter(o => o.recommended);
    expect(rec).toHaveLength(1);
    expect(rec[0].value).toBe(66);
  });

  it('includes an unlimited option with value null', () => {
    const unlimited = DURATION_OPTIONS.find(o => o.value === null);
    expect(unlimited).toBeTruthy();
    expect(unlimited.label).toContain('不設限');
  });

  it('values are 21 / 66 / 90 / null', () => {
    expect(DURATION_OPTIONS.map(o => o.value)).toEqual([21, 66, 90, null]);
  });
});

describe('HABIT_FORMATION_SCIENCE', () => {
  it('exposes the 66-day median fact without inventing precision', () => {
    expect(HABIT_FORMATION_SCIENCE.medianDays).toBe(66);
    expect(HABIT_FORMATION_SCIENCE.rangeDays).toEqual([18, 254]);
    expect(typeof HABIT_FORMATION_SCIENCE.summary).toBe('string');
  });
});

describe('buildBatchPayload', () => {
  const candidates = [
    { id: 'a' }, { id: 'b' }, { id: 'c' },
  ];
  const ratings = new Map([
    ['a', { impact: 5, ability: 5 }], // golden
    ['b', { impact: 5, ability: 2 }], // big_fish
    ['c', { impact: 2, ability: 2 }], // skip
  ]);

  it('marks added ids as activate with targetDays, others keep_candidate', () => {
    const added = new Set(['a', 'b']);
    const payload = buildBatchPayload(candidates, ratings, added, 66);
    const byId = Object.fromEntries(payload.map(p => [p.taskId, p]));
    expect(byId.a).toEqual({ taskId: 'a', userImpact: 5, userAbility: 5, action: 'activate', targetDays: 66 });
    expect(byId.b).toEqual({ taskId: 'b', userImpact: 5, userAbility: 2, action: 'activate', targetDays: 66 });
    expect(byId.c).toEqual({ taskId: 'c', userImpact: 2, userAbility: 2, action: 'keep_candidate' });
  });

  it('passes targetDays: null (不設限) through for activated tasks', () => {
    const payload = buildBatchPayload(candidates, new Map([['a', { impact: 5, ability: 5 }]]), new Set(['a']), null);
    expect(payload[0]).toEqual({ taskId: 'a', userImpact: 5, userAbility: 5, action: 'activate', targetDays: null });
  });

  it('does NOT archive skip-quadrant tasks (non-destructive)', () => {
    const payload = buildBatchPayload(candidates, ratings, new Set(), 66);
    expect(payload.every(p => p.action !== 'archive')).toBe(true);
  });

  it('defaults missing ratings to 3/3', () => {
    const payload = buildBatchPayload([{ id: 'z' }], new Map(), new Set(), 66);
    expect(payload[0]).toMatchObject({ taskId: 'z', userImpact: 3, userAbility: 3, action: 'keep_candidate' });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/lib/focusMap.test.js`
Expected: FAIL（`DURATION_OPTIONS`/`buildBatchPayload`/`HABIT_FORMATION_SCIENCE` 未定義、QUADRANTS label 不符）。

- [ ] **Step 3: 改寫 `lib/focusMap.js`**

把檔案最上方的 `QUADRANTS` 物件 replace 成（移除 emoji 與 Fogg、加 `iconKey`/`color`，保留 `rec`/`advice`）：

```js
// 四象限定義（label/advice 為使用者可見白話文，無 BJ Fogg 字樣）。
// iconKey 對應 lucide-react 元件名；color 為點/主色。
const QUADRANTS = {
  golden:     { label: '值得優先做', iconKey: 'Star',        color: '#ea580c', tone: 'amber', rec: 'recommended', advice: '高影響又容易做到 — 最划算，建議先加入。' },
  big_fish:   { label: '值得挑戰',   iconKey: 'Mountain',    color: '#7c3aed', tone: 'violet', rec: 'park',       advice: '影響大但目前不易做到 — 可先從更簡單的版本開始，別逼太緊。' },
  background: { label: '順手加碼',   iconKey: 'Sprout',      color: '#0891b2', tone: 'cyan',  rec: 'optional',    advice: '容易做但影響有限 — 行有餘力再加。' },
  skip:       { label: '建議先跳過', iconKey: 'SkipForward', color: '#94a3b8', tone: 'gray',  rec: 'skip',        advice: '影響有限又不易做 — 建議先擱著；但你仍可自行加入。' },
};

// 養成期間選項（給 DurationSheet）。value 為天數；null = 不設限（沒有終止日）。
const DURATION_OPTIONS = [
  { value: 21,   label: '21 天',  sub: '起步嘗試' },
  { value: 66,   label: '66 天',  sub: '養成自動化', recommended: true },
  { value: 90,   label: '90 天',  sub: '鞏固成形' },
  { value: null, label: '不設限', sub: '沒有終止日，持續追蹤' },
];

// 習慣養成的科學依據（漸進揭露用，不在主畫面寫全文）。數字不誇大。
const HABIT_FORMATION_SCIENCE = {
  medianDays: 66,
  rangeDays: [18, 254],
  summary: '研究發現，新行為要變成「不太需要意志力的自動反應」，平均約需 66 天（會因人和習慣難度而異，落在 18–254 天）。所以我們把預設放在 66 天。',
};
```

在 `module.exports` 之前新增 `buildBatchPayload`：

```js
// 依使用者在焦點地圖的選擇，組出 batch-rate 的 payload。
// 已加入(addedSet) → activate（帶 targetDays）；其餘 → keep_candidate（保留候選、不刪除）。
// ratings: Map<taskId, { impact, ability }>。targetDays: number | null。
function buildBatchPayload(candidates, ratings, addedSet, targetDays) {
  if (!Array.isArray(candidates)) return [];
  return candidates.map(c => {
    const r = ratings.get(c.id) || { impact: 3, ability: 3 };
    const impact = typeof r.impact === 'number' ? r.impact : 3;
    const ability = typeof r.ability === 'number' ? r.ability : 3;
    if (addedSet && addedSet.has(c.id)) {
      return { taskId: c.id, userImpact: impact, userAbility: ability, action: 'activate', targetDays: targetDays ?? null };
    }
    return { taskId: c.id, userImpact: impact, userAbility: ability, action: 'keep_candidate' };
  });
}
```

把 `module.exports` replace 成：

```js
module.exports = {
  QUADRANTS,
  DURATION_OPTIONS,
  HABIT_FORMATION_SCIENCE,
  quadrantOf,
  recommendDefaults,
  sliderSeedFor,
  buildBatchPayload,
};
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/lib/focusMap.test.js`
Expected: PASS（含既有 quadrantOf/recommendDefaults/sliderSeedFor）。

- [ ] **Step 5: Commit**

```bash
git add web-app/src/lib/focusMap.js web-app/src/__tests__/lib/focusMap.test.js
git commit -m "feat(focus-map): plain-language quadrants + duration options + buildBatchPayload

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `RatingStep` 元件（拖曳刻度、不自動跳）

**Files:**
- Create: `web-app/src/components/focusMap/RatingStep.jsx`
- Test: `web-app/src/__tests__/components/focusMap/RatingStep.test.jsx`

- [ ] **Step 1: 寫失敗測試**

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import RatingStep from '../../../components/focusMap/RatingStep';

const base = {
  habitTitle: '睡前 1 小時不看手機',
  index: 0, total: 3, value: 3,
  onChange: jest.fn(), onPrev: jest.fn(), onNext: jest.fn(),
};

describe('RatingStep', () => {
  beforeEach(() => jest.clearAllMocks());

  test('影響力步驟顯示問句與進度', () => {
    render(<RatingStep phase="impact" {...base} />);
    expect(screen.getByText(/影響有多大/)).toBeInTheDocument();
    expect(screen.getByText(/第一步 · 影響力/)).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  test('執行度步驟顯示不同問句', () => {
    render(<RatingStep phase="ability" {...base} />);
    expect(screen.getByText(/有多容易做到/)).toBeInTheDocument();
    expect(screen.getByText(/第二步 · 執行度/)).toBeInTheDocument();
  });

  test('拖動刻度呼叫 onChange，但不會自動前進', () => {
    render(<RatingStep phase="impact" {...base} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '5' } });
    expect(base.onChange).toHaveBeenCalledWith(5);
    expect(base.onNext).not.toHaveBeenCalled();
  });

  test('按「下一個」才呼叫 onNext', () => {
    render(<RatingStep phase="impact" {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /下一個/ }));
    expect(base.onNext).toHaveBeenCalledTimes(1);
  });

  test('第一題不顯示「上一個」', () => {
    render(<RatingStep phase="impact" {...base} index={0} />);
    expect(screen.queryByRole('button', { name: /上一個/ })).not.toBeInTheDocument();
  });

  test('非第一題顯示「上一個」並可呼叫 onPrev', () => {
    render(<RatingStep phase="impact" {...base} index={1} />);
    fireEvent.click(screen.getByRole('button', { name: /上一個/ }));
    expect(base.onPrev).toHaveBeenCalledTimes(1);
  });

  test('最後一題（執行度）下一步文字為「看焦點地圖」', () => {
    render(<RatingStep phase="ability" {...base} index={2} total={3} />);
    expect(screen.getByRole('button', { name: /看焦點地圖/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/RatingStep.test.jsx`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作 `RatingStep.jsx`**

```jsx
'use client';

import React from 'react';
import { Target, Dumbbell } from 'lucide-react';

// RatingStep — 單一習慣、單一維度的評分畫面（拖曳刻度，選值不自動前進）。
// Props:
//   phase: 'impact' | 'ability'
//   habitTitle: string
//   index, total: number（0-based index）
//   value: 1-5
//   onChange(value): 拖動刻度
//   onPrev(), onNext(): 導覽（onNext 由「下一個」按鈕觸發，不自動）
const THEME = {
  impact:  { grad: 'linear-gradient(135deg,#a78bfa,#7c3aed)', solid: '#8b5cf6', soft: '#f5f3ff', bd: '#ddd6fe', text: '#7c3aed', Icon: Target,
             title: '第一步 · 影響力', q: '這個習慣對你想要的改變，影響有多大？', sub: '想它跟你的目標關聯多強，先別管做不做得到。',
             lo: '沒感覺', hi: '很有感', labels: { 1: '沒什麼感覺', 2: '影響不大', 3: '普通', 4: '蠻有感', 5: '非常關鍵' } },
  ability: { grad: 'linear-gradient(135deg,#fbbf24,#f97316)', solid: '#f59e0b', soft: '#fff7ed', bd: '#fed7aa', text: '#ea580c', Icon: Dumbbell,
             title: '第二步 · 執行度', q: '對你來說，這個習慣有多容易做到？', sub: '純評估難易，影響大不大這步先不管。',
             lo: '很難', hi: '很容易', labels: { 1: '很難做到', 2: '有點難', 3: '普通', 4: '算容易', 5: '非常容易' } },
};

const RatingStep = ({ phase, habitTitle, index, total, value, onChange, onPrev, onNext }) => {
  const t = THEME[phase];
  const Icon = t.Icon;
  const v = typeof value === 'number' ? value : 3;
  const isImpact = phase === 'impact';
  const isLast = !isImpact && index === total - 1;
  const showPrev = !(isImpact && index === 0);
  // 進度：影響力佔前半、執行度佔後半
  const done = isImpact ? index : total + index;
  const pct = Math.round((done / (total * 2)) * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: t.grad }} />
        </div>
        <p className="text-[11px] font-extrabold mt-2" style={{ color: t.text }}>
          {t.title}　<span className="text-gray-300">{index + 1}/{total}</span>
        </p>
      </div>

      <div className="flex-1 flex flex-col px-1 pt-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: t.soft }}>
          <Icon size={22} style={{ color: t.text }} />
        </div>
        <h3 className="text-lg font-extrabold leading-snug text-gray-800">{t.q}</h3>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{t.sub}</p>
        <span className="self-start inline-flex items-center gap-1.5 mt-4 px-3.5 py-2 rounded-full text-sm font-extrabold border"
          style={{ background: t.soft, borderColor: t.bd, color: t.text }}>
          <Icon size={14} /> {habitTitle}
        </span>

        <div className="mt-auto">
          <div className="text-center text-3xl font-black leading-none mt-2" style={{ color: t.text }}>
            {v}
            <span className="block text-[13px] text-gray-500 font-bold mt-1.5">{t.labels[v]}</span>
          </div>
          <div className="px-1.5 mt-3">
            <input
              type="range" min={1} max={5} step={1} value={v}
              onChange={e => onChange(Number(e.target.value))}
              aria-label={isImpact ? '影響力' : '執行度'}
              className="fm-range w-full"
              style={{ '--c': t.solid, background: t.grad }}
            />
            <div className="flex justify-between px-3 text-[11px] font-extrabold text-gray-300">
              {[1, 2, 3, 4, 5].map(n => <span key={n}>{n}</span>)}
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] font-bold text-gray-400">
              <span>{t.lo}</span><span>{t.hi}</span>
            </div>
          </div>
          <div className="flex gap-2.5 mt-5">
            {showPrev && (
              <button type="button" onClick={onPrev}
                className="flex-none bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl px-4 py-3.5 font-extrabold text-sm transition-colors">
                ‹ 上一個
              </button>
            )}
            <button type="button" onClick={onNext}
              className="flex-1 text-white rounded-xl py-3.5 font-extrabold text-[15px] transition-transform hover:-translate-y-0.5"
              style={{ background: t.grad }}>
              {isLast ? '看焦點地圖 ›' : '下一個 ›'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingStep;
```

- [ ] **Step 4: 加上大拖鈕的全域 range 樣式**

在 `web-app/src/app/globals.css` 末尾新增（大拖鈕、好觸控；顏色由 `--c` 控制）：

```css
/* Focus map 評分刻度：大拖鈕、可拖可點軌道 */
.fm-range { -webkit-appearance: none; appearance: none; height: 12px; border-radius: 999px; outline: none; }
.fm-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 36px; height: 36px; border-radius: 50%; background: #fff; border: 4px solid var(--c, #10b981); box-shadow: 0 4px 12px rgba(0,0,0,.22); cursor: grab; }
.fm-range::-webkit-slider-thumb:active { transform: scale(1.12); cursor: grabbing; }
.fm-range::-moz-range-thumb { width: 36px; height: 36px; border-radius: 50%; background: #fff; border: 4px solid var(--c, #10b981); box-shadow: 0 4px 12px rgba(0,0,0,.22); cursor: grab; }
```

- [ ] **Step 5: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/RatingStep.test.jsx`
Expected: PASS（6 tests）。

- [ ] **Step 6: Commit**

```bash
git add web-app/src/components/focusMap/RatingStep.jsx web-app/src/__tests__/components/focusMap/RatingStep.test.jsx web-app/src/app/globals.css
git commit -m "feat(focus-map): RatingStep — draggable scale, no auto-advance, themed per axis

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `FocusMatrix` 元件（矩陣＋hover/tap 顯名稱＋圖例）

**Files:**
- Create: `web-app/src/components/focusMap/FocusMatrix.jsx`
- Test: `web-app/src/__tests__/components/focusMap/FocusMatrix.test.jsx`

- [ ] **Step 1: 寫失敗測試**

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import FocusMatrix from '../../../components/focusMap/FocusMatrix';

const points = [
  { id: 'a', n: 1, title: '睡前不看手機', impact: 5, ability: 5, quadrant: 'golden',     color: '#ea580c' },
  { id: 'b', n: 2, title: '飯後散步',     impact: 5, ability: 2, quadrant: 'big_fish',   color: '#7c3aed' },
  { id: 'c', n: 3, title: '喝水',         impact: 2, ability: 2, quadrant: 'skip',       color: '#94a3b8' },
];

describe('FocusMatrix', () => {
  test('每個 point 一個圓點', () => {
    const { container } = render(<FocusMatrix points={points} />);
    expect(container.querySelectorAll('[data-dot-id]').length).toBe(3);
  });

  test('圖例列出每個習慣名稱與編號', () => {
    render(<FocusMatrix points={points} />);
    expect(screen.getByText(/睡前不看手機/)).toBeInTheDocument();
    expect(screen.getByText(/飯後散步/)).toBeInTheDocument();
  });

  test('點圓點顯示名稱浮層，再點收合', () => {
    const { container } = render(<FocusMatrix points={points} />);
    const dot = container.querySelector('[data-dot-id="a"]');
    fireEvent.click(dot);
    expect(screen.getByTestId('dot-tip')).toHaveTextContent('睡前不看手機');
    fireEvent.click(dot);
    expect(screen.queryByTestId('dot-tip')).not.toBeInTheDocument();
  });

  test('hover 圓點也顯示名稱浮層', () => {
    const { container } = render(<FocusMatrix points={points} />);
    const dot = container.querySelector('[data-dot-id="b"]');
    fireEvent.mouseEnter(dot);
    expect(screen.getByTestId('dot-tip')).toHaveTextContent('飯後散步');
    fireEvent.mouseLeave(dot);
    expect(screen.queryByTestId('dot-tip')).not.toBeInTheDocument();
  });

  test('空 points 也能渲染（無點）', () => {
    const { container } = render(<FocusMatrix points={[]} />);
    expect(container.querySelectorAll('[data-dot-id]').length).toBe(0);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/FocusMatrix.test.jsx`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作 `FocusMatrix.jsx`**

```jsx
'use client';

import React, { useState } from 'react';

// FocusMatrix — 2×2 焦點地圖矩陣。Y=影響力(上高)、X=執行度(右易)。
// 每個 point 是帶編號的彩點；桌機 hover、手機點選顯示習慣名稱浮層；下方圖例對應編號↔名稱。
// Props:
//   points: Array<{ id, n, title, impact(1-5), ability(1-5), quadrant, color }>
const CELLS = [
  { key: 'big_fish',   label: '值得挑戰',   cls: 'top-0 left-0 bg-violet-50',  txt: 'text-violet-600' },
  { key: 'golden',     label: '值得優先做', cls: 'top-0 left-1/2 bg-orange-50', txt: 'text-orange-600' },
  { key: 'skip',       label: '建議跳過',   cls: 'top-1/2 left-0 bg-slate-50',  txt: 'text-slate-400' },
  { key: 'background', label: '順手加碼',   cls: 'top-1/2 left-1/2 bg-cyan-50', txt: 'text-cyan-600' },
];

// (ability,impact) → 百分比座標（含同點水平微錯位）
function layout(points) {
  const seen = {};
  return points.map(p => {
    const x = ((p.ability - 1) / 4) * 82 + 9;
    const y = ((p.impact - 1) / 4) * 82 + 9;
    const ck = `${Math.round(x)}_${Math.round(y)}`;
    const k = (seen[ck] = (seen[ck] || 0) + 1);
    return { ...p, x: x + (k - 1) * 10, y };
  });
}

const FocusMatrix = ({ points = [] }) => {
  const [active, setActive] = useState(null); // 目前顯示名稱的 dot id
  const laid = layout(points);
  const tip = active != null ? laid.find(p => p.id === active) : null;

  return (
    <div>
      <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
        {/* 矩陣本體（圓角、cell 底色） */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-gray-200">
          {CELLS.map(c => (
            <div key={c.key} className={`absolute w-1/2 h-1/2 p-1.5 ${c.cls}`}>
              <span className={`text-[9px] font-extrabold ${c.txt}`}>{c.label}</span>
            </div>
          ))}
          {laid.map(p => (
            <div
              key={p.id}
              data-dot-id={p.id}
              role="button"
              tabIndex={0}
              aria-label={p.title}
              onMouseEnter={() => setActive(p.id)}
              onMouseLeave={() => setActive(cur => (cur === p.id ? null : cur))}
              onClick={() => setActive(cur => (cur === p.id ? null : p.id))}
              className="absolute w-6 h-6 rounded-full border-2 border-white text-white text-[11px] font-extrabold flex items-center justify-center cursor-pointer shadow-md"
              style={{ left: `${p.x}%`, bottom: `${p.y}%`, transform: 'translate(-50%,50%)', background: p.color }}
            >
              {p.n}
            </div>
          ))}
        </div>
        {/* 浮層（畫在矩陣外層，避免被 overflow-hidden 裁掉） */}
        {tip && (
          <div
            data-testid="dot-tip"
            className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap shadow-lg pointer-events-none"
            style={{ left: `${tip.x}%`, bottom: `${tip.y}%`, transform: 'translate(-50%,-135%)' }}
          >
            {tip.n}. {tip.title}
          </div>
        )}
        <span className="absolute -left-1 top-1/2 -rotate-90 origin-left -translate-y-1/2 text-[10px] font-bold text-gray-400 whitespace-nowrap">影響力 →</span>
      </div>
      <p className="text-center text-[10px] font-bold text-gray-400 mt-1.5">執行度（越右越容易）→</p>
      {/* 圖例 */}
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 mt-2">
        {laid.map(p => (
          <div key={p.id} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="w-[18px] h-[18px] rounded-full text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0" style={{ background: p.color }}>{p.n}</span>
            <span className="truncate">{p.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusMatrix;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/FocusMatrix.test.jsx`
Expected: PASS（5 tests）。

- [ ] **Step 5: Commit**

```bash
git add web-app/src/components/focusMap/FocusMatrix.jsx web-app/src/__tests__/components/focusMap/FocusMatrix.test.jsx
git commit -m "feat(focus-map): FocusMatrix — 2x2 grid with numbered dots, hover/tap labels, legend

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `DurationSheet` 元件（養成期間＋背後科學漸進揭露）

**Files:**
- Create: `web-app/src/components/focusMap/DurationSheet.jsx`
- Test: `web-app/src/__tests__/components/focusMap/DurationSheet.test.jsx`

- [ ] **Step 1: 寫失敗測試**

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import DurationSheet from '../../../components/focusMap/DurationSheet';

const props = () => ({ value: 66, onPick: jest.fn(), onConfirm: jest.fn(), onClose: jest.fn() });

describe('DurationSheet', () => {
  test('顯示四個養成期間選項與推薦標記', () => {
    render(<DurationSheet {...props()} />);
    expect(screen.getByText('21 天')).toBeInTheDocument();
    expect(screen.getByText('66 天')).toBeInTheDocument();
    expect(screen.getByText('90 天')).toBeInTheDocument();
    expect(screen.getByText('不設限')).toBeInTheDocument();
    expect(screen.getByText('推薦')).toBeInTheDocument();
  });

  test('點選選項呼叫 onPick(value)', () => {
    const p = props();
    render(<DurationSheet {...p} />);
    fireEvent.click(screen.getByText('90 天'));
    expect(p.onPick).toHaveBeenCalledWith(90);
  });

  test('背後科學預設收合，點連結才展開', () => {
    render(<DurationSheet {...props()} />);
    expect(screen.queryByText(/平均約需/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /背後科學/ }));
    expect(screen.getByText(/平均約需/)).toBeInTheDocument();
  });

  test('確認加入呼叫 onConfirm', () => {
    const p = props();
    render(<DurationSheet {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /確認加入/ }));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/DurationSheet.test.jsx`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作 `DurationSheet.jsx`**

```jsx
'use client';

import React, { useState } from 'react';
import { FlaskConical, ChevronRight } from 'lucide-react';
import { DURATION_OPTIONS, HABIT_FORMATION_SCIENCE } from '@/lib/focusMap';

// DurationSheet — 確認加入前選擇養成期間。背後科學採漸進揭露（與 HabitInsight 同語彙）。
// Props:
//   value: number | null（目前選的天數，null=不設限）
//   onPick(value), onConfirm(), onClose()
const keyOf = (v) => (v === null ? 'none' : String(v));

const DurationSheet = ({ value, onPick, onConfirm, onClose }) => {
  const [showSci, setShowSci] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-t-3xl p-5 pb-7" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-extrabold text-gray-800 mb-3">想養成多久？</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {DURATION_OPTIONS.map(o => {
            const sel = value === o.value;
            return (
              <button key={keyOf(o.value)} type="button" onClick={() => onPick(o.value)}
                className={`relative rounded-2xl border-[1.5px] p-3 text-center font-extrabold text-sm transition-colors ${sel ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-700 hover:border-emerald-300'}`}>
                {o.recommended && <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[8px] font-extrabold rounded-full px-1.5 py-0.5">推薦</span>}
                {o.label}
                <span className="block font-medium text-[10px] text-gray-400 mt-0.5">{o.sub}</span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => setShowSci(s => !s)}
          className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-emerald-600">
          <FlaskConical size={13} /> 為什麼建議 66 天？查看背後科學 {showSci ? '▾' : '›'}
        </button>
        {showSci && (
          <div className="mt-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[11.5px] leading-relaxed text-emerald-800">
            {HABIT_FORMATION_SCIENCE.summary}
            <span className="inline-flex items-center gap-0.5 mt-1 font-bold text-emerald-600 cursor-pointer">查看完整來源與說明 <ChevronRight size={12} /></span>
          </div>
        )}

        <button type="button" onClick={onConfirm}
          className="w-full mt-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3.5 font-extrabold transition-colors">
          確認加入
        </button>
      </div>
    </div>
  );
};

export default DurationSheet;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/DurationSheet.test.jsx`
Expected: PASS（4 tests）。

- [ ] **Step 5: Commit**

```bash
git add web-app/src/components/focusMap/DurationSheet.jsx web-app/src/__tests__/components/focusMap/DurationSheet.test.jsx
git commit -m "feat(focus-map): DurationSheet — habit duration with progressive-disclosure science link

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 改寫 `QuadrantSection`（加入切換清單）+ 刪除 HabitRatingRow

**Files:**
- Modify: `web-app/src/components/focusMap/QuadrantSection.jsx`
- Delete: `web-app/src/components/focusMap/HabitRatingRow.jsx`
- Test: `web-app/src/__tests__/components/focusMap/QuadrantSection.test.jsx`

- [ ] **Step 1: 寫失敗測試**

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import QuadrantSection from '../../../components/focusMap/QuadrantSection';

const golden = [
  { id: 'a', n: 1, title: '睡前不看手機' },
  { id: 'b', n: 2, title: '飯後散步' },
];

describe('QuadrantSection', () => {
  test('顯示象限名稱與白話說明（無 Fogg）', () => {
    render(<QuadrantSection quadrantKey="golden" items={golden} addedSet={new Set(['a'])} onToggle={() => {}} />);
    expect(screen.getByText('值得優先做')).toBeInTheDocument();
    expect(screen.getByText(/最划算/)).toBeInTheDocument();
    expect(screen.queryByText(/Fogg/i)).not.toBeInTheDocument();
  });

  test('已加入顯示「已加入」、未加入顯示「加入」', () => {
    render(<QuadrantSection quadrantKey="golden" items={golden} addedSet={new Set(['a'])} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /已加入/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^＋ 加入/ })).toBeInTheDocument();
  });

  test('skip 象限未加入時文字為「仍要加入」且可點', () => {
    const onToggle = jest.fn();
    render(<QuadrantSection quadrantKey="skip" items={[{ id: 'c', n: 3, title: '喝水' }]} addedSet={new Set()} onToggle={onToggle} />);
    const btn = screen.getByRole('button', { name: /仍要加入/ });
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith('c');
  });

  test('items 為空時不渲染', () => {
    const { container } = render(<QuadrantSection quadrantKey="golden" items={[]} addedSet={new Set()} onToggle={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/QuadrantSection.test.jsx`
Expected: FAIL（目前 QuadrantSection 介面不符）。

- [ ] **Step 3: 改寫 `QuadrantSection.jsx`**

整檔 replace：

```jsx
'use client';

import React from 'react';
import * as Icons from 'lucide-react';
import { QUADRANTS } from '@/lib/focusMap';

// QuadrantSection — 一個象限卡：圖示 + 白話名稱 + 說明 + 習慣加入切換清單。
// Props:
//   quadrantKey: 'golden' | 'background' | 'big_fish' | 'skip'
//   items: Array<{ id, n, title }>
//   addedSet: Set<id>（已加入）
//   onToggle(id): 切換加入
const QuadrantSection = ({ quadrantKey, items, addedSet, onToggle }) => {
  if (!items || items.length === 0) return null;
  const meta = QUADRANTS[quadrantKey];
  const Icon = Icons[meta.iconKey] || Icons.Circle;
  const isSkip = quadrantKey === 'skip';

  return (
    <section className="mb-2.5 rounded-2xl border p-3" style={{ background: `${meta.color}0f`, borderColor: `${meta.color}40` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
          <Icon size={15} style={{ color: meta.color }} />
        </span>
        <div className="min-w-0">
          <b className="text-[13.5px]" style={{ color: meta.color }}>{meta.label}</b>
          <p className="text-[10px] text-gray-500 leading-snug">{meta.advice}</p>
        </div>
        <span className="ml-auto text-[11px] font-bold text-gray-400">{items.length}</span>
      </div>
      {items.map(it => {
        const on = addedSet.has(it.id);
        return (
          <div key={it.id} className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-2.5 py-2 mb-1.5">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-gray-700 min-w-0">
              <span className="inline-flex w-4 h-4 rounded-full text-white text-[9px] items-center justify-center flex-shrink-0" style={{ background: meta.color }}>{it.n}</span>
              <span className="truncate">{it.title}</span>
            </span>
            <button type="button" onClick={() => onToggle(it.id)}
              className={`text-[11px] font-extrabold rounded-lg px-2.5 py-1.5 border transition-colors flex-shrink-0 ${
                on ? 'bg-emerald-500 text-white border-emerald-500'
                   : isSkip ? 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                            : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-400'}`}>
              {on ? '✓ 已加入' : isSkip ? '＋ 仍要加入' : '＋ 加入'}
            </button>
          </div>
        );
      })}
    </section>
  );
};

export default QuadrantSection;
```

- [ ] **Step 4: 刪除 HabitRatingRow（已無人引用）**

```bash
git rm web-app/src/components/focusMap/HabitRatingRow.jsx
```

- [ ] **Step 5: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/QuadrantSection.test.jsx`
Expected: PASS（4 tests）。

- [ ] **Step 6: Commit**

```bash
git add web-app/src/components/focusMap/QuadrantSection.jsx web-app/src/__tests__/components/focusMap/QuadrantSection.test.jsx
git commit -m "feat(focus-map): QuadrantSection — add-toggle list, Lucide icons, no Fogg; drop HabitRatingRow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 重構 `FocusMapModal` 為三階段狀態機

**Files:**
- Modify: `web-app/src/components/FocusMapModal.jsx`
- Delete: `web-app/src/components/focusMap/MiniMap.jsx`
- Test: `web-app/src/__tests__/components/focusMap/FocusMapModal.test.jsx`

- [ ] **Step 1: 寫失敗測試（mock fetch）**

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FocusMapModal from '../../../components/FocusMapModal';

const candidates = [
  { id: 'a', title: '睡前不看手機', officialHabit: { impact: 5, ability: 5 } },
  { id: 'b', title: '飯後散步',     officialHabit: { impact: 5, ability: 2 } },
];

beforeEach(() => {
  global.fetch = jest.fn((url, opts) => {
    if (String(url).includes('/api/tasks/candidates')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(candidates) });
    }
    if (String(url).includes('/api/tasks/batch-rate')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, counts: { activate: 1 } }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});
afterEach(() => jest.restoreAllMocks());

async function advanceAllRatings() {
  // 影響力 2 題 + 執行度 2 題 = 4 次「下一個/看焦點地圖」
  for (let i = 0; i < 4; i++) {
    const btn = await screen.findByRole('button', { name: /下一個|看焦點地圖/ });
    fireEvent.click(btn);
  }
}

describe('FocusMapModal — 三階段', () => {
  test('開啟後先進入影響力階段', async () => {
    render(<FocusMapModal isOpen userId="u1" onClose={() => {}} onActivated={() => {}} />);
    expect(await screen.findByText(/第一步 · 影響力/)).toBeInTheDocument();
    expect(screen.queryByText(/Fogg/i)).not.toBeInTheDocument();
  });

  test('評完影響力進入執行度', async () => {
    render(<FocusMapModal isOpen userId="u1" onClose={() => {}} onActivated={() => {}} />);
    await screen.findByText(/第一步 · 影響力/);
    fireEvent.click(screen.getByRole('button', { name: /下一個/ }));
    fireEvent.click(screen.getByRole('button', { name: /下一個/ }));
    expect(await screen.findByText(/第二步 · 執行度/)).toBeInTheDocument();
  });

  test('全部評完進入焦點地圖（顯示矩陣與 CTA）', async () => {
    render(<FocusMapModal isOpen userId="u1" onClose={() => {}} onActivated={() => {}} />);
    await screen.findByText(/第一步 · 影響力/);
    await advanceAllRatings();
    expect(await screen.findByText('你的焦點地圖')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /加入 .* 個習慣/ })).toBeInTheDocument();
  });

  test('CTA→確認加入會呼叫 batch-rate 並回呼 onActivated', async () => {
    const onActivated = jest.fn();
    render(<FocusMapModal isOpen userId="u1" onClose={() => {}} onActivated={onActivated} />);
    await screen.findByText(/第一步 · 影響力/);
    await advanceAllRatings();
    fireEvent.click(await screen.findByRole('button', { name: /加入 .* 個習慣/ }));
    fireEvent.click(await screen.findByRole('button', { name: /確認加入/ }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks/batch-rate', expect.objectContaining({ method: 'PATCH' }));
      expect(onActivated).toHaveBeenCalled();
    });
    // 送出的 payload 不含 archive（不刪除 skip）
    const call = global.fetch.mock.calls.find(c => String(c[0]).includes('batch-rate'));
    const body = JSON.parse(call[1].body);
    expect(body.ratings.every(r => r.action !== 'archive')).toBe(true);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/FocusMapModal.test.jsx`
Expected: FAIL（目前 modal 是單頁拉桿，無「第一步 · 影響力」）。

- [ ] **Step 3: 改寫 `FocusMapModal.jsx`**

整檔 replace：

```jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import RatingStep from './focusMap/RatingStep';
import FocusMatrix from './focusMap/FocusMatrix';
import QuadrantSection from './focusMap/QuadrantSection';
import DurationSheet from './focusMap/DurationSheet';
import { quadrantOf, recommendDefaults, sliderSeedFor, buildBatchPayload, QUADRANTS } from '@/lib/focusMap';

// FocusMapModal — 引導式三階段：影響力 → 執行度 → 焦點地圖（+ 養成期間）。
// Props: isOpen, userId, onClose(), onActivated(count)
const ORDER = ['golden', 'big_fish', 'background', 'skip'];

const FocusMapModal = ({ isOpen, userId, onClose, onActivated }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState('impact'); // 'impact' | 'ability' | 'map'
  const [idx, setIdx] = useState(0);
  const [ratings, setRatings] = useState(new Map()); // Map<id,{impact,ability}>
  const [added, setAdded] = useState(new Set());
  const [showDur, setShowDur] = useState(false);
  const [duration, setDuration] = useState(66);

  useEffect(() => {
    if (!isOpen || !userId) return;
    let cancelled = false;
    setLoading(true);
    setPhase('impact'); setIdx(0); setShowDur(false); setDuration(66);
    (async () => {
      try {
        const res = await fetch(`/api/tasks/candidates?userId=${userId}`);
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setCandidates(list);
        const next = new Map();
        for (const c of list) {
          const seed = sliderSeedFor(c);
          next.set(c.id, { impact: seed.impact, ability: seed.ability });
        }
        setRatings(next);
      } catch (e) {
        if (!cancelled) console.error('Candidates fetch error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, userId]);

  const total = candidates.length;
  const curId = candidates[idx]?.id;
  const curRating = curId ? ratings.get(curId) : null;

  const setAxis = (axis, value) => {
    if (!curId) return;
    setRatings(prev => {
      const next = new Map(prev);
      const cur = next.get(curId) || { impact: 3, ability: 3 };
      next.set(curId, { ...cur, [axis]: value });
      return next;
    });
  };

  const goNext = () => {
    if (idx < total - 1) { setIdx(idx + 1); return; }
    if (phase === 'impact') { setPhase('ability'); setIdx(0); return; }
    // 進入 map：依使用者剛評定的分數預選 golden 前 3
    const live = candidates.map(c => ({ ...c, userImpact: ratings.get(c.id)?.impact, userAbility: ratings.get(c.id)?.ability }));
    setAdded(recommendDefaults(live));
    setPhase('map');
  };
  const goPrev = () => {
    if (idx > 0) { setIdx(idx - 1); return; }
    if (phase === 'ability') { setPhase('impact'); setIdx(total - 1); }
  };

  const toggleAdd = (id) => setAdded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // map 階段：分群 + 矩陣點
  const groups = useMemo(() => {
    const out = { golden: [], big_fish: [], background: [], skip: [] };
    candidates.forEach((c, i) => {
      const r = ratings.get(c.id) || { impact: 3, ability: 3 };
      const q = quadrantOf(r.impact, r.ability);
      out[q].push({ id: c.id, n: i + 1, title: c.title });
    });
    return out;
  }, [candidates, ratings]);

  const points = useMemo(() => candidates.map((c, i) => {
    const r = ratings.get(c.id) || { impact: 3, ability: 3 };
    const q = quadrantOf(r.impact, r.ability);
    return { id: c.id, n: i + 1, title: c.title, impact: r.impact, ability: r.ability, quadrant: q, color: QUADRANTS[q].color };
  }), [candidates, ratings]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const payload = buildBatchPayload(candidates, ratings, added, duration);
      const res = await fetch('/api/tasks/batch-rate', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratings: payload }),
      });
      if (res.ok) {
        const json = await res.json();
        onActivated?.(json.counts?.activate || 0);
      } else {
        alert('批次評分失敗，請稍後再試');
      }
    } catch (e) {
      console.error('Batch rate submit error', e);
      alert('發生錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-xl h-[90dvh] md:max-h-[90dvh] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800">焦點地圖</h2>
          <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-12">載入中…</p>
          ) : candidates.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">沒有候選習慣可評分</p>
          ) : phase !== 'map' ? (
            <RatingStep
              phase={phase}
              habitTitle={candidates[idx]?.title || ''}
              index={idx}
              total={total}
              value={phase === 'impact' ? curRating?.impact : curRating?.ability}
              onChange={(v) => setAxis(phase === 'impact' ? 'impact' : 'ability', v)}
              onPrev={goPrev}
              onNext={goNext}
            />
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-gray-800">你的焦點地圖</h2>
              <p className="text-xs text-gray-500 mt-1 mb-3">依「影響力 × 執行度」分四區，幫你決定先做哪些。</p>
              <FocusMatrix points={points} />
              <div className="mt-3">
                {ORDER.map(qk => (
                  <QuadrantSection key={qk} quadrantKey={qk} items={groups[qk]} addedSet={added} onToggle={toggleAdd} />
                ))}
              </div>
            </>
          )}
        </div>

        {phase === 'map' && candidates.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            <button type="button" onClick={() => setShowDur(true)} disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 disabled:opacity-50 text-white font-extrabold transition-transform hover:-translate-y-0.5">
              {submitting ? '處理中…' : `加入 ${added.size} 個習慣 ›`}
            </button>
          </div>
        )}

        {showDur && (
          <DurationSheet
            value={duration}
            onPick={setDuration}
            onClose={() => setShowDur(false)}
            onConfirm={handleConfirm}
          />
        )}
      </div>
    </div>
  );
};

export default FocusMapModal;
```

- [ ] **Step 4: 刪除 MiniMap（已由 FocusMatrix 取代、無人引用）**

```bash
git rm web-app/src/components/focusMap/MiniMap.jsx
```

- [ ] **Step 5: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/FocusMapModal.test.jsx`
Expected: PASS（4 tests）。

- [ ] **Step 6: Commit**

```bash
git add web-app/src/components/FocusMapModal.jsx web-app/src/__tests__/components/focusMap/FocusMapModal.test.jsx
git commit -m "feat(focus-map): rebuild modal as 3-phase flow (impact→ability→map+duration), no Fogg

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `batch-rate` API — 接受並寫入 `targetDays`

**Files:**
- Modify: `web-app/src/app/api/tasks/batch-rate/route.js`
- Test: `web-app/src/__tests__/api/batch-rate.test.js`

- [ ] **Step 1: 寫失敗測試（mock prisma）**

```js
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { $transaction: jest.fn(() => Promise.resolve([])), task: { update: jest.fn((args) => args) } },
}));

import prisma from '@/lib/prisma';
import { PATCH } from '../../app/api/tasks/batch-rate/route';

function req(body) { return { json: () => Promise.resolve(body) }; }

describe('PATCH /api/tasks/batch-rate', () => {
  beforeEach(() => jest.clearAllMocks());

  test('activate 寫入 targetDays、status=active', async () => {
    await PATCH(req({ ratings: [{ taskId: 't1', userImpact: 5, userAbility: 5, action: 'activate', targetDays: 66 }] }));
    const updateArg = prisma.task.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 't1' });
    expect(updateArg.data.status).toBe('active');
    expect(updateArg.data.targetDays).toBe(66);
  });

  test('activate 且 targetDays=null（不設限）寫入 null', async () => {
    await PATCH(req({ ratings: [{ taskId: 't1', userImpact: 5, userAbility: 5, action: 'activate', targetDays: null }] }));
    expect(prisma.task.update.mock.calls[0][0].data.targetDays).toBeNull();
  });

  test('keep_candidate 不寫 targetDays（status=candidate）', async () => {
    await PATCH(req({ ratings: [{ taskId: 't2', userImpact: 2, userAbility: 2, action: 'keep_candidate' }] }));
    const data = prisma.task.update.mock.calls[0][0].data;
    expect(data.status).toBe('candidate');
    expect('targetDays' in data).toBe(false);
  });

  test('ratings 空陣列回 400', async () => {
    const res = await PATCH(req({ ratings: [] }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/api/batch-rate.test.js`
Expected: FAIL（目前 route 不寫 targetDays）。

- [ ] **Step 3: 修改 route — 在 activate 時帶入 targetDays**

把 `prisma.task.update({ ... })` 那段的 `data` 物件改為動態組裝。將 transaction 的 map 內容 replace 成：

```js
            ratings.map(r => {
                let status;
                if (r.action === 'activate') status = 'active';
                else if (r.action === 'archive') status = 'archived';
                else status = 'candidate';
                counts[r.action] = (counts[r.action] || 0) + 1;

                const data = {
                    status,
                    userImpact: typeof r.userImpact === 'number' ? r.userImpact : null,
                    userAbility: typeof r.userAbility === 'number' ? r.userAbility : null,
                    ratedAt: now,
                };
                // 僅 activate 設定養成期間（targetDays === null 代表不設限）
                if (r.action === 'activate' && 'targetDays' in r) {
                    data.targetDays = typeof r.targetDays === 'number' ? r.targetDays : null;
                }

                return prisma.task.update({ where: { id: r.taskId }, data });
            })
```

也更新檔頭註解的 body 範例，加上 `targetDays?`：

```js
// body: { ratings: [{ taskId, userImpact, userAbility, action, targetDays? }] }
//   action: 'activate' | 'keep_candidate' | 'archive'；targetDays 僅 activate 採用，null=不設限
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/api/batch-rate.test.js`
Expected: PASS（4 tests）。

- [ ] **Step 5: Commit**

```bash
git add web-app/src/app/api/tasks/batch-rate/route.js web-app/src/__tests__/api/batch-rate.test.js
git commit -m "feat(focus-map): batch-rate writes targetDays on activate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 整合驗收 + 收尾

**Files:** 無新檔；全域驗收。

- [ ] **Step 1: 全測試套件通過**

Run: `cd web-app && npx jest`
Expected: 全綠（含既有測試）。若有既有測試因 QUADRANTS 改動而紅，依新文案修正斷言。

- [ ] **Step 2: Fogg 字樣清查（使用者可見字串應為 0）**

Run: `cd web-app && grep -rin "fogg" src/components src/lib src/app | grep -v "__tests__"`
Expected: 僅可能殘留程式碼註解（例 schema 內 `BJ Fogg ABC anchor`）。元件/UI 文字不得出現 Fogg。若 UI 字串仍有，移除。

- [ ] **Step 3: Lint + build**

Run: `cd web-app && npm run lint && npm run build`
Expected: lint 無錯、build 成功（確認 `Task.targetDays` 已 `prisma generate`，型別無誤）。

- [ ] **Step 4: 手動冒煙（桌機 + 行動裝置對等）**

啟動 `cd web-app && npm run dev`，以有 ≥2 個候選習慣的帳號開啟焦點地圖：
- 影響力階段：紫色主題、拖曳刻度可改、選值不自動跳、可「上一個」。
- 執行度階段：橘色主題；最後一題按「看焦點地圖」。
- 地圖：矩陣點 hover（桌機）/ 點選（手機，用 DevTools 行動模擬）顯示名稱；golden 預設已加入；skip 可「仍要加入」。
- CTA → 養成期間 sheet：預設 66 天標「推薦」；展開背後科學；確認加入後習慣進入每日清單、未加入仍為候選（重開地圖還在、分數記得）。
- 手機尺寸：bottom sheet 可捲動、拖鈕夠大、浮層不被裁切。

- [ ] **Step 5: 收尾分支**

Announce: "I'm using the finishing-a-development-branch skill to complete this work."
依 superpowers:finishing-a-development-branch 驗證測試、呈現選項、執行合併（push 前先 `git fetch && git pull origin main`，保持 schema superset）。

---

## Self-Review（計畫對照 spec）

- **三階段流程**：Task 7（狀態機）+ Task 3（RatingStep）✓
- **移除 Fogg**：Task 2（lib 文案）+ Task 6（QuadrantSection/刪 HabitRatingRow）+ Task 7（modal 副標）+ Task 9 Step 2（清查）✓
- **拖曳刻度、不自動跳、可回上一步**：Task 3 ✓
- **紫/橘配色 + Lucide**：Task 3（THEME）+ Task 6（iconKey）✓
- **2×2 矩陣 + hover/tap 顯名稱 + 圖例**：Task 4 ✓
- **養成期間 + 背後科學漸進揭露 + 不設限=null**：Task 5 + Task 2（DURATION_OPTIONS/HABIT_FORMATION_SCIENCE）✓
- **Task.targetDays（nullable）**：Task 1 ✓
- **batch-rate 帶 targetDays、未勾選 keep_candidate、不刪 skip**：Task 2（buildBatchPayload）+ Task 8（route）✓
- **行動裝置對等**：Task 9 Step 4 ✓
- **共用 DB schema superset**：Task 1 Step 1/3、Task 9 Step 5 ✓
- **型別一致**：`buildBatchPayload(candidates, ratings, addedSet, targetDays)`、`QUADRANTS[*].{label,advice,iconKey,color,rec}`、`DURATION_OPTIONS[*].{value,label,sub,recommended?}`、`points[*].{id,n,title,impact,ability,quadrant,color}`、RatingStep props `{phase,habitTitle,index,total,value,onChange,onPrev,onNext}` —— 跨 Task 一致 ✓
- 無 placeholder / TODO；每個 code step 附完整程式碼 ✓
