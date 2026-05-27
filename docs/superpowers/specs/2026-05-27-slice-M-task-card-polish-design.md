# Slice M — 任務卡優化（排序 / 完成樣式 / 手勢 / Action）

**Date:** 2026-05-27
**Status:** Design — ready for plan
**Scope:** habitnext1 web-app — 整理 daily view 任務卡的呈現與互動：智慧排序、乾淨的完成樣式、行動 / 桌面雙端 action 觸發（swipe / hover），detail modal 加三個生命週期 action（暫停 / 隱藏 / 刪除）。

---

## 1. 背景與動機

### 1.1 既有狀態

到 Slice L 結束，daily view 的任務卡（`TaskCard.jsx` ~290 行）累積以下問題：

1. **排序按 createdAt asc**（`/api/tasks/route.js:23`）— 完成與未完成混在一起，使用者一打開要找「現在該做什麼」要先掃過已完成的
2. **完成樣式視覺重**：line-through 標題 + emerald 邊框 + emerald 背景 + emerald ✓，三層 emerald 疊加滿屏綠
3. **沒有快捷操作**：要 mark 完成必須準確 tap 24px checkbox，沒有 swipe；要暫停 / 刪除必須開 detail
4. **TaskDetailModal 只能 [編輯]**：沒有暫停 / 隱藏，唯一其他 action 是「直接刪除」太破壞性

### 1.2 行為科學需求

依 BJ Fogg：
- 「**Trigger 在時間軸上有自然順序**」— 起床後 → 早餐後 → 午餐後 → 睡前。按 cue 排序貼合日常節律
- 「**完成的視覺回饋要明顯但不擾亂未做的**」— 完成項目的存在感應該縮小但保留（celebratory dot）
- 「**降低 friction**」— 一鍵右滑完成符合「make it easy」核心

---

## 2. v1 目標

### 2.1 排序

Daily view 的 `dailyTasks` 排序規則：

| 優先序 | 規則 |
|---|---|
| 1 | 未完成在上、已完成在下 |
| 2 | 組內按 `cueOrder`（cue 在 anchors.js 時間序）升冪 |
| 3 | 內建 cue (1..30) > 自訂 cue (99 任意時刻) > 無 cue (100) |
| 4 | tie-break: createdAt asc |

### 2.2 完成樣式

| 元素 | 改前 | 改後 |
|---|---|---|
| Title `text-decoration` | `line-through` | 無 |
| 卡片 `opacity` | 1 | **0.55** |
| 卡片邊框 | `border-emerald-200 bg-emerald-50/30` | `border-gray-200`（不加 emerald 底色）|
| 左側 accent | 無 | **3px emerald-400 條** |
| Checkbox | emerald 圓 + ✓ | 不變 |

### 2.3 手機手勢

| 手勢 | 動作 |
|---|---|
| Tap 卡片本體 | 開 TaskDetailModal（不變）|
| Tap checkbox | mark complete / uncomplete（不變）|
| **右滑**（rightward swipe ≥ 80px） | 直接 `onUpdate(task, 'toggle')` — 等同 mark complete |
| **左滑**（leftward swipe ≥ 80px） | 露出右側 action menu：[⏸ 暫停] [🗑️ 刪除] |

只在 candidate-pool flow 完成後的 active task 有手勢；候選池中的 task 不在 daily view、不適用。

### 2.4 桌面互動

| 互動 | 動作 |
|---|---|
| Hover 卡片 | 右上角浮現半透明 ⋮ 圓鈕（24px）|
| Click ⋮ | popover 從右上展開：[⏸ 暫停] [🙈 隱藏]（分隔線）[🗑️ 刪除] |
| Click 卡片本體 | 開 TaskDetailModal（不變）|
| Click checkbox | 不變 |

斷點：`md:` (≥768px) 視為桌面，啟用 hover；以下視為手機，啟用 swipe。

### 2.5 TaskDetailModal Footer

新增 action row（在「編輯」按鈕之外）：

```
┌──────────────────────────────────────┐
│ ←  [task title]              [編輯]  │  (既有 header)
├──────────────────────────────────────┤
│ ... existing content ...             │
├──────────────────────────────────────┤
│ [⏸ 暫停]  [🙈 隱藏]  [🗑️ 刪除]      │  (★ new footer)
└──────────────────────────────────────┘
```

