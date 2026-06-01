# 科學證據力指標 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為每則 `HabitInsight` 加上「證據力」訊號格 badge（強/中/初步）+ 點擊就地展開的評分面板，評分由可調 rubric 推算。

**Architecture:** 一支純函式 lib（`evidenceStrength.js`）是唯一真相來源——存進 DB 的只有 4 個原始面向整數，總分與等級一律由 lib 即時推算（前後端共用），未來調權重免資料遷移。UI 由 3 個小元件組成（badge / 評分面板 / 評分標準 modal），整合進既有 `HabitInsightSection` 與 admin 表單。

**Tech Stack:** Next.js 14 App Router、React 18、Prisma + PostgreSQL(Neon)、Tailwind、lucide-react、Jest + React Testing Library。

**Spec:** `docs/superpowers/specs/2026-06-01-evidence-strength-indicator-design.md`

**所有指令於 `web-app/` 目錄執行。** git 身分若未設定，先跑一次：
`git config user.email "dev@habitnext.local" && git config user.name "HabitNext Dev"`

---

## 檔案結構

| 檔案 | 職責 | 動作 |
|------|------|------|
| `src/lib/evidenceStrength.js` | rubric 設定 + 評分純函式（唯一真相來源） | 建立 |
| `src/__tests__/lib/evidenceStrength.test.js` | lib 單元測試 | 建立 |
| `prisma/schema.prisma` | `HabitInsight.evidence Json?` 欄位 | 修改 |
| `src/components/insights/EvidenceBadge.jsx` | 訊號格 badge | 建立 |
| `src/components/insights/EvidenceRubricModal.jsx` | 「我們怎麼評分」說明 modal | 建立 |
| `src/components/insights/EvidenceScorePanel.jsx` | 逐項評分面板 | 建立 |
| `src/__tests__/components/EvidenceBadge.test.jsx` | badge 測試 | 建立 |
| `src/__tests__/components/EvidenceScorePanel.test.jsx` | 面板測試 | 建立 |
| `src/components/insights/HabitInsightSection.jsx` | 整合 badge + 面板（獨立 state） | 修改 |
| `src/app/admin/dashboard/habits/components/HabitInsightFormModal.jsx` | 4 面向下拉 + 即時 tier 預覽 | 修改 |
| `src/app/api/admin/habits/[habitId]/insights/route.js` | POST 寫入 evidence | 修改 |
| `src/app/api/admin/habits/insights/[id]/route.js` | PATCH 寫入 evidence | 修改 |
| `prisma/seed/habit-insights.json` | 6 則 backfill evidence 值 | 修改 |
| `scripts/seed-habit-insights.js` | upsert 帶入 evidence | 修改 |

使用者端 API `src/app/api/habits/[habitId]/insights/route.js` 用 `findMany` 不帶 select，新欄位自動回傳，**無需修改**。

---

## Task 1: 評分純函式 lib（TDD）

**Files:**
- Create: `src/lib/evidenceStrength.js`
- Test: `src/__tests__/lib/evidenceStrength.test.js`

- [ ] **Step 1: 寫失敗測試**

`src/__tests__/lib/evidenceStrength.test.js`:

