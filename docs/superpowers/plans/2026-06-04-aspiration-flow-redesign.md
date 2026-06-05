# 「從嚮往開始」流程體驗優化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「從嚮往開始」流程改成更明顯的入口（＋ 三選一）、更有設計感的嚮往句卡（領域 icon tab）、更豐富的推薦面板（含證據力 badge），不改推薦比對邏輯。

**Architecture:** 新增 `AddFlowChooser`（＋ 入口分流）；`AspirationPicker` 保留所有資料/送出邏輯，只重做 'pick' 步驟 render（領域 icon tab + 漸層嚮往卡）；`AspirationRecommendationPanel` 重做 header（情境漸層 + 身分）與習慣卡（重用 `EvidenceBadge`）；recommendations API 多 include 已發布 insights 的 evidence。無 schema 變更。

**Tech Stack:** Next.js 14、React 18、Tailwind、lucide-react、Jest + RTL。重用 `domainToIconKey`/`CATEGORY_CONFIG`/`IconRenderer`/`EvidenceBadge`/`scoreEvidence`。

**Spec:** `docs/superpowers/specs/2026-06-04-aspiration-flow-redesign-design.md`

**所有指令於 `web-app/` 執行。** git 身分未設先跑：`git config user.email "dev@habitnext.local" && git config user.name "HabitNext Dev"`

---

## 檔案結構

| 檔案 | 動作 |
|------|------|
| `src/components/AddFlowChooser.jsx` | 建立 — ＋ 三選一 chooser |
| `src/__tests__/components/AddFlowChooser.test.jsx` | 建立 |
| `src/components/MainApp.jsx` | 修改 — ＋/onOpenAddFlow 開 chooser、桌機側欄加「從嚮往開始」鈕、render chooser |
| `src/app/api/aspirations/[id]/recommendations/route.js` | 修改 — habits include 已發布 insights.evidence |
| `src/components/AspirationPicker.jsx` | 修改 — 'pick' 步驟改領域 icon tab + 漸層嚮往卡 |
| `src/components/AspirationRecommendationPanel.jsx` | 修改 — header 情境漸層 + 習慣卡證據力 badge |
| `src/__tests__/components/AspirationPicker.test.jsx` | 建立（若無）/ 追加 |
| `src/__tests__/components/AspirationRecommendationPanel.test.jsx` | 建立（若無）/ 追加 |

---

## Task 1: AddFlowChooser ＋ MainApp 入口串接（TDD）

**Files:** Create `src/components/AddFlowChooser.jsx`、`src/__tests__/components/AddFlowChooser.test.jsx`；Modify `src/components/MainApp.jsx`

- [ ] **Step 1: 寫失敗測試** `src/__tests__/components/AddFlowChooser.test.jsx`
```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddFlowChooser from '../../components/AddFlowChooser';

describe('AddFlowChooser', () => {
  it('關閉時不渲染', () => {
    const { container } = render(<AddFlowChooser isOpen={false} onClose={()=>{}} onAspiration={()=>{}} onExplore={()=>{}} onLibrary={()=>{}} />);
    expect(container.firstChild).toBeNull();
  });
  it('三條路徑各自觸發 callback', () => {
    const onAspiration = jest.fn(), onExplore = jest.fn(), onLibrary = jest.fn();
    render(<AddFlowChooser isOpen onClose={()=>{}} onAspiration={onAspiration} onExplore={onExplore} onLibrary={onLibrary} />);
    fireEvent.click(screen.getByText('從嚮往開始'));
    fireEvent.click(screen.getByText('探索計畫'));
    fireEvent.click(screen.getByText('瀏覽習慣庫'));
    expect(onAspiration).toHaveBeenCalledTimes(1);
    expect(onExplore).toHaveBeenCalledTimes(1);
    expect(onLibrary).toHaveBeenCalledTimes(1);
  });
});
```
Run: `npx jest AddFlowChooser -v` → FAIL（找不到模組）。

