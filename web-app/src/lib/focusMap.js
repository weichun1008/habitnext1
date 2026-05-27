// src/lib/focusMap.js
// Pure helpers for Slice L — no Prisma, no I/O.
// Spec: docs/superpowers/specs/2026-05-27-slice-L-focus-map-candidate-pool-design.md

const QUADRANTS = {
  golden:     { label: '🌟 黃金行為', tone: 'amber', rec: 'recommended', advice: '推薦啟用 — 高影響又易做到' },
  background: { label: '🌱 順手習慣', tone: 'gray',  rec: 'optional',    advice: '可加可不加 — 容易做但影響有限' },
  big_fish:   { label: '⏳ 大魚',     tone: 'gray',  rec: 'park',        advice: 'Fogg：先建立基本技能再來' },
  skip:       { label: '🗑️ 跳過',     tone: 'gray',  rec: 'skip',        advice: 'Fogg：別耗 willpower 在這上' },
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

module.exports = {
  QUADRANTS,
  quadrantOf,
  recommendDefaults,
  sliderSeedFor,
};
