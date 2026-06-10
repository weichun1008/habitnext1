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

// t（選用）為呼叫端 useT() 的翻譯函式 — 不傳則維持 zh-TW canonical 字串。
function describeTool(type, config = {}, t) {
  if (type === 'breathing') {
    const { inhale = 0, hold = 0, exhale = 0, cycles = 0 } = config;
    return t
      ? t('tools.breathing.describe', { inhale, hold, exhale, cycles })
      : `${inhale}-${hold}-${exhale} 呼吸 × ${cycles} 輪`;
  }
  if (type === 'timer') {
    const { seconds = 0, mode, rounds } = config;
    const minutes = Math.round(seconds / 60);
    if (mode === 'pomodoro') {
      return t
        ? t('tools.timer.describePomodoro', { minutes, rounds })
        : `番茄鐘 ${minutes} 分 × ${rounds} 輪`;
    }
    return t ? t('tools.timer.describeCount', { minutes }) : `計時 ${minutes} 分`;
  }
  if (type === 'music') {
    const { timerMin = 0 } = config;
    return t ? t('tools.music.describe', { minutes: timerMin }) : `音樂 ${timerMin} 分`;
  }
  return '';
}

module.exports = { defaultToolConfig, breathingPhases, describeTool };
