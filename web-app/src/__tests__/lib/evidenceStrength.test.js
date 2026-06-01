const {
  DIMENSIONS, THRESHOLDS, TIER_META, TONE_CLASSES,
  scoreEvidence, sanitizeEvidence, dimDisplay, levelLabel,
} = require('../../lib/evidenceStrength');

describe('scoreEvidence', () => {
  it('回傳 null 當輸入為 null / 空物件 / 缺面向', () => {
    expect(scoreEvidence(null)).toBeNull();
    expect(scoreEvidence({})).toBeNull();
    expect(scoreEvidence({ studyType: 2, scale: 1, causality: 2 })).toBeNull();
  });

  it('全滿 → total 9、strong', () => {
    expect(scoreEvidence({ studyType: 3, scale: 2, causality: 2, replication: 2 }))
      .toEqual({ total: 9, tier: 'strong', tierLabel: '強' });
  });

  it('進食順序 {2,1,2,1} → total 6、moderate', () => {
    expect(scoreEvidence({ studyType: 2, scale: 1, causality: 2, replication: 1 }))
      .toEqual({ total: 6, tier: 'moderate', tierLabel: '中' });
  });

  it('糖 {1,2,0,0} → total 3、preliminary', () => {
    expect(scoreEvidence({ studyType: 1, scale: 2, causality: 0, replication: 0 }))
      .toEqual({ total: 3, tier: 'preliminary', tierLabel: '初步' });
  });

  it('門檻邊界：7→強、6→中、4→中、3→初步', () => {
    expect(scoreEvidence({ studyType: 3, scale: 2, causality: 2, replication: 0 }).tier).toBe('strong');
    expect(scoreEvidence({ studyType: 2, scale: 2, causality: 2, replication: 0 }).tier).toBe('moderate');
    expect(scoreEvidence({ studyType: 2, scale: 0, causality: 2, replication: 0 }).tier).toBe('moderate');
    expect(scoreEvidence({ studyType: 1, scale: 2, causality: 0, replication: 0 }).tier).toBe('preliminary');
  });
});

describe('sanitizeEvidence', () => {
  it('合法輸入回傳乾淨物件', () => {
    expect(sanitizeEvidence({ studyType: 2, scale: 1, causality: 2, replication: 1, junk: 9 }))
      .toEqual({ studyType: 2, scale: 1, causality: 2, replication: 1 });
  });
  it('非法等級值或缺面向 → null', () => {
    expect(sanitizeEvidence({ studyType: 5, scale: 1, causality: 2, replication: 1 })).toBeNull();
    expect(sanitizeEvidence({ studyType: 2 })).toBeNull();
    expect(sanitizeEvidence(null)).toBeNull();
  });
});

describe('dimDisplay', () => {
  it('studyType=2（max 3，部分）→ amber、2 格', () => {
    expect(dimDisplay('studyType', 2)).toEqual({ label: 'RCT 介入試驗', points: 2, max: 3, filled: 2, tone: 'moderate' });
  });
  it('causality=2（達 max）→ green、2 格', () => {
    expect(dimDisplay('causality', 2)).toEqual({ label: '介入證明因果', points: 2, max: 2, filled: 2, tone: 'strong' });
  });
  it('scale=0 → gray、0 格', () => {
    expect(dimDisplay('scale', 0)).toEqual({ label: '非人體（動物／細胞）', points: 0, max: 2, filled: 0, tone: 'preliminary' });
  });
});

describe('靜態設定', () => {
  it('有 4 個面向', () => { expect(DIMENSIONS.map(d => d.key)).toEqual(['studyType', 'scale', 'causality', 'replication']); });
  it('TIER_META / TONE_CLASSES / THRESHOLDS 齊備', () => {
    expect(TIER_META.strong.label).toBe('強');
    expect(TONE_CLASSES.moderate.bar).toMatch(/amber/);
    expect(THRESHOLDS).toEqual({ strong: 7, moderate: 4 });
    expect(levelLabel('replication', 2)).toBe('多研究一致');
  });
});
