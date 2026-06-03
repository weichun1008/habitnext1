// World Switch — the 3 gamification worlds registry (single source of truth).
// status: 'available' = has a real view; 'soon' = view not built yet.
const WORLDS = [
  { key: 'journey', name: '旅程', tagline: '把習慣完成的地點，蓋成一座真實世界的城市地圖', icon: 'Map', accent: '#0d9488', status: 'available' },
  { key: 'home',    name: '居家', tagline: '用每天的完成，把家一點一點佈置得更溫暖', icon: 'Home', accent: '#f59e0b', status: 'soon' },
  { key: 'figure',  name: '公仔', tagline: '養一隻陪你的夥伴，隨著你的習慣一起長大', icon: 'Sparkles', accent: '#f97362', status: 'soon' },
];
const WORLD_KEYS = WORLDS.map(w => w.key);
function getWorld(key) { return WORLDS.find(w => w.key === key) || null; }
function isValidWorld(key) { return WORLD_KEYS.includes(key); }
module.exports = { WORLDS, WORLD_KEYS, getWorld, isValidWorld };
