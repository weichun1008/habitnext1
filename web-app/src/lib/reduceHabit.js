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

module.exports = { isMetForDirection, remainingQuota, dayStatus, settleYesterday };
