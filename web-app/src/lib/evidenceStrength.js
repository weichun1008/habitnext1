// 科學證據力評分 — 純函式、無相依，前後端共用。
// 設計：docs/superpowers/specs/2026-06-01-evidence-strength-indicator-design.md
//
// 只存 4 個原始面向整數；total / tier 一律由此推算。調整 levels.points 或
// THRESHOLDS 後重新部署，即由既有原始值重算，無需資料遷移。

export const DIMENSIONS = [
  {
    key: 'studyType', label: '研究類型',
    levels: [
      { value: 3, label: '統合分析／系統綜述', points: 3 },
      { value: 2, label: 'RCT 介入試驗', points: 2 },
      { value: 1, label: '觀察性研究', points: 1 },
      { value: 0, label: '動物／機制／專家意見', points: 0 },
    ],
  },
  {
    key: 'scale', label: '對象與規模',
    levels: [
      { value: 2, label: '大型人體', points: 2 },
      { value: 1, label: '小型人體', points: 1 },
      { value: 0, label: '非人體（動物／細胞）', points: 0 },
    ],
  },
  {
    key: 'causality', label: '因果強度',
    levels: [
      { value: 2, label: '介入證明因果', points: 2 },
      { value: 1, label: '強相關＋合理機制', points: 1 },
      { value: 0, label: '僅相關／機制推論', points: 0 },
    ],
  },
  {
    key: 'replication', label: '重複驗證',
    levels: [
      { value: 2, label: '多研究一致', points: 2 },
      { value: 1, label: '部分支持', points: 1 },
      { value: 0, label: '單一研究／結果混合', points: 0 },
    ],
  },
];

// 門檻（可優化）。max total = 3+2+2+2 = 9
export const THRESHOLDS = { strong: 7, moderate: 4 };

export const TIER_META = {
  strong: { key: 'strong', label: '強', filled: 3 },
  moderate: { key: 'moderate', label: '中', filled: 2 },
  preliminary: { key: 'preliminary', label: '初步', filled: 1 },
};

// 只是 class token 字串（資料，非 import Tailwind）；元件套用。
// bar = 已填滿格子的顏色（實心、清楚）；track = 未填滿格子的軌道（淺灰、各底色上皆可見）。
export const TONE_CLASSES = {
  strong: { text: 'text-emerald-700', bg: 'bg-emerald-100', bar: 'bg-emerald-500', track: 'bg-emerald-200' },
  moderate: { text: 'text-amber-700', bg: 'bg-amber-100', bar: 'bg-amber-500', track: 'bg-amber-200' },
  preliminary: { text: 'text-slate-700', bg: 'bg-slate-200', bar: 'bg-slate-500', track: 'bg-slate-300' },
};

function findDim(key) { return DIMENSIONS.find(d => d.key === key) || null; }
function findLevel(key, value) {
  const dim = findDim(key);
  return dim ? dim.levels.find(l => l.value === value) || null : null;
}

export function levelLabel(key, value) {
  const lvl = findLevel(key, value);
  return lvl ? lvl.label : '';
}

export function dimMaxPoints(key) {
  const dim = findDim(key);
  return dim ? Math.max(...dim.levels.map(l => l.points)) : 0;
}

// 把任意輸入清成合法 evidence 物件，否則 null（任一面向缺失/非法即視為未評分）。
export function sanitizeEvidence(input) {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const dim of DIMENSIONS) {
    const v = input[dim.key];
    if (!Number.isInteger(v)) return null;
    if (!dim.levels.some(l => l.value === v)) return null;
    out[dim.key] = v;
  }
  return out;
}

// 主函式：合法 evidence → { total, tier, tierLabel }；否則 null（不顯示 badge）。
export function scoreEvidence(evidence) {
  const clean = sanitizeEvidence(evidence);
  if (!clean) return null;
  const total = DIMENSIONS.reduce((sum, dim) => {
    const lvl = findLevel(dim.key, clean[dim.key]);
    return sum + (lvl ? lvl.points : 0);
  }, 0);
  let tier;
  if (total >= THRESHOLDS.strong) tier = 'strong';
  else if (total >= THRESHOLDS.moderate) tier = 'moderate';
  else tier = 'preliminary';
  return { total, tier, tierLabel: TIER_META[tier].label };
}

// UI 顯示用：某面向某值的標籤、分數、滿格、色調。
export function dimDisplay(key, value) {
  const lvl = findLevel(key, value);
  const points = lvl ? lvl.points : 0;
  const max = dimMaxPoints(key);
  const filled = Math.min(3, Math.max(0, points));
  let tone;
  if (points <= 0) tone = 'preliminary';
  else if (points >= max) tone = 'strong';
  else tone = 'moderate';
  return { label: lvl ? lvl.label : '', points, max, filled, tone };
}
