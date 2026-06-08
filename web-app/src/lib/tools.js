const DEFAULTS = {
  breathing: { inhale: 4, hold: 7, exhale: 8, cycles: 5 },
  timer: { seconds: 1500, mode: 'count' },
  music: { playMode: 'similar', timerMin: 30, autoComplete: true },
};

function defaultToolConfig(type) {
  const preset = DEFAULTS[type];
  return preset ? { ...preset } : {};
}

function breathingPhases({ inhale = 0, hold = 0, exhale = 0, cycles = 0 } = {}) {
  const phases = [];
  for (let i = 0; i < cycles; i++) {
    if (inhale > 0) phases.push({ phase: 'inhale', seconds: inhale });
    if (hold > 0) phases.push({ phase: 'hold', seconds: hold });
    if (exhale > 0) phases.push({ phase: 'exhale', seconds: exhale });
  }
  return phases;
}

function describeTool(type, config = {}) {
  if (type === 'breathing') {
    const { inhale = 0, hold = 0, exhale = 0, cycles = 0 } = config;
    return `${inhale}-${hold}-${exhale} 呼吸 × ${cycles} 輪`;
  }
  if (type === 'timer') {
    const { seconds = 0, mode, rounds } = config;
    const minutes = Math.round(seconds / 60);
    if (mode === 'pomodoro') {
      return `番茄鐘 ${minutes} 分 × ${rounds} 輪`;
    }
    return `計時 ${minutes} 分`;
  }
  if (type === 'music') {
    const { timerMin = 0 } = config;
    return `音樂 ${timerMin} 分`;
  }
  return '';
}

module.exports = { defaultToolConfig, breathingPhases, describeTool };
