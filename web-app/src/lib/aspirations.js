// src/lib/aspirations.js
// Pure helpers for Slice K — no Prisma, no I/O.
// Spec: docs/superpowers/specs/2026-05-23-slice-K-aspiration-system-design.md

const GENESIS_DOMAINS = [
  '基因與腸道', '環境', '飲食', '運動',
  '壓力與睡眠', '社交互動', '心靈', '認知與智慧', '職涯與平衡',
];

// Detect whether the user already owns an aspiration with the same text.
// Trim-only exact match — picker uses it to redirect to the existing row.
// (Chinese has no case, so case-folding is moot for the intended corpus.)
function findDuplicateAspiration(existingAspirations, text) {
  if (!Array.isArray(existingAspirations) || !text || typeof text !== 'string') return null;
  const needle = text.trim();
  if (!needle) return null;
  return existingAspirations.find(a => a.text && a.text.trim() === needle) || null;
}

// Step 2 — 「適合的計畫」filter.
// Templates carry a category slug that joins to PlanCategory.slug;
// the caller pre-builds a `planCategoryMap` { slug -> { domain, ... } }.
function filterRecommendedTemplates(templates, aspirationDomain, planCategoryMap) {
  if (!aspirationDomain || !Array.isArray(templates)) return [];
  return templates.filter(t => {
    const cat = planCategoryMap?.[t.category];
    return cat?.domain === aspirationDomain;
  });
}

// Step 2 — 「適合的習慣」filter.
// OfficialHabit.category stores the GENESIS+IO domain string directly.
function filterRecommendedHabits(officialHabits, aspirationDomain) {
  if (!aspirationDomain || !Array.isArray(officialHabits)) return [];
  return officialHabits.filter(h => h.category === aspirationDomain);
}

// Step 1「為你推薦」mapping for v1 — hardcoded:
//   sleepTypeKey set → 壓力與睡眠 + 飲食 presets
//   typeKey set (no sleep) → 飲食 + 壓力與睡眠 presets (women's cycle)
//   neither → []
// Caps at 5 entries.
function getPersonalisedPresets(presets, user) {
  if (!Array.isArray(presets) || !user) return [];
  let priorityDomains = [];
  if (user.sleepTypeKey) {
    priorityDomains = ['壓力與睡眠', '飲食'];
  } else if (user.typeKey) {
    priorityDomains = ['飲食', '壓力與睡眠'];
  } else {
    return [];
  }
  const result = [];
  for (const d of priorityDomains) {
    for (const p of presets) {
      if (p.domain === d && result.length < 5) result.push(p);
    }
  }
  return result;
}

// Daily-view grouping (2026-06-03). Identity moved Task → Aspiration, so the
// daily list groups habits under their aspiration and shows the aspiration's
// identity as the group header. A task's "primary" aspiration is the earliest
// link (the API returns task.aspirationHabits ordered by createdAt asc).
//
// Input: an array of tasks, each optionally carrying
//   task.aspirationHabits: [{ aspiration: { id, text, identity, ... } }, ...]
// Output: an ordered array of groups
//   [{ key, aspiration: {id,text,identity}|null, tasks: [...] }, ...]
// Group order = first appearance while scanning the (already-sorted) task
// list, so groups follow the caller's task ordering. The unlinked bucket
// (aspiration === null, key === '__none__') is always pushed last.
function groupTasksByAspiration(tasks) {
  if (!Array.isArray(tasks)) return [];
  const NONE = '__none__';
  const order = [];
  const byKey = new Map();

  for (const task of tasks) {
    const primary = task?.aspirationHabits?.[0]?.aspiration || null;
    const key = primary?.id || NONE;
    if (!byKey.has(key)) {
      byKey.set(key, { key, aspiration: primary, tasks: [] });
      order.push(key);
    }
    byKey.get(key).tasks.push(task);
  }

  // Stable order, but the unlinked bucket always trails the named aspirations.
  const named = order.filter(k => k !== NONE).map(k => byKey.get(k));
  const none = byKey.has(NONE) ? [byKey.get(NONE)] : [];
  return [...named, ...none];
}

module.exports = {
  GENESIS_DOMAINS,
  findDuplicateAspiration,
  filterRecommendedTemplates,
  filterRecommendedHabits,
  getPersonalisedPresets,
  groupTasksByAspiration,
};
