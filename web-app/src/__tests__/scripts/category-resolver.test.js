// src/__tests__/scripts/category-resolver.test.js
const { resolveTargetCategory } = require('../../../scripts/lib/category-resolver');

describe('resolveTargetCategory', () => {
  const stdNames = new Set(['基因與腸道', '環境', '飲食', '心靈']);
  const mapping = { '健康': '飲食', '運動舊': '環境', '_unmapped': '心靈' };

  it('uses explicit mapping when present', () => {
    expect(resolveTargetCategory('健康', mapping, stdNames)).toBe('飲食');
  });

  it('leaves already-standard categories unchanged', () => {
    expect(resolveTargetCategory('飲食', mapping, stdNames)).toBe('飲食');
  });

  it('falls back to _unmapped when neither matches', () => {
    expect(resolveTargetCategory('不存在的舊分類', mapping, stdNames)).toBe('心靈');
  });

  it('throws when mapping has no _unmapped fallback', () => {
    const bad = { '健康': '飲食' };
    expect(() => resolveTargetCategory('不存在', bad, stdNames)).toThrow(/_unmapped/);
  });

  it('throws when fallback is not a standard name', () => {
    const bad = { '_unmapped': '不是標準名' };
    expect(() => resolveTargetCategory('xxx', bad, stdNames)).toThrow(/standard/i);
  });

  it('respects explicit mapping even when key is already a standard name', () => {
    expect(resolveTargetCategory('飲食', { '飲食': '環境', '_unmapped': '心靈' }, stdNames)).toBe('環境');
  });
});