- [ ] **Step 2: 實作** `src/components/AddFlowChooser.jsx`
```jsx
'use client';

import React from 'react';
import { X, Sparkles, BookOpen, Search, ChevronRight } from 'lucide-react';

// ＋ 新增的三選一入口。手機 bottom-sheet、桌機置中。從嚮往開始為置頂 hero（主推）。
export default function AddFlowChooser({ isOpen, onClose, onAspiration, onExplore, onLibrary }) {
  if (!isOpen) return null;
  const pick = (fn) => () => { onClose?.(); fn?.(); };
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl p-5 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">想新增什麼？</h3>
          <button onClick={onClose} aria-label="關閉" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Hero — 從嚮往開始 */}
        <button
          type="button"
          onClick={pick(onAspiration)}
          className="relative w-full text-left overflow-hidden rounded-2xl p-4 mb-3 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all"
        >
          <Sparkles size={62} className="absolute -right-2 -bottom-3 opacity-20" />
          <div className="relative">
            <p className="font-extrabold text-base">從嚮往開始</p>
            <p className="text-xs opacity-90 mt-1 leading-relaxed">不知從何下手？從你想成為的樣子出發，我們幫你配習慣。</p>
          </div>
        </button>

        {/* 兩個次要路徑 */}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={pick(onExplore)} className="border border-gray-200 rounded-xl p-3 text-center hover:border-emerald-300 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-1.5"><BookOpen size={18} /></div>
            <p className="text-xs font-bold text-gray-700">探索計畫</p>
          </button>
          <button type="button" onClick={pick(onLibrary)} className="border border-gray-200 rounded-xl p-3 text-center hover:border-emerald-300 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1.5"><Search size={18} /></div>
            <p className="text-xs font-bold text-gray-700">瀏覽習慣庫</p>
          </button>
        </div>
      </div>
    </div>
  );
}
```
Run: `npx jest AddFlowChooser -v` → PASS。

- [ ] **Step 3: MainApp 串接 — import + state**
在 `src/components/MainApp.jsx` import 區加：
```jsx
import AddFlowChooser from './AddFlowChooser';
```
在 state 區（`isAspirationPickerOpen` 附近）加：
```jsx
    const [isAddChooserOpen, setIsAddChooserOpen] = useState(false);
```

- [ ] **Step 4: MainApp — 手機「＋」改開 chooser**
找到 `onOpenAddFlow={() => {` 傳給 `<AppHeader>` 的那個 handler（目前內容會 `setIsLibraryModalOpen(true)` 等）。把該 handler 整個改為只開 chooser：
```jsx
                    onOpenAddFlow={() => setIsAddChooserOpen(true)}
```

- [ ] **Step 5: MainApp — 桌機側欄加「從嚮往開始」鈕**
在桌機側欄（`<aside className="hidden md:flex ...">` 內）現有「探索計畫」按鈕之前，加入：
```jsx
                        <button
                            onClick={() => setIsAspirationPickerOpen(true)}
                            className="w-full bg-gradient-to-r from-emerald-400 to-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mb-4"
                        >
                            <Sparkles size={20} /> 從嚮往開始
                        </button>
```
（確認 `Sparkles` 已從 lucide-react import；MainApp 第 5 行 import 清單若無則加入 `Sparkles`。）

- [ ] **Step 6: MainApp — render chooser**
在 render 區（靠近 `<TemplateExplorer ... />` / `<AspirationPicker ... />` 那群 modal）加：
```jsx
            <AddFlowChooser
                isOpen={isAddChooserOpen}
                onClose={() => setIsAddChooserOpen(false)}
                onAspiration={() => setIsAspirationPickerOpen(true)}
                onExplore={() => setIsTemplateExplorerOpen(true)}
                onLibrary={() => { setEditingTask(null); setIsLibraryModalOpen(true); }}
            />
```

