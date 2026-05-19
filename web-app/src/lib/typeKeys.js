// src/lib/typeKeys.js
// Profile metadata for the 4 user-typing flower categories.
// The `typeKey` value lives on User.typeKey, set externally by the
// quiz module. Identity strings here are the default seeded
// 身分認同 (per James Clear / 原子習慣) — users can override.

const USER_TYPE_PROFILES = {
  daisy:     { label: '雛菊型', identity: '我是個穩定照顧自己的人' },
  rose:      { label: '玫瑰型', identity: '我是個照顧週期身體的人' },
  orchid:    { label: '蘭花型', identity: '我是個重視生活節律的人' },
  sunflower: { label: '向日葵型', identity: '我是個照顧代謝健康的人' },
};

// Generic identity options — shown alongside the typeKey-derived
// recommendation, available even when typeKey is null.
const GENERIC_IDENTITIES = [
  '我是個有紀律的人',
  '我是個珍惜身體的人',
  '我是個堅持微小行動的人',
  '我是個照顧自己心靈的人',
];

const IDENTITY_MAX_LENGTH = 40;

function deriveDefaultIdentity(typeKey) {
  if (!typeKey) return null;
  const profile = USER_TYPE_PROFILES[typeKey];
  return profile ? profile.identity : null;
}

module.exports = {
  USER_TYPE_PROFILES,
  GENERIC_IDENTITIES,
  IDENTITY_MAX_LENGTH,
  deriveDefaultIdentity,
};
