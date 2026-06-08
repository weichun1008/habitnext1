const { buildPlanFromAspiration } = require('../../lib/planBuilder');

const mkHabit = (over = {}) => ({
  beginner:     { enabled: true, type: 'binary', dailyTarget: 1, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily', interval: 1 } },
  intermediate: { enabled: true, type: 'quantitative', dailyTarget: 3, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily', interval: 1 } },
  challenge:    { enabled: true, type: 'quantitative', dailyTarget: 5, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily', interval: 1 } },
  ...over,
});

const habits = [
  { taskId: 'a', title: '深蹲', category: 'fitness', officialHabit: { difficulties: mkHabit() }, userImpact: 5, userAbility: 3, targetDays: 66 },
  { taskId: 'b', title: '喝水', category: 'fitness', officialHabit: { difficulties: { beginner: mkHabit().beginner } }, userImpact: 4, userAbility: 5, targetDays: 66 },
];

describe('buildPlanFromAspiration', () => {
  it('returns v2.0 with up to 3 phases', () => {
    const plan = buildPlanFromAspiration({ habits });
    expect(plan.version).toBe('2.0');
    expect(Array.isArray(plan.phases)).toBe(true);
    expect(plan.phases.length).toBeGreaterThanOrEqual(1);
    expect(plan.phases.length).toBeLessThanOrEqual(3);
  });

  it('orders habits by impact desc within a phase', () => {
    const plan = buildPlanFromAspiration({ habits });
    expect(plan.phases[0].tasks[0].title).toBe('深蹲');
  });

  it('phase tasks carry full config fields needed by the join consumer', () => {
    const plan = buildPlanFromAspiration({ habits });
    const t = plan.phases[0].tasks[0];
    for (const k of ['title', 'type', 'category', 'frequency', 'recurrence', 'reminder', 'subtasks', 'dailyTarget', 'unit', 'stepValue']) {
      expect(t).toHaveProperty(k);
    }
  });

  it('escalates difficulty across phases when higher tiers exist', () => {
    const plan = buildPlanFromAspiration({ habits });
    const squatByPhase = plan.phases.map(p => p.tasks.find(t => t.title === '深蹲'));
    expect(squatByPhase[0].dailyTarget).toBe(1);
    if (squatByPhase[1]) expect(squatByPhase[1].dailyTarget).toBe(3);
    if (squatByPhase[2]) expect(squatByPhase[2].dailyTarget).toBe(5);
  });

  it('keeps a beginner-only habit at beginner across phases', () => {
    const plan = buildPlanFromAspiration({ habits });
    for (const ph of plan.phases) {
      const water = ph.tasks.find(t => t.title === '喝水');
      if (water) expect(water.dailyTarget).toBe(1);
    }
  });

  it('each phase has positive integer days >= 7', () => {
    const plan = buildPlanFromAspiration({ habits });
    for (const ph of plan.phases) {
      expect(Number.isInteger(ph.days)).toBe(true);
      expect(ph.days).toBeGreaterThanOrEqual(7);
    }
  });

  it('returns single empty-safe plan for no habits', () => {
    const plan = buildPlanFromAspiration({ habits: [] });
    expect(plan.version).toBe('2.0');
    expect(plan.phases).toEqual([]);
  });
});
