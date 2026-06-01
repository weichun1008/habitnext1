// src/lib/geolocation.js
// One-shot, opt-in geolocation with a module-level cache. We deliberately do
// NOT do background tracking — getCachedPosition is called at habit-completion
// time. The cache avoids hammering the permission/GPS layer on every tick.
//
// Returns { lat, lng } on success, or null (permission denied, unavailable,
// timeout). Never throws — callers treat null as "no location this time".
//
// `now` and `_resetCacheForTest` exist for deterministic unit tests.

let _cache = null; // { lat, lng, ts }

function _resetCacheForTest() { _cache = null; }

function getCachedPosition({ maxAgeMs = 15 * 60 * 1000, now } = {}) {
  const t = typeof now === 'number' ? now : Date.now();

  if (_cache && (t - _cache.ts) <= maxAgeMs) {
    return Promise.resolve({ lat: _cache.lat, lng: _cache.lng });
  }

  const geo = (typeof navigator !== 'undefined' && navigator.geolocation) || null;
  if (!geo) return Promise.resolve(null);

  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (p) => {
        const lat = p?.coords?.latitude;
        const lng = p?.coords?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
          _cache = { lat, lng, ts: t };
          resolve({ lat, lng });
        } else {
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  });
}

module.exports = { getCachedPosition, _resetCacheForTest };
