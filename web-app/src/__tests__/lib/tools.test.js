const { defaultToolConfig, breathingPhases, describeTool } = require('@/lib/tools');

describe('defaultToolConfig', () => {
  it('returns 4-7-8 breathing defaults', () => {
    expect(defaultToolConfig('breathing')).toEqual({ inhale: 4, hold: 7, exhale: 8, cycles: 5 });
  });

  it('returns timer defaults (25 min count-up)', () => {
    expect(defaultToolConfig('timer')).toEqual({ seconds: 1500, mode: 'count' });
  });

  it('returns music defaults', () => {
    expect(defaultToolConfig('music')).toEqual({ playMode: 'similar', timerMin: 30, autoComplete: true });
  });

  it('returns {} for unknown or undefined tool', () => {
    expect(defaultToolConfig('nope')).toEqual({});
    expect(defaultToolConfig(undefined)).toEqual({});
    expect(defaultToolConfig()).toEqual({});
    expect(defaultToolConfig(null)).toEqual({});
  });
});

describe('breathingPhases', () => {
  it('builds inhale/hold/exhale for one cycle', () => {
    expect(breathingPhases({ inhale: 4, hold: 7, exhale: 8, cycles: 1 })).toEqual([
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold', seconds: 7 },
      { phase: 'exhale', seconds: 8 },
    ]);
  });

  it('repeats phases per cycle (length 6 for two cycles)', () => {
    expect(breathingPhases({ inhale: 4, hold: 7, exhale: 8, cycles: 2 })).toHaveLength(6);
  });

  it('omits the hold phase when hold is 0', () => {
    expect(breathingPhases({ inhale: 4, hold: 0, exhale: 8, cycles: 1 })).toEqual([
      { phase: 'inhale', seconds: 4 },
      { phase: 'exhale', seconds: 8 },
    ]);
  });
});

describe('describeTool', () => {
  it('describes breathing with pattern and cycle count', () => {
    const s = describeTool('breathing', { inhale: 4, hold: 7, exhale: 8, cycles: 5 });
    expect(typeof s).toBe('string');
    expect(s).toContain('4-7-8');
    expect(s).toContain('5');
  });

  it('describes a count-up timer in minutes', () => {
    const s = describeTool('timer', { seconds: 1500, mode: 'count' });
    expect(s).toContain('25');
  });

  it('describes a pomodoro timer', () => {
    const s = describeTool('timer', { seconds: 1500, mode: 'pomodoro', rounds: 4 });
    expect(s).toContain('番茄鐘');
  });
});