每個按鈕 click → 跳 confirm dialog（「確定要 X 這個習慣嗎？」）→ API → modal 關閉 → parent refetch tasks。

### 2.6 status 語意（Task.status 加一個值）

| status | UI 行為 | 紀錄 | 復原途徑 |
|---|---|---|---|
| `candidate` | 候選池（Slice L）| 完整 history | 焦點地圖評分 → active |
| `active` | 顯示 daily view | 完整 history | 不適用（已啟用）|
| **`paused` (new)** | 不顯示 daily view、不算候選池 | 完整 history | v1：admin / DB；v2：Profile 「暫停清單」tab |
| `archived` | 永久隱藏、不可恢復 | 完整 history | admin only |
| (刪除) | DELETE row | 連 history 一起刪 | 不可恢復 |

「暫停」vs「隱藏」差別：暫停語義上是「之後可能會回來」，UI 應該提供恢復管道（v2）；隱藏是「我不想再看到」，永久。實作層級兩個都是新欄位值，但 v1 都不提供 UI 恢復、皆從 admin 處理。

---

## 3. 非目標 (v1 不做)

- ❌ 從 paused / archived **恢復** task 的 UI（v2 Profile 「暫停清單」）
- ❌ Swipe 觸發後的 **undo toast** （v2 加 5 秒撤回）
- ❌ **排序設定頁面**讓使用者切換規則（用 spec 既定規則，不可配置）
- ❌ **批次選取**（multi-select 暫停一堆）
- ❌ Custom cue 智慧推測時間段（直接歸 99 「任意時刻」）
- ❌ 已完成的卡片**摺疊**為 pill row（用淡化即可，C 選項已否決）
- ❌ Period tasks（週期目標）改排序 — 仍走「週期目標」獨立 section

---

## 4. Schema diff

```diff
model Task {
  ...
- status   String   @default("candidate")  // candidate | active | archived
+ status   String   @default("candidate")  // candidate | active | paused | archived
  ...
}
```

只擴充 `status` 字串 enum 允許值，不加欄位、不動結構。**無 migration 需要**（既有 row status 都會是 active / candidate / archived，繼續合法）。

---

## 5. 元件結構

### 5.1 既有
- `TaskCard.jsx` — daily view 的主角，需要 refactor
- `TaskDetailModal.jsx` — 加 footer
- `MainApp.jsx` — sort 邏輯 + handle paused/archived actions
- `lib/anchors.js` — 加 `CUE_ORDER` map + `cueOrderFor()` helper

### 5.2 新增

| 元件 | 責任 |
|---|---|
| `web-app/src/components/taskCard/SwipeReveal.jsx` | 包裝 children，左滑時露出右側 actions；右滑時觸發 `onSwipeRight` callback |
| `web-app/src/components/taskCard/TaskActionMenu.jsx` | 共用 — 兩個 button row [⏸ 暫停] [🗑️ 刪除]，confirm + API |
| `web-app/src/components/taskCard/TaskHoverDots.jsx` | 桌面 hover ⋮ button + popover containing TaskActionMenu |
| `web-app/src/lib/__tests__/cueOrder.test.js` | 新 helper 的 TDD 測試 |

### 5.3 共用 ActionMenu 內容

| 觸發點 | 顯示位置 | Menu items |
|---|---|---|
| 手機左滑 | 卡片右側 inline | [⏸ 暫停] [🗑️ 刪除] |
| 桌面 hover ⋮ click | popover 下展 | [⏸ 暫停] [🙈 隱藏] [🗑️ 刪除] |
| Detail modal footer | 按鈕 row | [⏸ 暫停] [🙈 隱藏] [🗑️ 刪除] |

注：手機 swipe 不含「隱藏」— swipe action menu 只露 2 個按鈕（空間限制），「隱藏」走 detail 較合適（語意較重，需要明確意圖）。

---

## 6. API

無新 endpoint。`PATCH /api/tasks/[id]` 既有，支援更新 `status` field — 接受 `'paused'` 為合法值（Step 1：加入合法值 array）。

`DELETE /api/tasks/[id]` 既有，不動。

