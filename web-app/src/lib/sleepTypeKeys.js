// src/lib/sleepTypeKeys.js
// Profile metadata for the 4 sleep-typing categories.
// `sleepTypeKey` lives on User.sleepTypeKey, set externally by the
// sleep quiz module (parallel to User.typeKey for women's flowers).
// Identity strings are per-type defaults — users can override per task.

const SLEEP_TYPE_PROFILES = {
  stress: {
    label: '壓力型',
    categorySlug: 'sleep_stress',
    iconName: 'Brain',
    identity: '我是個照顧大腦放鬆的人',
  },
  rhythm: {
    label: '節律型',
    categorySlug: 'sleep_rhythm',
    iconName: 'Sunrise',
    identity: '我是個尊重生理節律的人',
  },
  metabolic: {
    label: '代謝失衡型',
    categorySlug: 'sleep_metabolic',
    iconName: 'Apple',
    identity: '我是個照顧代謝健康的人',
  },
  hormone: {
    label: '荷爾蒙波動型',
    categorySlug: 'sleep_hormone',
    iconName: 'Thermometer',
    identity: '我是個照顧週期身體的人',
  },
};

function deriveSleepTypeFromCategory(category) {
  if (!category || typeof category !== 'string') return null;
  if (!category.startsWith('sleep_')) return null;
  const key = category.slice('sleep_'.length);
  return key in SLEEP_TYPE_PROFILES ? key : null;
}

function deriveSleepDefaultIdentity(sleepTypeKey) {
  if (!sleepTypeKey) return null;
  const profile = SLEEP_TYPE_PROFILES[sleepTypeKey];
  return profile ? profile.identity : null;
}

module.exports = {
  SLEEP_TYPE_PROFILES,
  deriveSleepTypeFromCategory,
  deriveSleepDefaultIdentity,
};
