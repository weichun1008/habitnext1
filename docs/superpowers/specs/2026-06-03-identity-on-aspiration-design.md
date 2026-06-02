# Identity moves from Task → Aspiration

**Date:** 2026-06-03
**Status:** approved (user confirmed direction via 3 product decisions)
**Branch:** `feat/identity-on-aspiration`

## Problem

Identity (身分認同, "我是個照顧週期身體的人") currently lives on **every Task**
(`Task.identity`). Two pains the user reported:

1. **每個習慣都要設身份很麻煩** — the create flows (TaskLibraryModal,
   TaskFormModal) each force an identity step per habit. Identity is an
   aspiration-level commitment, not a per-habit one — repeating it on every
   habit is friction without payoff.
2. **任務票顯示太多資訊很亂** — TaskCard renders identity + cue + title +
   details + location + memory + progress; the 10px identity line is the
   first thing to cut to declutter.

## Goal

Identity becomes a property of the **Aspiration** (the 嚮往/goal a user
declares), set **once** when the aspiration is created, and surfaced on the
daily view as a **group header** above the habits that serve that aspiration —
preserving Atomic-Habits-style daily identity reinforcement without per-card
clutter.

## Decisions (user-confirmed)

1. **Daily view** — group incomplete tasks by their aspiration; the
   aspiration's identity is the group's header ("我是個重視睡眠的人").
2. **Per-task IdentityPicker** — removed entirely from BOTH create flows
   (TaskFormModal advanced settings + TaskLibraryModal anchor→identity step).
3. **Old data** — `Task.identity` column is dropped; existing values discarded.
   No backfill. (Dev=Prod shared DB; `prisma db push` on deploy drops it.)

## Non-goals (YAGNI)

- No backfill of old `Task.identity` → Aspiration.identity.
- No per-group completed sections — the global "已完成 N 個" collapsible stays
  as-is; only the **incomplete** list is grouped by aspiration.
- No multi-aspiration resolution UI — a task linked to several aspirations is
  grouped under its **earliest-linked** aspiration (deterministic, simple).
- No identity on assignment/template-joined flows beyond inheriting from the
  aspiration the user entered through (if any).
- No new "identity" model or `User.identities` changes.

## Data model

```prisma
model Aspiration {
  // ...existing...
  identity String?   // ★ NEW — "我是個重視睡眠的人", set at creation, editable
}

model Task {
  // identity String?  ← REMOVED
}
```

## Behaviour

### Setting identity
- **AspirationPicker** (the "你想要什麼？" step): picking a preset / personalised
  / custom aspiration that would CREATE a new row first routes to a small
  **identity sub-step** ("成為這樣的人") that reuses `IdentityPicker`
  (recommended-from-typeKey + generic + custom). Committing POSTs
  `{ text, domain, source, identity }`.
- **Reuse-existing** aspiration: no identity prompt (already set).
- **MyAspirationsTab**: shows the identity line under each aspiration and lets
  the user edit it inline (PATCH `{ identity }`).

### Daily view grouping
- `incompleteDailyTasks` are bucketed by their **primary aspiration**
  (earliest `aspirationHabits[]` link). Each bucket renders:
  - header: aspiration identity (大字 emerald) + aspiration text (small gray)
  - the bucket's task cards, keeping the existing in-bucket sort
- Tasks with no aspiration link fall into a trailing **「其他習慣」** bucket
  with no identity header.
- `completedDailyTasks` global collapsible section is unchanged.
- `/api/tasks` GET gains `aspirationHabits: { include aspiration: id+text+identity }`
  so the client can group without an extra round-trip.

### Cards
- TaskCard: identity block removed.
- TaskDetailModal: identity block removed.
- stats TaskStreakList + `/api/stats` + lib/stats.js: identity dropped from the
  streak payload + UI.

## Touch list

**Schema/API**
- `prisma/schema.prisma` — +Aspiration.identity, −Task.identity
- `api/aspirations/route.js` (POST) — accept+persist identity
- `api/aspirations/[id]/route.js` (PATCH) — accept+persist identity
- `api/tasks/route.js` — GET include aspirationHabits→aspiration; POST drop identity
- `api/tasks/[id]/route.js` (PUT) — drop identity
- `api/user/assignments/route.js` — drop identity fallback
- `api/stats/route.js` + `lib/stats.js` — drop identity from select+payload

**UI**
- `AspirationPicker.jsx` — identity sub-step before create
- `TaskFormModal.jsx` — remove IdentityPicker + formData.identity
- `TaskLibraryModal.jsx` — remove 'identity' view; anchor confirm/skip → emit directly
- `TaskCard.jsx` — remove identity line
- `TaskDetailModal.jsx` — remove identity line
- `stats/TaskStreakList.jsx` — remove identity line
- `MainApp.jsx` — group incomplete daily tasks by aspiration + identity header
- `profile/MyAspirationsTab.jsx` — show + edit identity

**Tests**
- Remove/adjust tests asserting task.identity (TaskStreakList, stats, IdentityPicker-in-form)
- Add: aspiration identity persistence; daily grouping helper

## Risks
- Dropping a prod column. Sanctioned by user. The new code stops referencing
  `Task.identity` in the SAME deploy that drops it, so no runtime window.
- Many-to-many primary-aspiration choice: documented as earliest-link.