- [ ] **Step 7: build + jest**
Run: `npx jest AddFlowChooser -v && npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: PASS、`✓ Compiled successfully`。

- [ ] **Step 8: Commit**
```bash
git add src/components/AddFlowChooser.jsx src/__tests__/components/AddFlowChooser.test.jsx src/components/MainApp.jsx
git commit -m "feat(ui): AddFlowChooser — ＋ 三選一入口（從嚮往開始置頂）+ MainApp 串接"
```

---

## Task 2: recommendations API 附帶證據力

**Files:** Modify `src/app/api/aspirations/[id]/recommendations/route.js`

- [ ] **Step 1: 改 officialHabit 查詢加 include**
把
```js
            prisma.officialHabit.findMany({ where: { isActive: true } }),
```
改為
```js
            prisma.officialHabit.findMany({
                where: { isActive: true },
                include: { insights: { where: { status: 'published' }, select: { evidence: true } } },
            }),
```
（`filterRecommendedHabits` 只依 category 過濾，回傳的 habit 物件會原樣帶著 `insights` 陣列，前端即可取用。）

- [ ] **Step 2: build 驗證**
Run: `npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: `✓ Compiled successfully`。

- [ ] **Step 3: Commit**
```bash
git add "src/app/api/aspirations/[id]/recommendations/route.js"
git commit -m "feat(api): 嚮往推薦的習慣附帶已發布科學佐證 evidence"
```

---

## Task 3: AspirationPicker — 領域 icon tab + 漸層嚮往卡

**Files:** Modify `src/components/AspirationPicker.jsx`；Create/append `src/__tests__/components/AspirationPicker.test.jsx`

先 Read 整個 `AspirationPicker.jsx`，確認既有：`presetsByDomain`(Map domain→presets)、`personalised`、`existing`、`beginPick({text,domain,source})`、`pickExisting`、`submitCustom`、`customMode/customText/customDomain`、`step('pick'|'identity')`。**全部保留**，本任務只改 'pick' 步驟的 render 與新增 `activeTab` 狀態。

- [ ] **Step 1: 寫失敗測試** `src/__tests__/components/AspirationPicker.test.jsx`（若已存在則追加 describe）
```jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AspirationPicker from '../../components/AspirationPicker';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('/api/aspirations?')) {
      return Promise.resolve({ ok: true, json: async () => [] }); // 無既有嚮往
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
});
afterEach(() => jest.restoreAllMocks());

describe('AspirationPicker — 領域 tab', () => {
  it('渲染領域 tab，切到「飲食」後該 tab 選中且出現自訂入口', async () => {
    render(<AspirationPicker isOpen onClose={()=>{}} userId="u1" onSelectAspiration={()=>{}} />);
    const dietTab = await screen.findByRole('tab', { name: '飲食' });
    fireEvent.click(dietTab);
    expect(dietTab).toHaveAttribute('aria-selected', 'true');
    // 每個領域底部都有的自訂入口（不依賴特定 preset 文字，較穩健）
    expect(await screen.findByText('＋ 自己寫一句嚮往')).toBeInTheDocument();
  });
});
```
Run: `npx jest AspirationPicker -v` → FAIL。

- [ ] **Step 2: 加 `activeTab` 狀態 + 預設選領域**
在 state 區加：
```jsx
    const [activeTab, setActiveTab] = useState(null); // 當前領域 tab
```
在「Reset transient state」的 useEffect（`if (!isOpen) return;` 開頭那個）內，重設 activeTab 為使用者分型對應領域或第一個領域。加：
```jsx
        // 預設選中：分型對應領域（getPersonalisedPresets 的首個命中領域）或第一個。
        const firstPersonalisedDomain = personalised[0]?.domain || GENESIS_DOMAINS[0];
        setActiveTab(firstPersonalisedDomain);
```
（`personalised` 於 useMemo 定義在此 effect 之後也沒關係 — 它是純 memo，effect 執行時已可讀；若 lint 抱怨相依，把 `personalised` 加進 effect deps。）

- [ ] **Step 3: import 圖示工具**
確認頂部已 import：`IconRenderer`（`@/components/IconRenderer`）與 `CATEGORY_CONFIG`、`domainToIconKey`（`@/lib/constants`）。若無則加：
```jsx
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG, domainToIconKey } from '@/lib/constants';
```

