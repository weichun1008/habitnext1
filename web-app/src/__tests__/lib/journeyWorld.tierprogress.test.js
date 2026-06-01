const { nextTierProgress } = require('@/lib/journeyWorld');
describe('nextTierProgress', () => {
  it('village → town', () => {
    expect(nextTierProgress(5)).toEqual({ tier: 'village', nextTier: 'town', remaining: 5 });
  });
  it('剛好門檻 town 起點', () => {
    expect(nextTierProgress(10)).toEqual({ tier: 'town', nextTier: 'city', remaining: 20 });
  });
  it('封頂 megacity → nextTier null', () => {
    expect(nextTierProgress(250)).toEqual({ tier: 'megacity', nextTier: null, remaining: 0 });
  });
  it('empty → village', () => {
    expect(nextTierProgress(0)).toEqual({ tier: 'empty', nextTier: 'village', remaining: 1 });
  });
});
