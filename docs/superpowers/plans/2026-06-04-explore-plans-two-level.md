# 探索計畫兩層化 + 計畫家族後台可編輯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「探索習慣計畫」改成兩層導覽（第一層花朵/睡眠/其他家族介紹卡 → 第二層子課程選單），並讓家族顯示內容可由後台編輯。

**Architecture:** 新增 `PlanFamily` model 存三個固定家族（flower/sleep/other）的顯示欄位（seed 自現有文案）；公開 + admin API 讀寫；`TemplateExplorer` 加 `activeFamily` 狀態做兩層切換；家族成員判定（依 template.category）沿用 `templateRecommendation.js` 不變。

**Tech Stack:** Next.js 14 App Router、React 18、Prisma + PostgreSQL(Neon)、Tailwind、lucide-react、Jest + RTL。

**Spec:** `docs/superpowers/specs/2026-06-04-explore-plans-two-level-design.md`

**所有指令於 `web-app/` 執行。** git 身分若未設定先跑：`git config user.email "dev@habitnext.local" && git config user.name "HabitNext Dev"`

---

## 檔案結構

| 檔案 | 職責 | 動作 |
|------|------|------|
| `prisma/schema.prisma` | `PlanFamily` model | 修改 |
| `scripts/seed-plan-families.js` | seed 3 家族 | 建立 |
| `src/app/api/plan-families/route.js` | 公開 GET（isActive，依 order） | 建立 |
| `src/app/api/admin/plan-families/route.js` | admin GET 全部 | 建立 |
| `src/app/api/admin/plan-families/[slug]/route.js` | admin PATCH | 建立 |
| `src/app/admin/dashboard/templates/families/page.js` | 家族編輯頁 | 建立 |
| `src/app/admin/dashboard/templates/page.js` | 加「計畫家族」入口連結 | 修改 |
| `src/components/TemplateExplorer.jsx` | 兩層導覽 + 第一層家族卡 | 修改 |
| `src/__tests__/components/TemplateExplorer.test.jsx` | 兩層行為測試 | 建立 |

---

## Task 1: PlanFamily schema + seed

**Files:** Modify `prisma/schema.prisma`；Create `scripts/seed-plan-families.js`

- [ ] **Step 1: 加 model**（在 `model PlanCategory { ... }` 之後插入）

```prisma
// 計畫家族 — 探索計畫第一層的三大分類（flower/sleep/other）。固定 3 筆、只編輯顯示；
// 「哪個模板屬於哪個家族」由 lib/templateRecommendation.js 依 category 判定，不存這裡。
model PlanFamily {
  id              String   @id @default(cuid())
  slug            String   @unique // 'flower' | 'sleep' | 'other'（鎖定）
  title           String
  intro           String
  icon            String? // Lucide icon 名稱
  color           String? // hex
  quizPendingCopy String? // 未完成分型測驗的提示（other 為 null）
  order           Int      @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 2: db push + generate**

Run: `npx prisma db push && npx prisma generate`
Expected: `Your database is now in sync with your Prisma schema.`（新增 table，非破壞）

- [ ] **Step 3: 建立 seed 腳本** `scripts/seed-plan-families.js`

```js
// scripts/seed-plan-families.js — idempotent upsert（依 slug）3 個計畫家族。
// Usage: node scripts/seed-plan-families.js
require('./lib/env');
const { PrismaClient } = require('@prisma/client');

const FAMILIES = [
  { slug: 'flower', title: '花朵計畫', intro: '依女性週期身體狀態分型，14 天分階段任務，跟著週期長出新習慣。', icon: 'Flower2', color: '#ec4899', quizPendingCopy: '花朵分型問卷功能開發中 — 目前可以先瀏覽全部，完成後會自動為你推薦最適合的花朵。', order: 0 },
  { slug: 'sleep', title: '睡眠處方', intro: '依睡眠卡點分型（壓力／節律／代謝失衡／荷爾蒙），14 天 4 階段處方。', icon: 'Moon', color: '#6366f1', quizPendingCopy: '睡眠分型問卷功能開發中 — 目前可以先瀏覽全部，完成後會自動為你推薦最適合的處方。', order: 1 },
  { slug: 'other', title: '其他公開計畫', intro: '專家設計的各式主題習慣計畫。', icon: 'LayoutGrid', color: '#10b981', quizPendingCopy: null, order: 2 },
];