- [ ] **Step 4: 取代 'pick' 步驟的清單 render**
找到 render 中 `step === 'pick'` 時呈現「三排清單」的整個區塊（個人化 / 已有 / 領域分組 presets + 自訂），整段替換為下列（領域 tab + 該領域漸層嚮往卡 + 該領域既有嚮往 + 自訂）：
```jsx
                        {/* 領域 icon tab（橫向可滑） */}
                        <div role="tablist" className="flex gap-2 overflow-x-auto px-1 pb-2 -mx-1 no-scrollbar border-b border-gray-100">
                            {GENESIS_DOMAINS.map(domain => {
                                const cfg = CATEGORY_CONFIG[domainToIconKey(domain)];
                                const on = activeTab === domain;
                                return (
                                    <button
                                        key={domain}
                                        role="tab"
                                        aria-selected={on}
                                        aria-label={domain}
                                        onClick={() => { setActiveTab(domain); setCustomMode(false); }}
                                        className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-colors ${on ? '' : 'opacity-60'}`}
                                    >
                                        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${on ? (cfg?.bg || 'bg-emerald-100') : 'bg-gray-100'}`}>
                                            <IconRenderer category={domain} size={18} />
                                        </span>
                                        <span className={`text-[10px] font-bold whitespace-nowrap ${on ? 'text-gray-700' : 'text-gray-400'}`}>{domain}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 當前領域的嚮往卡 */}
                        {activeTab && (() => {
                            const cfg = CATEGORY_CONFIG[domainToIconKey(activeTab)];
                            const tint = cfg?.color || '#10b981';
                            const recSet = new Set(personalised.filter(p => p.domain === activeTab).map(p => p.text));
                            const domainPresets = presetsByDomain.get(activeTab) || [];
                            // 推薦（personalised）置頂
                            const ordered = [...domainPresets].sort((a, b) => (recSet.has(b.text) ? 1 : 0) - (recSet.has(a.text) ? 1 : 0));
                            const existingInDomain = existing.filter(a => a.domain === activeTab);
                            return (
                                <div className="space-y-2.5 mt-3">
                                    {existingInDomain.map(a => (
                                        <button key={a.id} type="button" onClick={() => pickExisting(a)}
                                            className="w-full text-left rounded-2xl p-3.5 border border-emerald-200 bg-emerald-50/60 hover:shadow-sm transition-all">
                                            <span className="text-[10px] font-bold text-emerald-600">已建立 · 繼續用</span>
                                            <p className="text-sm font-bold text-gray-800 mt-0.5">{a.text}</p>
                                        </button>
                                    ))}
                                    {ordered.map(p => (
                                        <button key={p.text} type="button" onClick={() => beginPick({ text: p.text, domain: activeTab, source: 'preset' })}
                                            disabled={submittingText === p.text}
                                            className="relative w-full text-left overflow-hidden rounded-2xl p-3.5 hover:-translate-y-0.5 hover:shadow-md transition-all"
                                            style={{ background: `linear-gradient(135deg, ${tint}14, ${tint}26)`, border: `1px solid ${tint}33` }}>
                                            <span className="absolute -right-2 -bottom-3 opacity-10" aria-hidden><IconRenderer category={activeTab} size={62} /></span>
                                            {recSet.has(p.text) && (
                                                <span className="absolute top-2.5 right-3 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full px-2 py-0.5 z-10">為你推薦</span>
                                            )}
                                            <p className="relative text-sm font-bold text-gray-800 leading-snug pr-12">{p.text}</p>
                                        </button>
                                    ))}
                                    {/* 自訂 */}
                                    {!customMode ? (
                                        <button type="button" onClick={() => { setCustomMode(true); setCustomDomain(activeTab); }}
                                            className="w-full rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">
                                            ＋ 自己寫一句嚮往
                                        </button>
                                    ) : (
                                        <div className="rounded-2xl border border-emerald-200 p-3 space-y-2">
                                            <input type="text" autoFocus value={customText} maxLength={CUSTOM_TEXT_MAX}
                                                onChange={e => setCustomText(e.target.value)} placeholder="我想…"
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => { setCustomMode(false); setCustomText(''); }}
                                                    className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold">取消</button>
                                                <button type="button" onClick={submitCustom} disabled={!customText.trim()}
                                                    className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">下一步</button>
                                            </div>
                                        </div>
                                    )}
                                    {error && <p className="text-xs text-red-500">{error}</p>}
                                </div>
                            );
                        })()}
```
註：`submitCustom` 內已用 `customDomain`；上方按鈕設 `setCustomDomain(activeTab)` 後即正確。`beginPick`/`pickExisting`/identity 子步驟 render 全部不動。