```js
const {
  DIMENSIONS, THRESHOLDS, TIER_META, TONE_CLASSES,
  scoreEvidence, sanitizeEvidence, dimDisplay, levelLabel,
} = require('../../lib/evidenceStrength');

describe('scoreEvidence', () => {
  it('回傳 null 當輸入為 null / 空物件 / 缺面向', () => {
    expect(scoreEvidence(null)).toBeNull();
    expect(scoreEvidence({})).toBeNull();
    expect(scoreEvidence({ studyType: 2, scale: 1, causality: 2 })).toBeNull(); // 缺 replication
  });

  it('全滿 → total 9、strong', () => {
    expect(scoreEvidence({ studyType: 3, scale: 2, causality: 2, replication: 2 }))
      .toEqual({ total: 9, tier: 'strong', tierLabel: '強' });
  });

  it('進食順序 {2,1,2,1} → total 6、moderate', () => {
    expect(scoreEvidence({ studyType: 2, scale: 1, causality: 2, replication: 1 }))
      .toEqual({ total: 6, tier: 'moderate', tierLabel: '中' });
  });

  it('糖 {1,2,0,0} → total 3、preliminary', () => {
    expect(scoreEvidence({ studyType: 1, scale: 2, causality: 0, replication: 0 }))
      .toEqual({ total: 3, tier: 'preliminary', tierLabel: '初步' });
  });

  it('門檻邊界：7→強、6→中、4→中、3→初步', () => {
    expect(scoreEvidence({ studyType: 3, scale: 2, causality: 2, replication: 0 }).tier).toBe('strong');   // 7
    expect(scoreEvidence({ studyType: 2, scale: 2, causality: 2, replication: 0 }).tier).toBe('moderate');  // 6
    expect(scoreEvidence({ studyType: 2, scale: 0, causality: 2, replication: 0 }).tier).toBe('moderate');  // 4
    expect(scoreEvidence({ studyType: 1, scale: 2, causality: 0, replication: 0 }).tier).toBe('preliminary'); // 3
  });
});

describe('sanitizeEvidence', () => {
  it('合法輸入回傳乾淨物件', () => {
    expect(sanitizeEvidence({ studyType: 2, scale: 1, causality: 2, replication: 1, junk: 9 }))
      .toEqual({ studyType: 2, scale: 1, causality: 2, replication: 1 });
  });
  it('非法等級值或缺面向 → null', () => {
    expect(sanitizeEvidence({ studyType: 5, scale: 1, causality: 2, replication: 1 })).toBeNull();
    expect(sanitizeEvidence({ studyType: 2 })).toBeNull();
    expect(sanitizeEvidence(null)).toBeNull();
  });
});

describe('dimDisplay', () => {
  it('studyType=2（max 3，部分）→ amber、2 格', () => {
    expect(dimDisplay('studyType', 2)).toEqual({ label: 'RCT 介入試驗', points: 2, max: 3, filled: 2, tone: 'moderate' });
  });
  it('causality=2（達 max）→ green、2 格', () => {
    expect(dimDisplay('causality', 2)).toEqual({ label: '介入證明因果', points: 2, max: 2, filled: 2, tone: 'strong' });
  });
  it('scale=0 → gray、0 格', () => {
    expect(dimDisplay('scale', 0)).toEqual({ label: '非人體（動物／細胞）', points: 0, max: 2, filled: 0, tone: 'preliminary' });
  });
});

describe('靜態設定', () => {
  it('有 4 個面向', () => { expect(DIMENSIONS.map(d => d.key)).toEqual(['studyType', 'scale', 'causality', 'replication']); });
  it('TIER_META / TONE_CLASSES / THRESHOLDS 齊備', () => {
    expect(TIER_META.strong.label).toBe('強');
    expect(TONE_CLASSES.moderate.bar).toMatch(/amber/);
    expect(THRESHOLDS).toEqual({ strong: 7, moderate: 4 });
    expect(levelLabel('replication', 2)).toBe('多研究一致');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest evidenceStrength -v`
Expected: FAIL（`Cannot find module '../../lib/evidenceStrength'`）

- [ ] **Step 3: 實作 lib**

`src/lib/evidenceStrength.js`:

```js
// 科學證據力評分 — 純函式、無相依，前後端共用。
// 設計：docs/superpowers/specs/2026-06-01-evidence-strength-indicator-design.md
//
// 只存 4 個原始面向整數；total / tier 一律由此推算。調整 levels.points 或
// THRESHOLDS 後重新部署，即由既有原始值重算，無需資料遷移。

export const DIMENSIONS = [
  {
    key: 'studyType', label: '研究類型',
    levels: [
      { value: 3, label: '統合分析／系統綜述', points: 3 },
      { value: 2, label: 'RCT 介入試驗', points: 2 },
      { value: 1, label: '觀察性研究', points: 1 },
      { value: 0, label: '動物／機制／專家意見', points: 0 },
    ],
  },
  {
    key: 'scale', label: '對象與規模',
    levels: [
      { value: 2, label: '大型人體', points: 2 },
      { value: 1, label: '小型人體', points: 1 },
      { value: 0, label: '非人體（動物／細胞）', points: 0 },
    ],
  },
  {
    key: 'causality', label: '因果強度',
    levels: [
      { value: 2, label: '介入證明因果', points: 2 },
      { value: 1, label: '強相關＋合理機制', points: 1 },
      { value: 0, label: '僅相關／機制推論', points: 0 },
    ],
  },
  {
    key: 'replication', label: '重複驗證',
    levels: [
      { value: 2, label: '多研究一致', points: 2 },
      { value: 1, label: '部分支持', points: 1 },
      { value: 0, label: '單一研究／結果混合', points: 0 },
    ],
  },
];

// 門檻（可優化）。max total = 3+2+2+2 = 9
export const THRESHOLDS = { strong: 7, moderate: 4 };

export const TIER_META = {
  strong: { key: 'strong', label: '強', filled: 3 },
  moderate: { key: 'moderate', label: '中', filled: 2 },
  preliminary: { key: 'preliminary', label: '初步', filled: 1 },
};

// 只是 class token 字串（資料，非 import Tailwind）；元件套用。
export const TONE_CLASSES = {
  strong: { text: 'text-emerald-700', bg: 'bg-emerald-100', bar: 'bg-emerald-500' },
  moderate: { text: 'text-amber-700', bg: 'bg-amber-100', bar: 'bg-amber-500' },
  preliminary: { text: 'text-slate-600', bg: 'bg-slate-100', bar: 'bg-slate-400' },
};

function findDim(key) { return DIMENSIONS.find(d => d.key === key) || null; }
function findLevel(key, value) {
  const dim = findDim(key);
  return dim ? dim.levels.find(l => l.value === value) || null : null;
}

export function levelLabel(key, value) {
  const lvl = findLevel(key, value);
  return lvl ? lvl.label : '';
}

export function dimMaxPoints(key) {
  const dim = findDim(key);
  return dim ? Math.max(...dim.levels.map(l => l.points)) : 0;
}

// 把任意輸入清成合法 evidence 物件，否則 null（任一面向缺失/非法即視為未評分）。
export function sanitizeEvidence(input) {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const dim of DIMENSIONS) {
    const v = input[dim.key];
    if (!Number.isInteger(v)) return null;
    if (!dim.levels.some(l => l.value === v)) return null;
    out[dim.key] = v;
  }
  return out;
}

// 主函式：合法 evidence → { total, tier, tierLabel }；否則 null（不顯示 badge）。
export function scoreEvidence(evidence) {
  const clean = sanitizeEvidence(evidence);
  if (!clean) return null;
  const total = DIMENSIONS.reduce((sum, dim) => {
    const lvl = findLevel(dim.key, clean[dim.key]);
    return sum + (lvl ? lvl.points : 0);
  }, 0);
  let tier;
  if (total >= THRESHOLDS.strong) tier = 'strong';
  else if (total >= THRESHOLDS.moderate) tier = 'moderate';
  else tier = 'preliminary';
  return { total, tier, tierLabel: TIER_META[tier].label };
}

// UI 顯示用：某面向某值的標籤、分數、滿格、色調。
export function dimDisplay(key, value) {
  const lvl = findLevel(key, value);
  const points = lvl ? lvl.points : 0;
  const max = dimMaxPoints(key);
  const filled = Math.min(3, Math.max(0, points));
  let tone;
  if (points <= 0) tone = 'preliminary';
  else if (points >= max) tone = 'strong';
  else tone = 'moderate';
  return { label: lvl ? lvl.label : '', points, max, filled, tone };
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx jest evidenceStrength -v`
Expected: PASS（全數綠燈）

- [ ] **Step 5: Commit**

```bash
git add src/lib/evidenceStrength.js src/__tests__/lib/evidenceStrength.test.js
git commit -m "feat(lib): evidenceStrength — rubric 評分純函式 + 測試"
```

---

## Task 2: Prisma schema 加 evidence 欄位

**Files:**
- Modify: `prisma/schema.prisma`（`model HabitInsight`，約 line 248 `aiGenerated` 上方）

- [ ] **Step 1: 加欄位**

在 `model HabitInsight` 內，`status` 與 `aiGenerated` 之間插入：

```prisma
  // ★ 證據力指標 — { studyType, scale, causality, replication }，各為整數等級。
  // null = 未評分（不顯示 badge）。total/tier 由 lib/evidenceStrength.js 推算。
  evidence Json?
```

- [ ] **Step 2: 推到資料庫 + 重新產生 client**

Run: `npx prisma db push && npx prisma generate`
Expected: `Your database is now in sync with your Prisma schema.`（既有列的 evidence 為 null，非破壞性）

- [ ] **Step 3: 確認 jest 仍全綠（schema 改動不影響測試但確認沒壞）**

