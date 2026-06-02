const {
  GENESIS_DOMAINS,
  findDuplicateAspiration,
  filterRecommendedTemplates,
  filterRecommendedHabits,
  getPersonalisedPresets,
  groupTasksByAspiration,
} = require('../../lib/aspirations');

describe('GENESIS_DOMAINS', () => {
  it('contains all 9 canonical domain names', () => {
    expect(GENESIS_DOMAINS).toEqual([
      '基因與腸道', '環境', '飲食', '運動',
      '壓力與睡眠', '社交互動', '心靈', '認知與智慧', '職涯與平衡',
    ]);
  });
});

describe('findDuplicateAspiration', () => {
  it('returns existing aspiration when text matches after trim', () => {
    const list = [
      { id: 'a1', text: '想要快速入睡、睡眠品質好', status: 'active' },
      { id: 'a2', text: '想要瘦下來', status: 'achieved' },
    ];
    expect(findDuplicateAspiration(list, '想要快速入睡、睡眠品質好')).toEqual({ id: 'a1', text: '想要快速入睡、睡眠品質好', status: 'active' });
    expect(findDuplicateAspiration(list, '  想要瘦下來  ')).toEqual({ id: 'a2', text: '想要瘦下來', status: 'achieved' });
  });

  it('returns null when no match', () => {
    const list = [{ id: 'a1', text: '想要瘦下來', status: 'active' }];
    expect(findDuplicateAspiration(list, '想要學會煮飯')).toBeNull();
  });

  it('handles empty list / empty text', () => {
    expect(findDuplicateAspiration([], '想要瘦下來')).toBeNull();
    expect(findDuplicateAspiration([{ id: 'a1', text: '想要瘦下來', status: 'active' }], '')).toBeNull();
    expect(findDuplicateAspiration(null, '想要瘦下來')).toBeNull();
  });
});

describe('filterRecommendedTemplates', () => {
  const planCategoryMap = {
    'sleep_stress': { domain: '壓力與睡眠' },
    'sleep_rhythm': { domain: '壓力與睡眠' },
    'rose':         { domain: '壓力與睡眠' },
    '健康生活':      { domain: null },
  };

  it('returns templates whose PlanCategory.domain matches aspiration.domain', () => {
    const templates = [
      { id: 't1', category: 'sleep_stress' },
      { id: 't2', category: 'sleep_rhythm' },
      { id: 't3', category: 'rose' },
      { id: 't4', category: '健康生活' },
    ];
    expect(filterRecommendedTemplates(templates, '壓力與睡眠', planCategoryMap).map(t => t.id))
      .toEqual(['t1', 't2', 't3']);
  });

  it('returns [] for null domain', () => {
    expect(filterRecommendedTemplates([{ id: 't1', category: 'rose' }], null, planCategoryMap)).toEqual([]);
  });

  it('drops templates whose category is not in planCategoryMap', () => {
    const templates = [{ id: 't1', category: 'unknown_slug' }];
    expect(filterRecommendedTemplates(templates, '飲食', planCategoryMap)).toEqual([]);
  });
});

describe('filterRecommendedHabits', () => {
  it('filters OfficialHabits where habit.category === aspiration.domain', () => {
    const habits = [
      { id: 'h1', category: '壓力與睡眠' },
      { id: 'h2', category: '飲食' },
      { id: 'h3', category: '壓力與睡眠' },
    ];
    expect(filterRecommendedHabits(habits, '壓力與睡眠').map(h => h.id)).toEqual(['h1', 'h3']);
  });

  it('returns [] for null domain', () => {
    expect(filterRecommendedHabits([{ id: 'h1', category: '飲食' }], null)).toEqual([]);
  });
});

describe('getPersonalisedPresets', () => {
  const presets = [
    { text: '想要快速入睡、睡眠品質好', domain: '壓力與睡眠' },
    { text: '想要早上起床不再覺得累',   domain: '壓力與睡眠' },
    { text: '想要瘦下來',                domain: '飲食' },
    { text: '想要食量穩定不暴飲暴食',   domain: '飲食' },
    { text: '想要終身學習保持腦力',     domain: '認知與智慧' },
  ];

  it('returns top sleep + 飲食 presets when user has sleepTypeKey', () => {
    const result = getPersonalisedPresets(presets, { sleepTypeKey: 'stress', typeKey: null });
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every(p => ['壓力與睡眠', '飲食'].includes(p.domain))).toBe(true);
  });

  it('returns 飲食 + 壓力與睡眠 presets when user has typeKey only', () => {
    const result = getPersonalisedPresets(presets, { sleepTypeKey: null, typeKey: 'rose' });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(p => ['飲食', '壓力與睡眠'].includes(p.domain))).toBe(true);
  });

  it('returns empty array when user has no typeKey / sleepTypeKey', () => {
    expect(getPersonalisedPresets(presets, { sleepTypeKey: null, typeKey: null })).toEqual([]);
  });

  it('caps result at 5 entries', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ text: `t${i}`, domain: '壓力與睡眠' }));
    expect(getPersonalisedPresets(many, { sleepTypeKey: 'stress', typeKey: null }).length).toBeLessThanOrEqual(5);
  });
});

describe('groupTasksByAspiration', () => {
  const asp = (id, identity) => ({ id, text: `text-${id}`, identity });
  const task = (id, aspiration) => ({
    id,
    aspirationHabits: aspiration ? [{ aspiration }] : [],
  });

  it('groups tasks under their primary (earliest-linked) aspiration', () => {
    const a = asp('a1', '我是個重視睡眠的人');
    const groups = groupTasksByAspiration([
      task('t1', a),
      task('t2', a),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].aspiration.id).toBe('a1');
    expect(groups[0].tasks.map(t => t.id)).toEqual(['t1', 't2']);
  });

  it('uses the FIRST aspirationHabits entry as primary when a task has several', () => {
    const a1 = asp('a1', 'id-1');
    const a2 = asp('a2', 'id-2');
    const t = { id: 't1', aspirationHabits: [{ aspiration: a1 }, { aspiration: a2 }] };
    const groups = groupTasksByAspiration([t]);
    expect(groups).toHaveLength(1);
    expect(groups[0].aspiration.id).toBe('a1');
  });

  it('preserves first-appearance order for named groups', () => {
    const a1 = asp('a1', 'i1');
    const a2 = asp('a2', 'i2');
    const groups = groupTasksByAspiration([task('t1', a2), task('t2', a1), task('t3', a2)]);
    expect(groups.map(g => g.aspiration.id)).toEqual(['a2', 'a1']);
    expect(groups[0].tasks.map(t => t.id)).toEqual(['t1', 't3']);
  });

  it('puts unlinked tasks in a trailing __none__ group', () => {
    const a1 = asp('a1', 'i1');
    const groups = groupTasksByAspiration([task('t1', null), task('t2', a1), task('t3', null)]);
    // named group first, unlinked bucket last regardless of input order
    expect(groups.map(g => g.key)).toEqual(['a1', '__none__']);
    expect(groups[1].aspiration).toBeNull();
    expect(groups[1].tasks.map(t => t.id)).toEqual(['t1', 't3']);
  });

  it('returns [] for non-array input', () => {
    expect(groupTasksByAspiration(null)).toEqual([]);
    expect(groupTasksByAspiration(undefined)).toEqual([]);
  });
});