- [ ] **Step 5: jest + build**
Run: `npx jest AspirationPicker -v && npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: PASS、`✓ Compiled successfully`。

- [ ] **Step 6: Commit**
```bash
git add src/components/AspirationPicker.jsx src/__tests__/components/AspirationPicker.test.jsx
git commit -m "feat(ui): 嚮往選擇器改版 — 領域 icon tab + 漸層嚮往卡 + 為你推薦置頂"
```

---

## Task 4: AspirationRecommendationPanel — 情境漸層 header + 習慣卡證據力 badge

**Files:** Modify `src/components/AspirationRecommendationPanel.jsx`；Create/append `src/__tests__/components/AspirationRecommendationPanel.test.jsx`

先 Read 整個檔，確認既有：fetch recommendations、`handlePickTemplate`/`handlePickHabit`/`handleAddCandidate`、`candidateAddedIds`、`templates`/`habits`、`onBack`/`onSkip` 等。**全部保留**，本任務改 header 與習慣卡視覺、加證據力 badge。

- [ ] **Step 1: import 工具**
頂部 import 加：
```jsx
import EvidenceBadge from './insights/EvidenceBadge';
import { scoreEvidence } from '@/lib/evidenceStrength';
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG, domainToIconKey } from '@/lib/constants';
```

- [ ] **Step 2: 寫失敗測試** `src/__tests__/components/AspirationRecommendationPanel.test.jsx`
```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import AspirationRecommendationPanel from '../../components/AspirationRecommendationPanel';

const ASP = { id: 'a1', text: '我想睡得更好', domain: '壓力與睡眠', identity: '早睡的人' };
const PAYLOAD = {
  aspiration: ASP, templates: [],
  habits: [
    { id: 'h1', name: '睡前 1 小時不看手機', category: '壓力與睡眠', difficulties: {}, insights: [{ evidence: { studyType: 2, scale: 1, causality: 2, replication: 2 } }] },
    { id: 'h2', name: '泡熱水澡', category: '壓力與睡眠', difficulties: {}, insights: [] },
  ],
};
beforeEach(() => { global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => PAYLOAD })); });
afterEach(() => jest.restoreAllMocks());

