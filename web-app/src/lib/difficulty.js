// src/lib/difficulty.js
// Pure helpers — 依使用者在焦點地圖評的「執行度(ability)」決定起始難度。
// 無 I/O、可單測。難度設定來源：OfficialHabit.difficulties
//   { beginner?, intermediate?, challenge? }，每個 = { enabled, label, type,
//     dailyTarget, unit, stepValue, subtasks, recurrence }。

const TIERS = ['beginner', 'intermediate', 'challenge']; // 由低到高

// 執行度 1-3 → beginner、4 → intermediate、5 → challenge；非數字 → beginner。
function defaultDifficultyTier(userAbility) {
  const a = typeof userAbility === 'number' ? userAbility : 0;
  if (a >= 5) return 'challenge';
  if (a >= 4) return 'intermediate';
  return 'beginner';
}

// 取期望 tier，夾擠到該習慣實際 enabled 的 tier：
//   優先期望 tier；否則取 <= 期望且 enabled 的最高者；都沒有則取 enabled 的最低者。
// 回傳 { tier, config }。無 difficulties → { tier:'beginner', config:{} }。
function resolveDifficulty(habit, userAbility) {
  const diffs = habit && habit.difficulties ? habit.difficulties : null;
  if (!diffs) return { tier: 'beginner', config: {} };

  const desired = defaultDifficultyTier(userAbility);
  const desiredIdx = TIERS.indexOf(desired);
  const enabled = TIERS.filter(t => diffs[t] && diffs[t].enabled);

  if (enabled.length === 0) return { tier: 'beginner', config: {} };

  const downCandidates = enabled.filter(t => TIERS.indexOf(t) <= desiredIdx);
  let tier;
  if (downCandidates.length > 0) {
    tier = downCandidates[downCandidates.length - 1];
  } else {
    tier = enabled[0];
  }
  return { tier, config: diffs[tier] || {} };
}

module.exports = { defaultDifficultyTier, resolveDifficulty, TIERS };
