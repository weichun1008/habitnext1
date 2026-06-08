const { resolveTracks, playableTracks, describeMusic } = require('../../lib/musicTool');
const { TRACKS } = require('../../lib/musicData');

describe('resolveTracks', () => {
  it('resolves a single track by trackId', () => {
    const result = resolveTracks({ trackId: 't41' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t41');
  });

  it('resolves a category to its 11 tracks, playable-first (t41 first)', () => {
    const result = resolveTracks({ categoryId: 'calm' });
    expect(result).toHaveLength(11);
    expect(result[0].id).toBe('t41');
    expect(result[0].audioUrl).toBeTruthy();
  });

  it('resolves a problem via recommendedCategoryId (stress -> calm)', () => {
    const viaProblem = resolveTracks({ problemId: 'stress' });
    const viaCategory = resolveTracks({ categoryId: 'calm' });
    expect(viaProblem).toHaveLength(11);
    expect(viaProblem[0].id).toBe('t41');
    expect(viaProblem[0].audioUrl).toBeTruthy();
    expect(viaProblem.map(t => t.id)).toEqual(viaCategory.map(t => t.id));
  });

  it('resolves all 44 tracks with no config, playable-first', () => {
    const result = resolveTracks({});
    expect(result).toHaveLength(44);
    expect(result.slice(0, 4).every(t => t.audioUrl)).toBe(true);
    expect(result.slice(4).some(t => t.audioUrl)).toBe(false);
  });
});

describe('playableTracks', () => {
  it('filters a calm list down to the single track with audioUrl', () => {
    const result = playableTracks(resolveTracks({ categoryId: 'calm' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t41');
  });
});

describe('describeMusic', () => {
  it('includes the stress-type label and the timer minutes', () => {
    const result = describeMusic({ problemId: 'stress', timerMin: 30 });
    expect(typeof result).toBe('string');
    expect(result).toContain('壓力');
    expect(result).toContain('30');
  });
});