describe('AspirationRecommendationPanel', () => {
  it('header 顯示嚮往與身分', async () => {
    render(<AspirationRecommendationPanel aspiration={ASP} onBack={()=>{}} />);
    expect(await screen.findByText('我想睡得更好')).toBeInTheDocument();
    expect(screen.getByText(/早睡的人/)).toBeInTheDocument();
  });
  it('有已發布佐證的習慣顯示證據力 badge、無佐證的不顯示', async () => {
    render(<AspirationRecommendationPanel aspiration={ASP} onBack={()=>{}} />);
    expect(await screen.findByText(/證據力/)).toBeInTheDocument(); // h1 有
    // h2 無 insights → 不應再多一個；至少確認 h2 名稱在、且只一個 badge
    expect(screen.getByText('泡熱水澡')).toBeInTheDocument();
    expect(screen.getAllByText(/證據力/).length).toBe(1);
  });
});
```
Run: `npx jest AspirationRecommendationPanel -v` → FAIL。

- [ ] **Step 3: 加「取最高證據力」helper（檔內，元件外）**
在元件函式外、檔案上方加：
```jsx
// 從習慣的已發布 insights 取「最高 total」的 evidence；無則 null。
function topEvidenceOf(habit) {
  const list = Array.isArray(habit?.insights) ? habit.insights : [];
  let best = null, bestTotal = -1;
  for (const ins of list) {
    const s = scoreEvidence(ins?.evidence);
    if (s && s.total > bestTotal) { best = ins.evidence; bestTotal = s.total; }
  }
  return best;
}
```

- [ ] **Step 4: 改 header — 情境漸層 + 身分**
把現有 header 區塊（`{/* Header: back arrow + the aspiration text */}` 那個 `<div className="px-5 py-4 border-b ...">...</div>`）替換為：
```jsx
                {/* Header: 情境漸層條 + 返回 + 身分 */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-5 py-4 rounded-t-2xl md:rounded-t-2xl">
                    <span className="absolute -right-3 -bottom-4 opacity-15" aria-hidden><IconRenderer category={aspiration.domain} size={64} /></span>
                    <div className="relative flex items-start gap-3">
                        <button type="button" onClick={onBack} aria-label="返回" className="p-1 -m-1 text-white/90 hover:text-white flex-shrink-0 mt-0.5">
                            <ArrowLeft size={22} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold opacity-85 tracking-wider">你的嚮往</p>
                            <h3 id="aspiration-rec-title" className="font-extrabold text-base leading-snug break-words mt-0.5">{aspiration.text}</h3>
                            {aspiration.identity && (
                                <span className="inline-block mt-2 bg-white/90 text-emerald-700 text-[10px] font-extrabold rounded-full px-2.5 py-0.5">成為「{aspiration.identity}」</span>
                            )}
                        </div>
                    </div>
                </div>
```

- [ ] **Step 5: 習慣卡加證據力 badge + 領域 icon**
找到 render 中「推薦習慣」section 內、map `habits` 產生每張習慣卡的地方（`HabitCard` 內部或 inline）。在習慣名稱旁加證據力 badge：在習慣卡的標題區下方插入：
```jsx
                                        {(() => { const ev = topEvidenceOf(habit); return ev ? (
                                            <div className="mt-1"><EvidenceBadge evidence={ev} /></div>
                                        ) : null; })()}
```
（`EvidenceBadge` 無 onClick 時點擊為 no-op，作為靜態標籤呈現。若習慣卡是獨立 `HabitCard` 子元件且未收到 `habit.insights`，確認 `habit` 物件原樣傳入即可 — Task 2 已讓 API 帶 insights。）
若要替換習慣卡左側圖示為領域色 icon，可用 `<IconRenderer category={habit.category} size={18} />` 搭配 `CATEGORY_CONFIG[domainToIconKey(habit.category)]?.bg` 當底色（非必要，視現有卡片結構而定；保持最小改動）。

- [ ] **Step 6: jest + build**
Run: `npx jest AspirationRecommendationPanel -v && npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: PASS、`✓ Compiled successfully`。

- [ ] **Step 7: 全測試**
Run: `npx jest 2>&1 | grep -E "Tests:|Test Suites:"`
Expected: 全 PASS。

- [ ] **Step 8: Commit**
```bash
git add src/components/AspirationRecommendationPanel.jsx src/__tests__/components/AspirationRecommendationPanel.test.jsx
git commit -m "feat(ui): 嚮往推薦面板改版 — 情境漸層 header(身分) + 習慣卡證據力 badge"
```

---

## 完成後

- 全測試綠燈、`npm run build:local` 成功。
- **手機一致性驗收**：手機尺寸下確認 chooser bottom-sheet、領域 icon tab 可橫滑、漸層嚮往卡、推薦面板情境條與證據力 badge、返回／身分子步驟皆正常。
- 接 `superpowers:finishing-a-development-branch`：合併 main + push（無 schema 變更；提醒其他 session 先 pull）。