async function main() {
  const prisma = new PrismaClient();
  for (const f of FAMILIES) {
    await prisma.planFamily.upsert({
      where: { slug: f.slug },
      update: { title: f.title, intro: f.intro, icon: f.icon, color: f.color, quizPendingCopy: f.quizPendingCopy, order: f.order },
      create: { ...f, isActive: true },
    });
    console.log('+ upsert', f.slug);
  }
  const n = await prisma.planFamily.count();
  console.log(`Done. PlanFamily rows: ${n}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: 跑 seed**

Run: `node scripts/seed-plan-families.js`
Expected: `+ upsert flower / sleep / other`、`PlanFamily rows: 3`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma scripts/seed-plan-families.js
git commit -m "feat(db): PlanFamily model + seed（探索計畫第一層家族）"
```

---

## Task 2: 公開 + admin API

**Files:** Create `src/app/api/plan-families/route.js`、`src/app/api/admin/plan-families/route.js`、`src/app/api/admin/plan-families/[slug]/route.js`

- [ ] **Step 1: 公開 GET** `src/app/api/plan-families/route.js`

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/plan-families — 探索計畫第一層用。只回啟用中的家族，依 order。
export async function GET() {
  try {
    const families = await prisma.planFamily.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(families);
  } catch (error) {
    console.error('Fetch plan families error:', error);
    return NextResponse.json({ error: '取得計畫家族失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 2: admin GET（全部）** `src/app/api/admin/plan-families/route.js`

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/plan-families — 後台編輯用，回全部（含未啟用），依 order。
export async function GET() {
  try {
    const families = await prisma.planFamily.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(families);
  } catch (error) {
    console.error('Admin fetch plan families error:', error);
    return NextResponse.json({ error: '取得計畫家族失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 3: admin PATCH** `src/app/api/admin/plan-families/[slug]/route.js`

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/plan-families/:slug — 部分更新顯示欄位。slug 不可改。
export async function PATCH(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const existing = await prisma.planFamily.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ error: '找不到此家族' }, { status: 404 });
    }
    const data = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.intro !== undefined) data.intro = String(body.intro).trim();
    if (body.icon !== undefined) data.icon = body.icon ? String(body.icon).trim() : null;
    if (body.color !== undefined) data.color = body.color ? String(body.color).trim() : null;
    if (body.quizPendingCopy !== undefined) data.quizPendingCopy = body.quizPendingCopy ? String(body.quizPendingCopy).trim() : null;
    if (body.order !== undefined && Number.isFinite(body.order)) data.order = body.order;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    const updated = await prisma.planFamily.update({ where: { slug }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update plan family error:', error);
    return NextResponse.json({ error: '更新計畫家族失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 4: build 驗證**

Run: `npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: `✓ Compiled successfully`（既有 Dynamic server 警告可忽略）

- [ ] **Step 5: Commit**

```bash
git add src/app/api/plan-families/route.js src/app/api/admin/plan-families/route.js "src/app/api/admin/plan-families/[slug]/route.js"
git commit -m "feat(api): plan-families 公開讀 + admin 讀/更新"
```

---

## Task 3: 後台家族編輯頁

**Files:** Create `src/app/admin/dashboard/templates/families/page.js`；Modify `src/app/admin/dashboard/templates/page.js`（加入口連結）

- [ ] **Step 1: 建立編輯頁** `src/app/admin/dashboard/templates/families/page.js`

```jsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Loader } from 'lucide-react';

const COLOR_OPTIONS = ['#ec4899', '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function PlanFamiliesPage() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState(null);

  useEffect(() => { fetchFamilies(); }, []);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plan-families');
      if (res.ok) setFamilies(await res.json());
    } catch (e) { console.error('fetch families failed', e); }
    finally { setLoading(false); }
  };

  const updateField = (slug, field, value) => {
    setFamilies(fs => fs.map(f => f.slug === slug ? { ...f, [field]: value } : f));
  };

  const save = async (fam) => {
    setSavingSlug(fam.slug);
    try {
      const res = await fetch(`/api/admin/plan-families/${fam.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fam.title, intro: fam.intro, icon: fam.icon, color: fam.color,
          quizPendingCopy: fam.quizPendingCopy, order: Number(fam.order) || 0, isActive: fam.isActive,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); alert(b.error || '儲存失敗'); }
    } catch (e) { console.error(e); alert('發生錯誤'); }
    finally { setSavingSlug(null); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/admin/dashboard/templates" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4">
        <ChevronLeft size={16} /> 返回計畫管理
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">計畫家族</h1>
      <p className="text-sm text-gray-400 mb-6">探索計畫第一層的三大分類。固定 3 個、僅編輯顯示內容（成員由習慣分類自動判定）。</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="animate-spin text-emerald-500" /></div>
      ) : (
        <div className="space-y-4">
          {families.map(fam => (
            <div key={fam.slug} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-700 text-gray-300">{fam.slug}</span>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={fam.isActive} onChange={e => updateField(fam.slug, 'isActive', e.target.checked)} />
                  顯示於探索計畫
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">顯示名稱</label>
                  <input className="admin-input" value={fam.title || ''} onChange={e => updateField(fam.slug, 'title', e.target.value)} /></div>
                <div><label className="admin-label">排序（小在前）</label>
                  <input type="number" className="admin-input" value={fam.order ?? 0} onChange={e => updateField(fam.slug, 'order', e.target.value)} /></div>
                <div className="col-span-2"><label className="admin-label">介紹文</label>
                  <textarea rows={2} className="admin-input" value={fam.intro || ''} onChange={e => updateField(fam.slug, 'intro', e.target.value)} /></div>
                <div><label className="admin-label">Lucide 圖示名稱</label>
                  <input className="admin-input" placeholder="Flower2 / Moon / LayoutGrid" value={fam.icon || ''} onChange={e => updateField(fam.slug, 'icon', e.target.value)} /></div>
                <div><label className="admin-label">顏色</label>
                  <div className="flex items-center gap-2">
                    <input className="admin-input flex-1" value={fam.color || ''} onChange={e => updateField(fam.slug, 'color', e.target.value)} />
                    <div className="flex gap-1">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} type="button" onClick={() => updateField(fam.slug, 'color', c)}
                          className="w-6 h-6 rounded-full border border-gray-600" style={{ backgroundColor: c }} aria-label={c} />
                      ))}
                    </div>
                  </div></div>
                <div className="col-span-2"><label className="admin-label">未完成分型測驗提示（可留空）</label>
                  <textarea rows={2} className="admin-input" value={fam.quizPendingCopy || ''} onChange={e => updateField(fam.slug, 'quizPendingCopy', e.target.value)} /></div>
              </div>
              <div className="flex justify-end mt-3">
                <button onClick={() => save(fam)} disabled={savingSlug === fam.slug}
                  className="admin-button-primary flex items-center gap-2">
                  {savingSlug === fam.slug ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} 儲存
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 在計畫管理頁加入口連結**

讀 `src/app/admin/dashboard/templates/page.js`，找到既有「計畫分類」連結（指向 `/admin/dashboard/templates/categories` 的 `<Link>`）。在它旁邊（同一排按鈕區）加一個相同樣式的連結：

```jsx
<Link href="/admin/dashboard/templates/families" className="（複製計畫分類連結的 className）">
    計畫家族
</Link>
```

若找不到現成的「計畫分類」連結，則在頁面標題列右側按鈕群組加入上述 `<Link>`（用 `admin-button-secondary` 類）。

- [ ] **Step 3: build 驗證**

Run: `npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/dashboard/templates/families/page.js src/app/admin/dashboard/templates/page.js
git commit -m "feat(admin): 計畫家族編輯頁（title/介紹/icon/色/排序/顯示）"
```

---

## Task 4: TemplateExplorer 兩層導覽（TDD）

**Files:** Modify `src/components/TemplateExplorer.jsx`；Create `src/__tests__/components/TemplateExplorer.test.jsx`

- [ ] **Step 1: 寫失敗測試** `src/__tests__/components/TemplateExplorer.test.jsx`

```jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplateExplorer from '../../components/TemplateExplorer';

// fetch 依 URL 回不同 payload：templates / plan-categories / plan-families
const FAMILIES = [
  { id: 'f1', slug: 'flower', title: '花朵計畫', intro: '週期分型 14 天', icon: 'Flower2', color: '#ec4899', quizPendingCopy: '花朵問卷開發中', order: 0, isActive: true },
  { id: 'f2', slug: 'sleep', title: '睡眠處方', intro: '睡眠卡點分型', icon: 'Moon', color: '#6366f1', quizPendingCopy: '睡眠問卷開發中', order: 1, isActive: true },
  { id: 'f3', slug: 'other', title: '其他公開計畫', intro: '各式主題', icon: 'LayoutGrid', color: '#10b981', quizPendingCopy: null, order: 2, isActive: true },
];
const TEMPLATES = [
  { id: 't1', name: '玫瑰 14 天', category: 'rose', description: '玫瑰課程', expert: { name: '王醫師', title: '營養師' }, _count: { tasks: 5, assignments: 3 } },
  { id: 't2', name: '壓力睡眠處方', category: 'sleep_stress', description: '睡眠課程', expert: { name: '李醫師', title: '醫師' }, _count: { tasks: 4, assignments: 1 } },
  { id: 't3', name: '通用減重', category: '健康生活', description: '通用課程', expert: { name: '陳教練', title: '教練' }, _count: { tasks: 6, assignments: 9 } },
];

function mockFetch() {
  global.fetch = jest.fn((url) => {
    let payload = [];
    if (url.includes('/api/templates/public')) payload = TEMPLATES;
    else if (url.includes('/api/plan-families')) payload = FAMILIES;
    else if (url.includes('/api/plan-categories')) payload = [];
    return Promise.resolve({ ok: true, json: async () => payload });
  });
}
afterEach(() => jest.restoreAllMocks());

describe('TemplateExplorer 兩層', () => {
  test('第一層渲染三個家族卡', async () => {
    mockFetch();
    render(<TemplateExplorer isOpen onClose={() => {}} userId="u1" onJoin={() => {}} />);
    expect(await screen.findByText('花朵計畫')).toBeInTheDocument();
    expect(screen.getByText('睡眠處方')).toBeInTheDocument();
    expect(screen.getByText('其他公開計畫')).toBeInTheDocument();
    // 第一層不該直接出現課程名
    expect(screen.queryByText('玫瑰 14 天')).toBeNull();
  });

  test('點花朵家族 → 第二層顯示該家族課程，不顯示他家族課程', async () => {
    mockFetch();
    render(<TemplateExplorer isOpen onClose={() => {}} userId="u1" onJoin={() => {}} />);
    fireEvent.click(await screen.findByText('花朵計畫'));
    expect(await screen.findByText('玫瑰 14 天')).toBeInTheDocument();
    expect(screen.queryByText('壓力睡眠處方')).toBeNull(); // sleep 家族的課程不在花朵層
  });

  test('第二層返回鍵回到第一層', async () => {
    mockFetch();
    render(<TemplateExplorer isOpen onClose={() => {}} userId="u1" onJoin={() => {}} />);
    fireEvent.click(await screen.findByText('花朵計畫'));
    await screen.findByText('玫瑰 14 天');
    fireEvent.click(screen.getByLabelText('返回計畫家族'));
    expect(await screen.findByText('睡眠處方')).toBeInTheDocument(); // 回到第一層
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx jest TemplateExplorer -v`
Expected: FAIL（第一層尚未實作家族卡 / 找不到「返回計畫家族」）

- [ ] **Step 3: 改 TemplateExplorer — imports + 狀態 + fetch 家族**

在 `src/components/TemplateExplorer.jsx`：

(a) lucide import 行加入家族卡會用到的圖示與返回鍵：把第 2 行
```jsx
import { X, Search, User, Check, Loader, Calendar, Sparkles, Hourglass, ChevronRight } from 'lucide-react';
```
改成
```jsx
import { X, User, Check, Loader, Calendar, Sparkles, Hourglass, ChevronRight, ChevronLeft, Flower2, Moon, LayoutGrid } from 'lucide-react';

// Lucide 圖示名稱 → component 對照（家族卡用；查無則用 LayoutGrid）
const FAMILY_ICONS = { Flower2, Moon, LayoutGrid };
function familyIcon(name) { return FAMILY_ICONS[name] || LayoutGrid; }

// 當 /api/plan-families 尚無資料時的 fallback（對齊 TEMPLATE_SECTIONS 順序）。
const FALLBACK_FAMILIES = [
  { slug: 'flower', title: '花朵型小課程', intro: '依女性週期身體狀態分型，14 天分階段任務。', icon: 'Flower2', color: '#ec4899', quizPendingCopy: '花朵分型問卷功能開發中 — 先瀏覽全部，完成後自動推薦。', order: 0, isActive: true },
  { slug: 'sleep', title: '睡眠處方', intro: '依睡眠卡點分型，14 天 4 階段處方。', icon: 'Moon', color: '#6366f1', quizPendingCopy: '睡眠分型問卷功能開發中 — 先瀏覽全部，完成後自動推薦。', order: 1, isActive: true },
  { slug: 'other', title: '其他公開計畫', intro: '專家設計的各式主題計畫。', icon: 'LayoutGrid', color: '#10b981', quizPendingCopy: null, order: 2, isActive: true },
];
```
（`Search` 已移除 import — 確認檔中沒有其他地方用到 `<Search>`；若有，保留 Search。讀檔確認；現況 Search 僅在 header 早期版本用，目前 render 沒有搜尋框，可安全移除；若 grep 到仍在用就保留。）

(b) 在 state 區（`const [detailTemplate, setDetailTemplate] = useState(null);` 附近）加：
```jsx
    const [families, setFamilies] = useState([]);
    const [activeFamily, setActiveFamily] = useState(null); // null=第一層；'flower'|'sleep'|'other'=第二層
```

(c) 在 `fetchAll` 的 `Promise.all` 加入 plan-families，並 setFamilies：
把
```jsx
            const [tplRes, catRes] = await Promise.all([
                fetch(`/api/templates/public?t=${timestamp}`, { cache: 'no-store' }),
                fetch('/api/plan-categories', { cache: 'no-store' }),
            ]);
```
改成
```jsx
            const [tplRes, catRes, famRes] = await Promise.all([
                fetch(`/api/templates/public?t=${timestamp}`, { cache: 'no-store' }),
                fetch('/api/plan-categories', { cache: 'no-store' }),
                fetch('/api/plan-families', { cache: 'no-store' }),
            ]);
```
並在 `if (catRes.ok) {...}` 區塊之後加：
```jsx
            if (famRes.ok) {
                const fam = await famRes.json();
                setFamilies(Array.isArray(fam) && fam.length ? fam : FALLBACK_FAMILIES);
            } else {
                setFamilies(FALLBACK_FAMILIES);
            }
```

(d) `initialTemplate` 自動開啟時，連帶設定 activeFamily（讓返回落在對應家族）。在現有 initialTemplate 的 useEffect 內，`setDetailTemplate(match)` 之前加一行（需 import `sectionIdFor`）。先在頂部 import 區把
```jsx
import { isRecommendedFor, TEMPLATE_SECTIONS, groupTemplatesBySection } from '@/lib/templateRecommendation';
```
改為
```jsx
import { isRecommendedFor, TEMPLATE_SECTIONS, groupTemplatesBySection, sectionIdFor } from '@/lib/templateRecommendation';
```
並確認 `templateRecommendation.js` 有 `export` `sectionIdFor`（見 Step 3b）。然後在該 useEffect 內：
```jsx
        const match = templates.find(t => t.id === initialTemplate.id) || initialTemplate;
        setActiveFamily(sectionIdFor(match));   // ★ 落在對應家族第二層
        setDetailTemplate(match);
```

- [ ] **Step 3b: 確認 `sectionIdFor` 有匯出**

讀 `src/lib/templateRecommendation.js` 結尾的 `module.exports` / `export`。確保 `sectionIdFor` 在匯出清單。若該檔用 CommonJS `module.exports = { ... }`，把 `sectionIdFor` 加進去；若用 ESM `export`，在 `function sectionIdFor` 前加 `export`。（同時保留既有 `isRecommendedFor` / `TEMPLATE_SECTIONS` / `groupTemplatesBySection` 匯出不變。）

- [ ] **Step 4: 改 render — 兩層切換**

把現有「Content」區塊（`{/* Content */}` 那個 `<div className="flex-1 overflow-y-auto p-6 bg-gray-50">` 整段，到對應關閉 `</div>`）整段替換為下列。標題列也要支援返回鍵——同時替換 header 區。

找到 header：
```jsx
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">探索習慣計畫</h2>
                        <p className="text-sm text-gray-500">加入專家設計的習慣模板，開始你的健康旅程</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>
```
替換為：
```jsx
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                        {activeFamily && (
                            <button
                                onClick={() => setActiveFamily(null)}
                                aria-label="返回計畫家族"
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                            >
                                <ChevronLeft size={22} className="text-gray-600" />
                            </button>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-gray-800 truncate">
                                {activeFamily ? (families.find(f => f.slug === activeFamily)?.title || '計畫') : '探索習慣計畫'}
                            </h2>
                            <p className="text-sm text-gray-500 truncate">
                                {activeFamily ? '選一個課程開始' : '選一個計畫家族開始'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>
```

接著找到 Content 區塊起點 `<div className="flex-1 overflow-y-auto p-6 bg-gray-50">`，把整個 Content `<div>...</div>`（含內部 loading / empty / `<div className="space-y-8">...TEMPLATE_SECTIONS.map...`）替換為：

```jsx
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader className="animate-spin text-emerald-500" />
                        </div>
                    ) : activeFamily === null ? (
                        /* ===== 第一層：計畫家族大橫幅卡（版面 A） ===== */
                        <div className="space-y-3">
                            {(families.length ? families : FALLBACK_FAMILIES).map(fam => {
                                const list = grouped[fam.slug] || [];
                                // other 家族若無課程則不顯示；flower/sleep 即使空也顯示（可看介紹/測驗提示）
                                if (fam.slug === 'other' && list.length === 0) return null;
                                const Icon = familyIcon(fam.icon);
                                const hasRec = list.some(t => isRecommendedFor(t, userTypeKey, userSleepTypeKey));
                                const color = fam.color || '#10b981';
                                return (
                                    <button
                                        key={fam.slug}
                                        onClick={() => setActiveFamily(fam.slug)}
                                        className="w-full text-left bg-white rounded-2xl border p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-all relative"
                                        style={{ borderColor: `${color}55` }}
                                    >
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${color}1f`, color }}
                                        >
                                            <Icon size={22} />
                                        </div>
                                        <div className="min-w-0 flex-1 pr-5">
                                            <h3 className="font-bold text-gray-800 text-base">{fam.title}</h3>
                                            <p className="text-xs text-gray-500 leading-relaxed mt-1">{fam.intro}</p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="text-[11px] text-gray-400">{list.length} 個課程</span>
                                                {hasRec && (
                                                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                        <Sparkles size={10} /> 有為你推薦
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* ===== 第二層：該家族的子課程選單 ===== */
                        (() => {
                            const items = grouped[activeFamily] || [];
                            const famObj = families.find(f => f.slug === activeFamily);
                            const showQuizPending = (activeFamily === 'flower' && !userTypeKey) || (activeFamily === 'sleep' && !userSleepTypeKey);
                            const quizCopy = famObj?.quizPendingCopy;
                            return (
                                <div>
                                    {showQuizPending && quizCopy && (
                                        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-4 mb-4 flex items-start gap-3">
                                            <Hourglass size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs text-gray-600 leading-relaxed">{quizCopy}</div>
                                        </div>
                                    )}
                                    {items.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500 text-sm">這個家族目前還沒有公開課程</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {items.map(template => {
                                                const recommended = isRecommendedFor(template, userTypeKey, userSleepTypeKey);
                                                const cat = categoryMap[template.category] || fallbackForSlug(template.category);
                                                return (
                                                    <div
                                                        key={template.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => setDetailTemplate(template)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailTemplate(template); } }}
                                                        className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col ${recommended ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-100'}`}
                                                        style={!recommended ? { borderTopColor: cat.color, borderTopWidth: 3 } : undefined}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                                                style={{ backgroundColor: `${cat.color}1f`, color: cat.color, borderColor: `${cat.color}55` }}>
                                                                {cat.icon && <span className="text-xs leading-none">{cat.icon}</span>}
                                                                <span className="truncate max-w-[90px]">{cat.name}</span>
                                                            </span>
                                                            {recommended && (
                                                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0">
                                                                    <Sparkles size={10} /> 為你推薦
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2 mb-2">{template.name}</h3>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{template.expert?.title || '專家'}</span>
                                                            <span className="truncate">by {template.expert?.name}</span>
                                                        </div>
                                                        <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-3 flex-1">
                                                            {template.description || '這個計畫可以幫助你建立良好的生活習慣。'}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-[11px] text-gray-400 border-t border-gray-100 pt-2 mb-3">
                                                            <div className="flex items-center gap-1"><User size={12} /><span>{template._count?.assignments || 0}</span></div>
                                                            <div className="flex items-center gap-1"><Check size={12} /><span>{template._count?.tasks || 0}</span></div>
                                                            <div className="ml-auto flex items-center gap-0.5 text-emerald-600"><span>詳情</span><ChevronRight size={12} /></div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleJoinClick(template); }}
                                                            disabled={joiningId === template.id}
                                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                                        >
                                                            {joiningId === template.id ? '加入中...' : '加入計畫'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    )}
                </div>
```

註：`grouped`、`categoryMap`、`fallbackForSlug`、`handleJoinClick`、`joiningId`、`userTypeKey`、`userSleepTypeKey` 均為現有變數，沿用。第二層課程卡改為垂直 `space-y-3`（取代原水平輪播；兩層後不需橫向滑動）。`TEMPLATE_SECTIONS` 不再於 render 使用，但保留 import 供 fallback 文案（或移除該 import — 若移除，連同 Step 3 的 import 一併拿掉以免 lint 未使用警告；保留亦可）。

- [ ] **Step 5: 跑測試確認通過**

Run: `npx jest TemplateExplorer -v`
Expected: 3 個測試全 PASS

- [ ] **Step 6: 全測試 + build**

Run: `npx jest 2>&1 | tail -4 && npm run build:local 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: 全 PASS、`✓ Compiled successfully`

- [ ] **Step 7: Commit**

```bash
git add src/components/TemplateExplorer.jsx src/__tests__/components/TemplateExplorer.test.jsx src/lib/templateRecommendation.js
git commit -m "feat(ui): 探索計畫兩層導覽 — 第一層家族卡 + 第二層子課程 + 返回鍵"
```

---

## 完成後

- 全測試綠燈、build 成功。
- 跑一次種子確保家族存在：`node scripts/seed-plan-families.js`。
- 接 `superpowers:finishing-a-development-branch`：合併 main + push（schema 新增非破壞；提醒其他 session pull）。
