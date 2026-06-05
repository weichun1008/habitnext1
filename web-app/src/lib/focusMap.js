// src/lib/focusMap.js
// Pure helpers for Slice L — no Prisma, no I/O.
// Spec: docs/superpowers/specs/2026-05-27-slice-L-focus-map-candidate-pool-design.md

// 四象限定義（label/advice 為使用者可見白話文，無 BJ Fogg 字樣）。
// iconKey 對應 lucide-react 元件名；color 為點/主色。
const QUADRANTS = {
  golden:     { label: '值得優先做', iconKey: 'Star',        color: '#ea580c', tone: 'amber', rec: 'recommended', advice: '高影響又容易做到 — 最划算，建議先加入。' },
  big_fish:   { label: '值得挑戰',   iconKey: 'Mountain',    color: '#7c3aed', tone: 'violet', rec: 'park',       advice: '影響大但目前不易做到 — 可先從更簡單的版本開始，別逼太緊。' },
  background: { label: '順手加碼',   iconKey: 'Sprout',      color: '#0891b2', tone: 'cyan',  rec: 'optional',    advice: '容易做但影響有限 — 行有餘力再加。' },
  skip:       { label: '建議先跳過', iconKey: 'SkipForward', color: '#94a3b8', tone: 'gray',  rec: 'skip',        advice: '影響有限又不易做 — 建議先擱著；但你仍可自行加入。' },
};

// 養成期間選項（給 DurationSheet）。value 為天數；null = 不設限（沒有終止日）。
const DURATION_OPTIONS = [
  { value: 21,   label: '21 天',  sub: '起步嘗試' },
  { value: 66,   label: '66 天',  sub: '養成自動化', recommended: true },
  { value: 90,   label: '90 天',  sub: '鞏固成形' },
  { value: null, label: '不設限', sub: '沒有終止日，持續追蹤' },
];

// 習慣養成的科學依據（漸進揭露用，不在主畫面寫全文）。數字不誇大。
const HABIT_FORMATION_SCIENCE = {
  medianDays: 66,
  rangeDays: [18, 254],
  summary: '研究發現，新行為要變成「不太需要意志力的自動反應」，平均約需 66 天（會因人和習慣難度而異，落在 18–254 天）。所以我們把預設放在 66 天。',
};

// Map an (impact, ability) pair to its quadrant key.
// Boundary rule: high = >=4, low = <=3.
function quadrantOf(impact, ability) {
  const i = typeof impact === 'number' ? impact : 3;
  const a = typeof ability === 'number' ? ability : 3;
  if (i >= 4 && a >= 4) return 'golden';
  if (i <= 3 && a >= 4) return 'background';
  if (i >= 4 && a <= 3) return 'big_fish';
  return 'skip';
}

// Returns Set<id> of candidates to pre-check on the rating page.
// Golden quadrant only, capped at 3 by (impact+ability) sum.
// Uses sliderSeedFor() to read the effective impact/ability (user → fallback → 3).
function recommendDefaults(candidates) {
  if (!Array.isArray(candidates)) return new Set();
  const golden = candidates
    .map(c => ({ c, seed: sliderSeedFor(c) }))
    .filter(({ seed }) => quadrantOf(seed.impact, seed.ability) === 'golden')
    .sort((a, b) => (b.seed.impact + b.seed.ability) - (a.seed.impact + a.seed.ability))
    .slice(0, 3)
    .map(({ c }) => c.id);
  return new Set(golden);
}

// Resolve the effective impact/ability for a candidate task.
// Priority: userImpact/userAbility (already rated) → officialHabit defaults → 3.
function sliderSeedFor(candidate) {
  if (!candidate) return { impact: 3, ability: 3 };
  const impact = typeof candidate.userImpact === 'number'
    ? candidate.userImpact
    : (candidate.officialHabit?.impact ?? 3);
  const ability = typeof candidate.userAbility === 'number'
    ? candidate.userAbility
    : (candidate.officialHabit?.ability ?? 3);
  return { impact, ability };
}

// 依使用者在焦點地圖的選擇，組出 batch-rate 的 payload。
// 已加入(addedSet) → activate（帶 targetDays）；其餘 → keep_candidate（保留候選、不刪除）。
// ratings: Map<taskId, { impact, ability }>。targetDays: number | null。
function buildBatchPayload(candidates, ratings, addedSet, targetDays) {
  if (!Array.isArray(candidates)) return [];
  return candidates.map(c => {
    const r = ratings.get(c.id) || { impact: 3, ability: 3 };
    const impact = typeof r.impact === 'number' ? r.impact : 3;
    const ability = typeof r.ability === 'number' ? r.ability : 3;
    if (addedSet && addedSet.has(c.id)) {
      return { taskId: c.id, userImpact: impact, userAbility: ability, action: 'activate', targetDays: targetDays ?? null };
    }
    return { taskId: c.id, userImpact: impact, userAbility: ability, action: 'keep_candidate' };
  });
}

module.exports = {
  QUADRANTS,
  DURATION_OPTIONS,
  HABIT_FORMATION_SCIENCE,
  quadrantOf,
  recommendDefaults,
  sliderSeedFor,
  buildBatchPayload,
};