Daily view fetch 已是 `?status=active`（Slice L），自動排除 paused / archived。

---

## 7. 排序實作

`web-app/src/lib/anchors.js` 加：

```js
// Time-of-day order for each built-in anchor. Higher number = later in day.
// Used by daily-view sort. Custom cues map to 99 (anytime), no cue to 100 (last).
const CUE_ORDER = {
  '起床後': 1, '刷牙後': 2, '早餐前': 3, '早餐後': 4, '出門前': 5,
  // ... full list of 30 anchors per existing ANCHOR_GROUPS structure
};

function cueOrderFor(cue) {
  if (!cue) return 100;
  return CUE_ORDER[cue] ?? 99;
}

module.exports = { ...existing, CUE_ORDER, cueOrderFor };
```

`MainApp.jsx` 把現有 `dailyTasks` filter 改成 filter + sort：

```js
const sortedDailyTasks = [...dailyTasks].sort((a, b) => {
  const ac = isCompletedOnDate(a, selectedDate) ? 1 : 0;
  const bc = isCompletedOnDate(b, selectedDate) ? 1 : 0;
  if (ac !== bc) return ac - bc;
  const ao = cueOrderFor(a.cue);
  const bo = cueOrderFor(b.cue);
  if (ao !== bo) return ao - bo;
  return new Date(a.createdAt) - new Date(b.createdAt);
});
```

---

## 8. 已敲定的設計決策

| # | 議題 | 決定 |
|---|---|---|
| 1 | 排序預設 | 未完成 → 已完成，內部按 cue timeOrder |
| 2 | 自訂 cue 怎麼排 | 一律歸「任意時刻」組(`cueOrder=99`)、組內 createdAt |
| 3 | 完成樣式 | 拿掉 line-through、opacity-55、左側 emerald accent、保留 ✓ checkmark |
| 4 | 手機手勢 | 右滑完成 / 左滑 [暫停 / 刪除] action |
| 5 | 桌面互動 | Hover → ⋮ → popover [暫停 / 隱藏 / 刪除] |
| 6 | Action menu 共用 | 用同一個 TaskActionMenu 元件 |
| 7 | Detail modal footer | 加 [⏸ 暫停] [🙈 隱藏] [🗑️ 刪除] |
| 8 | 暫停 vs 隱藏 schema | 加一個 status='paused'；archived 已存在；隱藏 = archived |
| 9 | 恢復 paused/archived 的 UI | v1 不做（v2 加 Profile tab） |
| 10 | Swipe 後的 undo toast | v1 不做 |

---

## 9. 留實作前的細節（不影響 spec）

1. **Swipe threshold**: 80px? 100px? 預設 80px、可依 user testing 調
2. **Swipe 反向滑回的動畫**: 鬆手後立刻復位，spring 250ms
3. **Hover ⋮ 的顯示延遲**: 100ms（避免滑鼠掠過誤觸）
4. **Popover 關閉條件**: click outside、Esc、選定 action 後
5. **Confirm 文案** for delete: 「確定要永久刪除這個習慣嗎？所有歷史紀錄也會一起消失。」 / pause: 「暫停這個習慣？暫停期間不會出現在今日行程。」 / hide: 「隱藏這個習慣？之後不會再看到。」

---

## 10. Acceptance Criteria

- [ ] `lib/anchors.js` 加 `CUE_ORDER` + `cueOrderFor`
- [ ] `MainApp.jsx` dailyTasks 用新排序規則
- [ ] `TaskCard.jsx` 完成樣式改為 opacity-55 + 左 accent + 無 line-through
- [ ] `SwipeReveal.jsx` 元件 working — 左滑露 menu / 右滑 mark complete
- [ ] `TaskHoverDots.jsx` 元件 working — desktop hover 顯示 ⋮，click popover
- [ ] `TaskActionMenu.jsx` 共用元件 — 3 action 對應 status update API
- [ ] `TaskDetailModal.jsx` footer 加 [暫停 / 隱藏 / 刪除]
- [ ] `PATCH /api/tasks/[id]` 接受 status='paused'
- [ ] Daily view 不顯示 paused / archived task
- [ ] Sort + style + gesture 全部串通，UI 在手機 + 桌面都正常
