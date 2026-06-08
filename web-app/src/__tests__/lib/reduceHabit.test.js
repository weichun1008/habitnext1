const { isMetForDirection, remainingQuota, dayStatus, settleYesterday } = require('@/lib/reduceHabit');

describe('isMetForDirection', () => {
  it('decrease: 在上限內達標、超過未達標', () => {
    expect(isMetForDirection({ direction:'decrease', value:2, limit:3 })).toBe(true);
    expect(isMetForDirection({ direction:'decrease', value:3, limit:3 })).toBe(true);
    expect(isMetForDirection({ direction:'decrease', value:4, limit:3 })).toBe(false);
  });
  it('avoid (limit 0): 0 次達標、>0 未達標', () => {
    expect(isMetForDirection({ direction:'decrease', value:0, limit:0 })).toBe(true);
    expect(isMetForDirection({ direction:'decrease', value:1, limit:0 })).toBe(false);
  });
  it('increase (預設): value>=limit', () => {
    expect(isMetForDirection({ direction:'increase', value:3, limit:3 })).toBe(true);
    expect(isMetForDirection({ value:2, limit:3 })).toBe(false);   // null direction = increase
  });
  it('缺值視為 0', () => {
    expect(isMetForDirection({ direction:'decrease', limit:2 })).toBe(true); // value 0 <= 2
  });
});

describe('remainingQuota', () => {
  it('剩餘 = 上限 - 已用，不為負', () => {
    expect(remainingQuota({ value:1, limit:3 })).toBe(2);
    expect(remainingQuota({ value:5, limit:3 })).toBe(0);
    expect(remainingQuota({ limit:3 })).toBe(3);
  });
});

describe('dayStatus', () => {
  it('decrease on_track / over', () => {
    expect(dayStatus({ direction:'decrease', value:2, limit:3 })).toBe('on_track');
    expect(dayStatus({ direction:'decrease', value:4, limit:3 })).toBe('over');
  });
  it('increase met / on_track', () => {
    expect(dayStatus({ direction:'increase', value:3, limit:3 })).toBe('met');
    expect(dayStatus({ direction:'increase', value:1, limit:3 })).toBe('on_track');
  });
});

describe('settleYesterday', () => {
  it('decrease kept / exceeded', () => {
    expect(settleYesterday({ direction:'decrease', value:2, limit:3 })).toBe('kept');
    expect(settleYesterday({ direction:'decrease', value:9, limit:3 })).toBe('exceeded');
  });
  it('increase → null', () => {
    expect(settleYesterday({ direction:'increase', value:1, limit:3 })).toBeNull();
  });
});
