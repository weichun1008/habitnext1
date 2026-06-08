function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function isMetForDirection({ direction, value, limit } = {}) {
  const v = num(value);
  const l = num(limit);
  if (direction === 'decrease') return v <= l;
  return v >= l;
}

function remainingQuota({ value, limit } = {}) {
  return Math.max(0, num(limit) - num(value));
}

function dayStatus({ direction, value, limit } = {}) {
  const v = num(value);
  const l = num(limit);
  if (direction === 'decrease') return v <= l ? 'on_track' : 'over';
  return v >= l ? 'met' : 'on_track';
}

function settleYesterday({ direction, value, limit } = {}) {
  if (direction !== 'decrease') return null;
  return num(value) <= num(limit) ? 'kept' : 'exceeded';
}

function ymd(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 連續「守住」天數：從 todayStr 往回數，當日 value <= limit（無紀錄視為 0 次=守住）即 +1，
// 遇到超標即停。以 startStr（習慣起始日，建議取 createdAt 當日）為下界，避免新習慣誤報長天數。
// dailyProgress: { 'yyyy-mm-dd': { value } }；history: { 'yyyy-mm-dd': number }（fallback）。
function keptStreak({ limit = 0, dailyProgress = {}, history = {}, todayStr, startStr } = {}) {
  if (!todayStr) return 0;
  const l = num(limit);
  // 無 startStr → 下界預設為今天，避免無紀錄時往回數出超長天數。
  const start = new Date((startStr || todayStr) + 'T00:00:00');
  const d = new Date(todayStr + 'T00:00:00');
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    if (start && d < start) break;
    const key = ymd(d);
    const raw = dailyProgress?.[key]?.value ?? (typeof history?.[key] === 'number' ? history[key] : 0);
    if (num(raw) <= l) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}

module.exports = { isMetForDirection, remainingQuota, dayStatus, settleYesterday, keptStreak };
