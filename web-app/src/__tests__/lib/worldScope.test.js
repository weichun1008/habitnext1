const {
  VALID_WORLDS,
  worldScopedWhere,
  belongsToWorld,
  worldScopedCount,
  normalizeWorld,
} = require('@/lib/worldScope');

describe('worldScopedWhere', () => {
  it('回傳 序章(null) OR 該世界 的 OR 片段', () => {
    expect(worldScopedWhere('home')).toEqual({ OR: [{ world: null }, { world: 'home' }] });
    expect(worldScopedWhere('figure')).toEqual({ OR: [{ world: null }, { world: 'figure' }] });
    expect(worldScopedWhere('journey')).toEqual({ OR: [{ world: null }, { world: 'journey' }] });
  });
});

describe('belongsToWorld', () => {
  it('world=null（序章）屬於任何世界', () => {
    expect(belongsToWorld({ world: null }, 'home')).toBe(true);
    expect(belongsToWorld({ world: null }, 'figure')).toBe(true);
    expect(belongsToWorld({ world: undefined }, 'journey')).toBe(true);
  });
  it('world 等於該 key → 屬於', () => {
    expect(belongsToWorld({ world: 'home' }, 'home')).toBe(true);
  });
  it('world 是別的世界 → 不屬於', () => {
    expect(belongsToWorld({ world: 'figure' }, 'home')).toBe(false);
  });
  it('null/空 row → false', () => {
    expect(belongsToWorld(null, 'home')).toBe(false);
    expect(belongsToWorld(undefined, 'home')).toBe(false);
  });
});

describe('worldScopedCount — 共同序章公式', () => {
  const rows = [
    { world: null },      // 序章
    { world: null },      // 序章
    { world: 'home' },    // 居家
    { world: 'figure' },  // 公仔
    { world: 'home' },    // 居家
    { world: 'journey' }, // 旅程
  ];
  it('居家 = 序章(2) + home(2) = 4', () => {
    expect(worldScopedCount(rows, 'home')).toBe(4);
  });
  it('公仔 = 序章(2) + figure(1) = 3', () => {
    expect(worldScopedCount(rows, 'figure')).toBe(3);
  });
  it('旅程 = 序章(2) + journey(1) = 3', () => {
    expect(worldScopedCount(rows, 'journey')).toBe(3);
  });
  it('純序章（全 null）→ 每個世界都拿到全部', () => {
    const allPrologue = [{ world: null }, { world: null }, { world: null }];
    expect(worldScopedCount(allPrologue, 'home')).toBe(3);
    expect(worldScopedCount(allPrologue, 'figure')).toBe(3);
  });
  it('空 / 非陣列 → 0', () => {
    expect(worldScopedCount([], 'home')).toBe(0);
    expect(worldScopedCount(null, 'home')).toBe(0);
  });
});

describe('normalizeWorld', () => {
  it('合法 key 原樣', () => {
    VALID_WORLDS.forEach(w => expect(normalizeWorld(w)).toBe(w));
  });
  it('非法 / null / 亂值 → null', () => {
    expect(normalizeWorld(null)).toBeNull();
    expect(normalizeWorld(undefined)).toBeNull();
    expect(normalizeWorld('')).toBeNull();
    expect(normalizeWorld('city')).toBeNull();
    expect(normalizeWorld('HOME')).toBeNull();
  });
});