Run: `npx jest 2>&1 | tail -4`
Expected: 全數 PASS

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): HabitInsight.evidence Json? — 證據力面向原始值"
```

---

## Task 3: EvidenceBadge 元件（TDD）

**Files:**
- Create: `src/components/insights/EvidenceBadge.jsx`
- Test: `src/__tests__/components/EvidenceBadge.test.jsx`

- [ ] **Step 1: 寫失敗測試**

`src/__tests__/components/EvidenceBadge.test.jsx`:

```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EvidenceBadge from '../../components/insights/EvidenceBadge';

describe('EvidenceBadge', () => {
  it('無評分時不渲染', () => {
    const { container } = render(<EvidenceBadge evidence={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('strong evidence 顯示「證據力 強」', () => {
    render(<EvidenceBadge evidence={{ studyType: 3, scale: 2, causality: 2, replication: 2 }} />);
    expect(screen.getByText(/證據力 強/)).toBeInTheDocument();
  });

  it('點擊觸發 onClick', () => {
    const onClick = jest.fn();
    render(<EvidenceBadge evidence={{ studyType: 2, scale: 1, causality: 2, replication: 1 }} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest EvidenceBadge -v`
Expected: FAIL（找不到模組）

- [ ] **Step 3: 實作元件**

`src/components/insights/EvidenceBadge.jsx`:

```jsx
'use client';

import React from 'react';
import { scoreEvidence, TIER_META, TONE_CLASSES } from '@/lib/evidenceStrength';

// 訊號格 badge。無評分 → null。點擊呼叫 onClick（卡片內會先 stopPropagation）。
// active 時加一圈內框，表示對應的評分面板已展開。
export default function EvidenceBadge({ evidence, onClick, active = false }) {
  const score = scoreEvidence(evidence);
  if (!score) return null;
  const tone = TONE_CLASSES[score.tier];
  const filled = TIER_META[score.tier].filled;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`證據力 ${score.tierLabel}，點擊查看評分`}
      aria-expanded={active}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-all hover:brightness-95 hover:shadow-sm ${tone.bg} ${tone.text} ${active ? 'ring-1 ring-inset ring-gray-400/40' : ''}`}
    >
      <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
        {[5, 8, 12].map((h, i) => (
          <span
            key={i}
            style={{ height: h }}
            className={`w-[3px] rounded-[1px] ${tone.bar} ${i < filled ? 'opacity-100' : 'opacity-25'}`}
          />
        ))}
      </span>
      證據力 {score.tierLabel}
    </button>
  );
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx jest EvidenceBadge -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/insights/EvidenceBadge.jsx src/__tests__/components/EvidenceBadge.test.jsx
git commit -m "feat(ui): EvidenceBadge — 訊號格證據力標籤 + 測試"
```

---

## Task 4: EvidenceRubricModal 元件

**Files:**
- Create: `src/components/insights/EvidenceRubricModal.jsx`

（此元件純展示靜態 rubric，無分支邏輯；不寫獨立測試，由 Task 5 面板測試間接覆蓋開啟。）

- [ ] **Step 1: 實作元件**

`src/components/insights/EvidenceRubricModal.jsx`:

```jsx
'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DIMENSIONS, THRESHOLDS } from '@/lib/evidenceStrength';

// 「我們怎麼評分」說明 modal。內容由 lib 的 DIMENSIONS/THRESHOLDS 動態產生，
// 與實際算分同源（不寫死兩份）。點遮罩或 Esc 關閉。
export default function EvidenceRubricModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-bold text-gray-800">我們怎麼評證據力</h3>
          <button onClick={onClose} aria-label="關閉" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            每則科學佐證從 4 個面向評分、加總分為三個等級。分數衡量「證據有多可信」，
            不代表「習慣有多好」——嚴謹研究即使結論是效果有限，證據力仍然高。
          </p>
          {DIMENSIONS.map((dim) => (
            <div key={dim.key}>
              <h4 className="font-bold text-gray-800 text-sm mb-1">{dim.label}</h4>
              <ul className="space-y-0.5">
                {dim.levels.map((l) => (
                  <li key={l.value} className="text-xs text-gray-600 flex justify-between">
                    <span>{l.label}</span>
                    <span className="text-gray-400">{l.points} 分</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-100 text-xs text-gray-600">
            <p>總分 0–9 分對應等級：</p>
            <p className="mt-1 font-medium">
              強（{THRESHOLDS.strong}–9）· 中（{THRESHOLDS.moderate}–{THRESHOLDS.strong - 1}）· 初步（0–{THRESHOLDS.moderate - 1}）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 確認 build 不報錯（語法/import 檢查）**

Run: `npx jest 2>&1 | tail -4`
Expected: 既有測試仍全 PASS（此檔尚無 import 端，僅確認沒打壞）

- [ ] **Step 3: Commit**

```bash
git add src/components/insights/EvidenceRubricModal.jsx
git commit -m "feat(ui): EvidenceRubricModal — 公開評分標準說明（lib 同源）"
```

---

## Task 5: EvidenceScorePanel 元件（TDD）

**Files:**
- Create: `src/components/insights/EvidenceScorePanel.jsx`
- Test: `src/__tests__/components/EvidenceScorePanel.test.jsx`

- [ ] **Step 1: 寫失敗測試**

`src/__tests__/components/EvidenceScorePanel.test.jsx`:

```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EvidenceScorePanel from '../../components/insights/EvidenceScorePanel';

const evidence = { studyType: 2, scale: 1, causality: 2, replication: 1 }; // 進食順序 → 6 中

describe('EvidenceScorePanel', () => {
  it('無評分時不渲染', () => {
    const { container } = render(<EvidenceScorePanel evidence={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('顯示 4 個面向標籤與總分', () => {
    render(<EvidenceScorePanel evidence={evidence} />);
    expect(screen.getByText('研究類型')).toBeInTheDocument();
    expect(screen.getByText('對象與規模')).toBeInTheDocument();
    expect(screen.getByText('因果強度')).toBeInTheDocument();
    expect(screen.getByText('重複驗證')).toBeInTheDocument();
    expect(screen.getByText(/6 \/ 9/)).toBeInTheDocument();
  });

  it('點「了解我們怎麼評分」開啟 rubric modal', () => {
    render(<EvidenceScorePanel evidence={evidence} />);
    expect(screen.queryByText('我們怎麼評證據力')).toBeNull();
    fireEvent.click(screen.getByText(/了解我們怎麼評分/));
    expect(screen.getByText('我們怎麼評證據力')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest EvidenceScorePanel -v`
Expected: FAIL（找不到模組）

- [ ] **Step 3: 實作元件**

`src/components/insights/EvidenceScorePanel.jsx`:

```jsx
'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { DIMENSIONS, scoreEvidence, dimDisplay, TONE_CLASSES } from '@/lib/evidenceStrength';
import EvidenceRubricModal from './EvidenceRubricModal';

// 逐項評分面板：頂部等級、4 面向（mini 訊號格 + 等級標籤）、總分、評分標準連結。
export default function EvidenceScorePanel({ evidence }) {
  const [rubricOpen, setRubricOpen] = useState(false);
  const score = scoreEvidence(evidence);
  if (!score) return null;
  const tone = TONE_CLASSES[score.tier];

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3" data-testid="evidence-score-panel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-extrabold text-gray-700">證據力評分</span>
        <span className={`text-[11px] font-bold ${tone.text}`}>{score.tierLabel}</span>
      </div>

      <div className="space-y-1.5">
        {DIMENSIONS.map((dim) => {
          const d = dimDisplay(dim.key, evidence[dim.key]);
          const t = TONE_CLASSES[d.tone];
          return (
            <div key={dim.key} className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-gray-600">{dim.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">{d.label}</span>
                <span className="inline-flex items-end gap-[2px] h-[11px]" aria-hidden="true">
                  {[4, 7, 11].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: h }}
                      className={`w-[3px] rounded-[1px] ${t.bar} ${i < d.filled ? 'opacity-100' : 'opacity-25'}`}
                    />
                  ))}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-200">
        <span className="text-[11px] text-gray-500">總分</span>
        <span className={`text-xs font-extrabold ${tone.text}`}>{score.total} / 9 → 證據力 {score.tierLabel}</span>
      </div>

      <button
        type="button"
        onClick={() => setRubricOpen(true)}
        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:text-emerald-800 mt-2 transition-colors"
      >
        了解我們怎麼評分 <ArrowRight size={11} />
      </button>

      <EvidenceRubricModal isOpen={rubricOpen} onClose={() => setRubricOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx jest EvidenceScorePanel -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/insights/EvidenceScorePanel.jsx src/__tests__/components/EvidenceScorePanel.test.jsx
git commit -m "feat(ui): EvidenceScorePanel — 逐項評分面板 + 測試"
```

---

## Task 6: 整合進 HabitInsightSection 的 InsightCard

**Files:**
- Modify: `src/components/insights/HabitInsightSection.jsx`（`InsightCard`，line 41–151）
- Test: `src/__tests__/components/HabitInsightSection.test.jsx`（追加測試）

- [ ] **Step 1: 追加失敗測試**

在 `src/__tests__/components/HabitInsightSection.test.jsx` 檔尾（最後一個 `});` 之後）追加：

```jsx
describe('HabitInsightSection — 證據力 badge', () => {
  const withEvidence = (ev) => insight({ evidence: ev });

  test('有 evidence 時顯示 badge', async () => {
    mockFetchOnce([withEvidence({ studyType: 2, scale: 1, causality: 2, replication: 1 })]);
    render(<HabitInsightSection habitId="h1" />);
    expect(await screen.findByText(/證據力 中/)).toBeInTheDocument();
  });

  test('點 badge 展開評分面板，但不展開卡片摘要', async () => {
    mockFetchOnce([withEvidence({ studyType: 2, scale: 1, causality: 2, replication: 1 })]);
    render(<HabitInsightSection habitId="h1" />);
    const badge = await screen.findByText(/證據力 中/);
    expect(screen.queryByTestId('evidence-score-panel')).toBeNull();
    fireEvent.click(badge);
    // 面板出現
    expect(screen.getByTestId('evidence-score-panel')).toBeInTheDocument();
    // 卡片摘要未出現（點 badge 不應展開卡片 layer 2）
    expect(screen.queryByText(/JAMA 2024 研究發現/)).toBeNull();
  });

  test('無 evidence 時不顯示 badge', async () => {
    mockFetchOnce([insight()]); // 預設無 evidence 欄位
    render(<HabitInsightSection habitId="h1" />);
    await screen.findByText(/減少讓細胞老化的飲食訊號/); // 卡片 headline 已渲染
    expect(screen.queryByText(/證據力/)).toBeNull();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest HabitInsightSection -v`
Expected: 新增 3 個測試 FAIL（badge 尚未整合）

- [ ] **Step 3: 改 import（line 1–6 區塊）**

把 `HabitInsightSection.jsx` 最上方 import 區（`import { BookOpen, ... } from 'lucide-react';` 之後）加入兩行：

```jsx
import EvidenceBadge from './EvidenceBadge';
import EvidenceScorePanel from './EvidenceScorePanel';
```

- [ ] **Step 4: 改 InsightCard 的 state 與 Layer 1（取代 line 41–74 區塊）**

把 `InsightCard` 內 `const [expanded, setExpanded] = useState(false);` 那行下方加一行 state：

```jsx
    const [scoreOpen, setScoreOpen] = useState(false);
```

然後把現有「Layer 1: headline row」整段 `<button ...>...</button>`（含 `<p>` 與 chevron 的那個外層 button）**整段替換**為下列（badge 改為與 headline 平行、各自獨立 button，避免 button 巢狀）：

```jsx
            {/* Layer 1: badge（獨立）+ headline row */}
            <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        {insight.evidence && (
                            <div className="mb-1.5">
                                <EvidenceBadge
                                    evidence={insight.evidence}
                                    active={scoreOpen}
                                    onClick={(e) => { e.stopPropagation(); setScoreOpen(v => !v); }}
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setExpanded(v => !v)}
                            aria-expanded={expanded}
                            className="w-full text-left"
                        >
                            <p
                                className={`text-sm leading-snug ${
                                    hasTakeaway ? 'text-emerald-900 font-medium' : 'text-gray-800 font-bold'
                                }`}
                            >
                                {hasTakeaway ? `「${headline}」` : headline}
                            </p>
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        aria-label={expanded ? '收合' : '展開'}
                        className="text-gray-400 flex-shrink-0 mt-0.5"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {/* 證據力評分面板 — 由 badge 切換，獨立於卡片展開狀態 */}
                {scoreOpen && insight.evidence && (
                    <div className="mt-2">
                        <EvidenceScorePanel evidence={insight.evidence} />
                    </div>
                )}
            </div>
```

> 註：原本整列是一個大 `<button>`，現改成 `<div>` 內含兩個獨立 button（headline + chevron）與 badge button，因為 button 不能巢狀。Layer 2（展開後的 `{expanded && (...)}` 區塊）維持不變，但其外層原本接在 button 後面 — 確認它仍是 `<article>` 的直接子節點、緊接在上面這個新的 `<div className="p-3">` 之後。

- [ ] **Step 5: 跑測試確認通過**

Run: `npx jest HabitInsightSection -v`
Expected: 全部 PASS（含原有 + 新增 3 個）

- [ ] **Step 6: build 驗證（確認 JSX 沒打壞 + client import lib 正常）**

Run: `npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: `✓ Compiled successfully`（dynamic server 警告為既有、可忽略）

- [ ] **Step 7: Commit**

```bash
git add src/components/insights/HabitInsightSection.jsx src/__tests__/components/HabitInsightSection.test.jsx
git commit -m "feat(ui): InsightCard 整合證據力 badge + 點擊展開評分面板"
```

---

## Task 7: Admin 表單 — 4 面向下拉 + 即時 tier 預覽

**Files:**
- Modify: `src/app/admin/dashboard/habits/components/HabitInsightFormModal.jsx`

- [ ] **Step 1: import lib（line 3–4 區塊）**

在 `import { X, Save, Loader, Plus, Trash2 } from 'lucide-react';` 下方加：

```jsx
import { DIMENSIONS, scoreEvidence } from '@/lib/evidenceStrength';
```

- [ ] **Step 2: EMPTY_FORM 加 evidence（取代 line 26–35）**

```jsx
const EMPTY_FORM = {
    title: '',
    summary: '',
    detail: '',
    takeaway: '',
    sources: [],
    tags: '',  // comma-separated in the form, split into array on save
    status: 'draft',
    order: 0,
    evidence: { studyType: 2, scale: 1, causality: 1, replication: 1 }, // 預設一組中性值
};
```

- [ ] **Step 3: toFormShape 帶入 evidence（在 line 47 `order:` 那行下方、`};` 之前加一行）**

```jsx
        evidence: (initial && initial.evidence) ? initial.evidence : { studyType: 2, scale: 1, causality: 1, replication: 1 },
```

- [ ] **Step 4: toPayload 帶出 evidence（在 line 66 `order:` 那行下方、`};` 之前加一行）**

```jsx
        evidence: form.evidence,
```

- [ ] **Step 5: 在「狀態 + 順序」grid 區塊（line 288 `{/* Status + Order ... */}`）之前插入評分 UI**

```jsx
                    {/* 證據力評分 — 4 面向下拉 + 即時 tier 預覽 */}
                    <div className="pt-2 border-t border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <label className="admin-label !mb-0">證據力評分</label>
                            {(() => {
                                const s = scoreEvidence(form.evidence);
                                return (
                                    <span className="text-xs font-bold text-emerald-300">
                                        {s ? `${s.total} / 9 → 證據力 ${s.tierLabel}` : '未完整'}
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {DIMENSIONS.map((dim) => (
                                <div key={dim.key}>
                                    <label className="text-[11px] text-gray-400 block mb-1">{dim.label}</label>
                                    <select
                                        className="admin-input admin-select w-full"
                                        value={form.evidence[dim.key]}
                                        onChange={e => setForm(f => ({
                                            ...f,
                                            evidence: { ...f.evidence, [dim.key]: Number(e.target.value) },
                                        }))}
                                    >
                                        {dim.levels.map(l => (
                                            <option key={l.value} value={l.value}>{l.label}（{l.points}）</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">分數衡量「證據有多硬」，非「習慣多好」。</p>
                    </div>

```

- [ ] **Step 6: 手動驗證（admin 表單為互動 UI，以 build 驗證取代單元測試）**

Run: `npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: `✓ Compiled successfully`

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/dashboard/habits/components/HabitInsightFormModal.jsx
git commit -m "feat(admin): 科學佐證表單 — 4 面向評分下拉 + 即時等級預覽"
```

---

## Task 8: Admin 寫入路由帶入 evidence

**Files:**
- Modify: `src/app/api/admin/habits/[habitId]/insights/route.js`（POST）
- Modify: `src/app/api/admin/habits/insights/[id]/route.js`（PATCH）

- [ ] **Step 1: POST route — import + 解構 + 寫入**

`[habitId]/insights/route.js`：

1. 在 `import { prisma } from '@/lib/prisma';` 下方加：
```js
import { sanitizeEvidence } from '@/lib/evidenceStrength';
```
2. 在 body 解構（`const { title, ... sourcePrompt } = body;`）加入 `evidence`：
```js
        const {
            title, summary, detail, takeaway, sources, tags,
            status, order, aiGenerated, sourcePrompt, evidence,
        } = body;
```
3. 在 `prisma.habitInsight.create({ data: { ... } })` 的 data 物件，於 `sourcePrompt: sourcePrompt || null,` 下方加：
```js
                evidence: sanitizeEvidence(evidence),
```

- [ ] **Step 2: PATCH route — import + 條件寫入**

`insights/[id]/route.js`：

1. 在 `import { prisma } from '@/lib/prisma';` 下方加：
```js
import { sanitizeEvidence } from '@/lib/evidenceStrength';
```
2. 在 `if (body.order !== undefined && Number.isFinite(body.order)) { data.order = body.order; }` 下方加：
```js
        if (body.evidence !== undefined) {
            // sanitizeEvidence 回 null 代表清除評分；合法物件則寫入。
            data.evidence = sanitizeEvidence(body.evidence);
        }
```

- [ ] **Step 3: build 驗證**

Run: `npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/habits/[habitId]/insights/route.js src/app/api/admin/habits/insights/[id]/route.js
git commit -m "feat(api): admin 建立/更新科學佐證寫入 evidence（sanitize）"
```

---

## Task 9: 種子 backfill 現有 6 則

**Files:**
- Modify: `prisma/seed/habit-insights.json`
- Modify: `scripts/seed-habit-insights.js`

- [ ] **Step 1: seed 腳本帶入 evidence**

`scripts/seed-habit-insights.js`：
1. 解構（`const { habitName, title, ... sourcePrompt } = entry;`）加 `evidence`：
```js
        const { habitName, title, summary, detail, takeaway, sources, tags, status, order, aiGenerated, sourcePrompt, evidence } = entry;
```
2. 在 `const data = { ... }` 物件，於 `sourcePrompt: sourcePrompt || null,` 下方加：
```js
            evidence: (evidence && typeof evidence === 'object') ? evidence : null,
```

- [ ] **Step 2: 為 6 則加 evidence 值**

在 `prisma/seed/habit-insights.json` 每個物件加一個 `evidence` 欄位（建議放在 `sourcePrompt` 之後）。對應值：

| title 開頭 | evidence |
|------|------|
| 添加糖與細胞老化 | `{ "studyType": 1, "scale": 2, "causality": 0, "replication": 0 }` |
| 過量果糖造成類酒精性肝損傷 | `{ "studyType": 0, "scale": 0, "causality": 0, "replication": 1 }` |
| 進食順序能壓平餐後血糖尖峰 | `{ "studyType": 2, "scale": 1, "causality": 2, "replication": 1 }` |
| 多咀嚼會送出「吃飽了」的訊號 | `{ "studyType": 2, "scale": 1, "causality": 1, "replication": 0 }` |
| 168 斷食的減重效果其實有限 | `{ "studyType": 2, "scale": 2, "causality": 2, "replication": 2 }` |
| 高劑量 Omega-3 能明顯降三酸甘油酯 | `{ "studyType": 3, "scale": 2, "causality": 2, "replication": 2 }` |

範例（第一則）：
```json
    "aiGenerated": false,
    "sourcePrompt": null,
    "evidence": { "studyType": 1, "scale": 2, "causality": 0, "replication": 0 }
```

- [ ] **Step 3: 驗證 JSON 合法**

Run: `node -e "const d=require('./prisma/seed/habit-insights.json'); d.forEach(e=>console.log(e.title, '→', JSON.stringify(e.evidence)))"`
Expected: 6 行，每行印出對應 evidence 物件（無 undefined）

- [ ] **Step 4: 跑種子寫入 DB**

Run: `node scripts/seed-habit-insights.js`
Expected: `Updated` 6 筆（evidence 寫入既有列）、`Skipped: 0`

- [ ] **Step 5: 確認 jest 全綠 + Commit**

Run: `npx jest 2>&1 | tail -4`
Expected: 全 PASS

```bash
git add prisma/seed/habit-insights.json scripts/seed-habit-insights.js
git commit -m "content: backfill 6 則科學佐證 evidence 評分 + seed 帶入"
```

---

## 完成後

- 全套測試綠燈、`npm run build:local` 成功。
- 6 則既有 insight 皆有證據力 badge（其中 2 則 published 會在客戶端顯示 badge；4 則 draft 僅 admin 可見）。
- 接 `superpowers:finishing-a-development-branch` 收尾（合併/推送決策）。
