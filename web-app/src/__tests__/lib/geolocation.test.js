/**
 * @jest-environment node
 */
const { getCachedPosition, _resetCacheForTest } = require('../../lib/geolocation');

describe('getCachedPosition', () => {
  beforeEach(() => { _resetCacheForTest(); });

  it('resolves {lat,lng} when navigator.geolocation grants', async () => {
    global.navigator = { geolocation: { getCurrentPosition: (ok) => ok({ coords: { latitude: 25.03, longitude: 121.56 } }) } };
    const pos = await getCachedPosition({ maxAgeMs: 1000, now: 1000 });
    expect(pos).toEqual({ lat: 25.03, lng: 121.56 });
  });

  it('returns cached value within maxAgeMs without calling geolocation again', async () => {
    let calls = 0;
    global.navigator = { geolocation: { getCurrentPosition: (ok) => { calls++; ok({ coords: { latitude: 1, longitude: 2 } }); } } };
    await getCachedPosition({ maxAgeMs: 10000, now: 1000 });
    const pos2 = await getCachedPosition({ maxAgeMs: 10000, now: 5000 });
    expect(pos2).toEqual({ lat: 1, lng: 2 });
    expect(calls).toBe(1);
  });

  it('refetches when cache is older than maxAgeMs', async () => {
    let calls = 0;
    global.navigator = { geolocation: { getCurrentPosition: (ok) => { calls++; ok({ coords: { latitude: calls, longitude: calls } }); } } };
    await getCachedPosition({ maxAgeMs: 1000, now: 1000 });
    await getCachedPosition({ maxAgeMs: 1000, now: 5000 });
    expect(calls).toBe(2);
  });

  it('resolves null when permission denied / error', async () => {
    global.navigator = { geolocation: { getCurrentPosition: (_ok, err) => err({ code: 1, message: 'denied' }) } };
    const pos = await getCachedPosition({ maxAgeMs: 1000, now: 1000 });
    expect(pos).toBeNull();
  });

  it('resolves null when geolocation unavailable', async () => {
    global.navigator = {};
    const pos = await getCachedPosition({ maxAgeMs: 1000, now: 1000 });
    expect(pos).toBeNull();
  });
});
