const { categoryToDomain, DOMAIN_NAMES } = require('@/lib/categoryToDomain');

describe('categoryToDomain', () => {
  it('9 個 domain 名原樣回傳', () => {
    DOMAIN_NAMES.forEach(d => expect(categoryToDomain(d)).toBe(d));
  });
  it('icon key 反查 domain', () => {
    expect(categoryToDomain('moon')).toBe('壓力與睡眠');
    expect(categoryToDomain('apple')).toBe('飲食');
    expect(categoryToDomain('dumbbell')).toBe('運動');
    expect(categoryToDomain('briefcase')).toBe('職涯與平衡');
    expect(categoryToDomain('sun')).toBe('環境');
    expect(categoryToDomain('users')).toBe('社交互動');
    expect(categoryToDomain('yoga')).toBe('心靈');
    expect(categoryToDomain('book')).toBe('認知與智慧');
    expect(categoryToDomain('pill')).toBe('基因與腸道');
  });
  it('emoji 盡力對應', () => {
    expect(categoryToDomain('🏃')).toBe('運動');
    expect(categoryToDomain('🧘')).toBe('心靈');
  });
  it('best-effort 額外 icon key', () => {
    expect(categoryToDomain('footprints')).toBe('運動');
    expect(categoryToDomain('droplet')).toBe('飲食');
  });
  it('未知 / 空 → other', () => {
    expect(categoryToDomain('star')).toBe('other');
    expect(categoryToDomain('')).toBe('other');
    expect(categoryToDomain(null)).toBe('other');
    expect(categoryToDomain(undefined)).toBe('other');
  });
});
