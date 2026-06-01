// src/lib/cities.js
// Offline city-centroid list for Slice O. Zero map API — we only store
// lat/lng numbers and resolve the nearest city by haversine distance.
// v1 list: all Taiwan counties/cities + major Asian + major global.
// Extensible — add rows as needed; nearestCity always returns the closest.

const CITIES = [
  // 台灣 (20)
  { name: '台北', lat: 25.033, lng: 121.565, country: 'TW' },
  { name: '新北', lat: 25.012, lng: 121.465, country: 'TW' },
  { name: '基隆', lat: 25.128, lng: 121.741, country: 'TW' },
  { name: '桃園', lat: 24.993, lng: 121.301, country: 'TW' },
  { name: '新竹', lat: 24.804, lng: 120.972, country: 'TW' },
  { name: '苗栗', lat: 24.560, lng: 120.821, country: 'TW' },
  { name: '台中', lat: 24.147, lng: 120.674, country: 'TW' },
  { name: '彰化', lat: 24.052, lng: 120.516, country: 'TW' },
  { name: '南投', lat: 23.902, lng: 120.685, country: 'TW' },
  { name: '雲林', lat: 23.709, lng: 120.431, country: 'TW' },
  { name: '嘉義', lat: 23.480, lng: 120.449, country: 'TW' },
  { name: '台南', lat: 22.999, lng: 120.227, country: 'TW' },
  { name: '高雄', lat: 22.627, lng: 120.302, country: 'TW' },
  { name: '屏東', lat: 22.552, lng: 120.549, country: 'TW' },
  { name: '宜蘭', lat: 24.702, lng: 121.738, country: 'TW' },
  { name: '花蓮', lat: 23.991, lng: 121.601, country: 'TW' },
  { name: '台東', lat: 22.758, lng: 121.144, country: 'TW' },
  { name: '澎湖', lat: 23.571, lng: 119.579, country: 'TW' },
  { name: '金門', lat: 24.436, lng: 118.317, country: 'TW' },
  { name: '連江', lat: 26.160, lng: 119.951, country: 'TW' },
  // 主要亞洲 (18)
  { name: '東京', lat: 35.681, lng: 139.767, country: 'JP' },
  { name: '大阪', lat: 34.694, lng: 135.502, country: 'JP' },
  { name: '京都', lat: 35.012, lng: 135.768, country: 'JP' },
  { name: '札幌', lat: 43.062, lng: 141.354, country: 'JP' },
  { name: '福岡', lat: 33.590, lng: 130.402, country: 'JP' },
  { name: '沖繩', lat: 26.212, lng: 127.681, country: 'JP' },
  { name: '首爾', lat: 37.567, lng: 126.978, country: 'KR' },
  { name: '釜山', lat: 35.180, lng: 129.076, country: 'KR' },
  { name: '香港', lat: 22.320, lng: 114.169, country: 'HK' },
  { name: '澳門', lat: 22.199, lng: 113.544, country: 'MO' },
  { name: '上海', lat: 31.230, lng: 121.474, country: 'CN' },
  { name: '北京', lat: 39.904, lng: 116.407, country: 'CN' },
  { name: '新加坡', lat: 1.352, lng: 103.820, country: 'SG' },
  { name: '曼谷', lat: 13.756, lng: 100.502, country: 'TH' },
  { name: '吉隆坡', lat: 3.139, lng: 101.687, country: 'MY' },
  { name: '胡志明市', lat: 10.823, lng: 106.630, country: 'VN' },
  { name: '馬尼拉', lat: 14.600, lng: 120.984, country: 'PH' },
  { name: '峇里島', lat: -8.409, lng: 115.189, country: 'ID' },
  // 主要全球 (9)
  { name: '紐約', lat: 40.713, lng: -74.006, country: 'US' },
  { name: '舊金山', lat: 37.775, lng: -122.419, country: 'US' },
  { name: '洛杉磯', lat: 34.052, lng: -118.244, country: 'US' },
  { name: '西雅圖', lat: 47.606, lng: -122.332, country: 'US' },
  { name: '溫哥華', lat: 49.283, lng: -123.121, country: 'CA' },
  { name: '倫敦', lat: 51.507, lng: -0.128, country: 'GB' },
  { name: '巴黎', lat: 48.857, lng: 2.352, country: 'FR' },
  { name: '柏林', lat: 52.520, lng: 13.405, country: 'DE' },
  { name: '雪梨', lat: -33.869, lng: 151.209, country: 'AU' },
];

function _toRad(d) { return (d * Math.PI) / 180; }

function _haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = _toRad(lat2 - lat1);
  const dLng = _toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(_toRad(lat1)) * Math.cos(_toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestCity(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  let best = null, bestD = Infinity;
  for (const c of CITIES) {
    const d = _haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best ? best.name : null;
}

function searchCities(q) {
  if (!q || typeof q !== 'string') return [];
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return CITIES
    .filter(c => c.name.toLowerCase().includes(needle) || c.country.toLowerCase().includes(needle))
    .slice(0, 20);
}

module.exports = { CITIES, nearestCity, searchCities };
