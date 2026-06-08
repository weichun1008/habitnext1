// src/lib/planBuilder.js
// 純函式：把一個嚮往的習慣集生成符合現有 Template v2.0 的計畫。
// 無 I/O、可單測。phase.tasks 物件格式對齊 api/user/assignments/route.js 的消費端。
const { TIERS, defaultDifficultyTier } = require('./difficulty');

const PHASE_META = [
  { id: 'p1', name: '養成期' },
  { id: 'p2', name: '進階' },
  { id: 'p3', name: '挑戰' },
];

function taskFromTier(habit, tier) {
  const cfg = (habit.officialHabit?.difficulties?.[tier]) || {};
  const recurrence = cfg.recurrence || { type: 'daily', interval: 1 };
  return {
    title: habit.title,
    type: cfg.type || 'binary',
    category: habit.category || 'other',
    frequency: recurrence.type || 'daily',
    recurrence,
    reminder: { enabled: false, offset: 0 },
    subtasks: Array.isArray(cfg.subtasks) ? cfg.subtasks : [],
    dailyTarget: cfg.dailyTarget != null ? cfg.dailyTarget : 1,
    unit: cfg.unit || '次',
    stepValue: cfg.stepValue != null ? cfg.stepValue : 1,
  };
}

function enabledTiers(habit) {
  const d = habit.officialHabit?.difficulties || {};
  return TIERS.filter(t => d[t] && d[t].enabled);
}

function startTierIndex(habit) {
  const enabled = enabledTiers(habit);
  if (enabled.length === 0) return { enabled: ['beginner'], idx: 0, onlyBeginner: true };
  const desired = defaultDifficultyTier(habit.userAbility);
  const desiredRank = TIERS.indexOf(desired);
  let idx = 0;
  for (let i = 0; i < enabled.length; i++) {
    if (TIERS.indexOf(enabled[i]) <= desiredRank) idx = i;
  }
  return { enabled, idx, onlyBeginner: enabled.length === 1 };
}

function median(nums) {
  const arr = nums.filter(n => typeof n === 'number').sort((a, b) => a - b);
  if (arr.length === 0) return 66;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
}

function buildPlanFromAspiration({ habits }) {
  if (!Array.isArray(habits) || habits.length === 0) {
    return { version: '2.0', phases: [] };
  }
  const ordered = [...habits].sort((a, b) =>
    (b.userImpact ?? 3) - (a.userImpact ?? 3) || (b.userAbility ?? 3) - (a.userAbility ?? 3));

  const meta = ordered.map(h => ({ habit: h, ...startTierIndex(h) }));

  const maxExtra = Math.max(0, ...meta.map(m => (m.enabled.length - 1) - m.idx));
  const phaseCount = Math.min(PHASE_META.length, 1 + maxExtra);

  const totalDays = median(ordered.map(h => h.targetDays));
  const perPhase = Math.max(7, Math.round(totalDays / phaseCount));

  const phases = [];
  for (let p = 0; p < phaseCount; p++) {
    const tasks = meta.map(m => {
      const tierIdx = Math.min(m.idx + p, m.enabled.length - 1);
      const tier = m.enabled[tierIdx];
      return taskFromTier(m.habit, tier);
    });
    phases.push({ id: PHASE_META[p].id, name: PHASE_META[p].name, days: perPhase, tasks });
  }
  return { version: '2.0', phases };
}

module.exports = { buildPlanFromAspiration, taskFromTier };
