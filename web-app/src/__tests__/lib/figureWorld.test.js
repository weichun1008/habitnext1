const { STAGES, figureStage, nextStageProgress } = require('@/lib/figureWorld');

describe('figureStage — 階段邊界', () => {
  const cases = [
    [0, 1], [4, 1], [5, 2], [14, 2], [15, 3], [119, 5], [120, 6], [9999, 6],
  ];
  it.each(cases)('count %i → stage %i', (count, stage) => {
    expect(figureStage(count).stage).toBe(stage);
  });

  it('count 0 → 蛋', () => {
    expect(figureStage(0).name).toBe('蛋');
  });
});

describe('nextStageProgress', () => {
  it('count 0 → 距離幼體還差 5', () => {
    expect(nextStageProgress(0)).toEqual({
      stage: 1, name: '蛋', nextName: '幼體', remaining: 5,
    });
  });

  it('at max stage → nextName null, remaining 0', () => {
    expect(nextStageProgress(9999)).toEqual({
      stage: 6, name: '夥伴', nextName: null, remaining: 0,
    });
  });

  it('mid stage → remaining = next min − count', () => {
    expect(nextStageProgress(10)).toEqual({
      stage: 2, name: '幼體', nextName: '成長期', remaining: 5,
    });
  });
});

describe('STAGES', () => {
  it('有 6 個階段，min 遞增', () => {
    expect(STAGES).toHaveLength(6);
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i].min).toBeGreaterThan(STAGES[i - 1].min);
    }
  });
});
