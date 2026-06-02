// 髒 Task.category（domain 名 / icon key / emoji）正規化成 9 大 GENESIS+IO domain，
// 對不到回 'other'。地圖聚合前每筆完成都先過這裡。
const DOMAIN_NAMES = [
  '基因與腸道', '環境', '飲食', '運動', '壓力與睡眠',
  '社交互動', '心靈', '認知與智慧', '職涯與平衡',
];

const ICON_TO_DOMAIN = {
  pill: '基因與腸道', sun: '環境', apple: '飲食', dumbbell: '運動',
  moon: '壓力與睡眠', users: '社交互動', yoga: '心靈',
  book: '認知與智慧', briefcase: '職涯與平衡',
  footprints: '運動', droplet: '飲食',
};

const EMOJI_TO_DOMAIN = {
  '🏃': '運動', '💪': '運動', '🧘': '心靈',
  '🍽': '飲食', '🍱': '飲食', '🍎': '飲食',
  '😴': '壓力與睡眠', '🌙': '壓力與睡眠', '📖': '認知與智慧',
};

function categoryToDomain(category) {
  if (!category) return 'other';
  if (DOMAIN_NAMES.includes(category)) return category;
  if (ICON_TO_DOMAIN[category]) return ICON_TO_DOMAIN[category];
  if (EMOJI_TO_DOMAIN[category]) return EMOJI_TO_DOMAIN[category];
  return 'other';
}

module.exports = { categoryToDomain, DOMAIN_NAMES };
