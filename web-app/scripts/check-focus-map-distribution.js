// scripts/check-focus-map-distribution.js
//
// Slice D sanity gate — verifies the impact/ability scores in
// genesis-io-habits.json satisfy the rubric in
// docs/superpowers/specs/2026-05-23-slice-d-focus-map-design.md §4.3:
//
//   1. Every one of the 9 GENESIS+IO domains has ≥1 habit with impact ≥ 4
//      (otherwise there's no "flagship" in that domain).
//   2. Every domain has ≥1 habit with ability ≥ 4
//      (otherwise newbies in that domain have nothing easy to start with).
//   3. At most 40% of habits sit at exactly (3, 3) — proxy for "did anyone
//      actually score these, or did everything stay at the default".
//
// Exit 0 on pass, 1 on any failure.
//
// Usage:   node scripts/check-focus-map-distribution.js
//          (run from web-app/, no DB connection needed — JSON is source of truth)

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'genesis-io-habits.json');
const habits = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const EXPECTED_DOMAINS = [
    '基因與腸道', '環境', '飲食', '運動',
    '壓力與睡眠', '社交互動', '心靈', '認知與智慧', '職涯與平衡',
];

const failures = [];
const warnings = [];

// Check 1: every habit has valid impact + ability in [1, 5]
for (const h of habits) {
    if (typeof h.impact !== 'number' || h.impact < 1 || h.impact > 5) {
        failures.push(`OUT-OF-RANGE impact=${h.impact} on "${h.name}"`);
    }
    if (typeof h.ability !== 'number' || h.ability < 1 || h.ability > 5) {
        failures.push(`OUT-OF-RANGE ability=${h.ability} on "${h.name}"`);
    }
}

// Bucket habits by domain
const byDomain = {};
for (const h of habits) {
    (byDomain[h.category] ||= []).push(h);
}

// Check 2: every expected domain has habits + ≥1 impact≥4 + ≥1 ability≥4
for (const domain of EXPECTED_DOMAINS) {
    const list = byDomain[domain];
    if (!list || list.length === 0) {
        failures.push(`MISSING domain entirely: ${domain}`);
        continue;
    }
    const hasHighImpact = list.some(h => h.impact >= 4);
    const hasHighAbility = list.some(h => h.ability >= 4);
    if (!hasHighImpact) {
        failures.push(`${domain}: no habit with impact ≥ 4 (need at least one flagship)`);
    }
    if (!hasHighAbility) {
        failures.push(`${domain}: no habit with ability ≥ 4 (need at least one easy entry point)`);
    }
}

// Check 3: at most 40% of habits at exact (3, 3)
const centerCount = habits.filter(h => h.impact === 3 && h.ability === 3).length;
const centerPct = centerCount / habits.length;
if (centerPct > 0.40) {
    failures.push(
        `${centerCount}/${habits.length} habits (${(centerPct * 100).toFixed(1)}%) ` +
        `at (3,3) center — exceeds 40% threshold; rubric likely not applied to most habits`
    );
} else if (centerPct > 0.25) {
    warnings.push(
        `${centerCount}/${habits.length} habits at (3,3) — within budget but cluster-heavy`
    );
}

// Report
console.log(`=== Slice D focus-map score distribution check ===`);
console.log(`Total habits: ${habits.length}`);
console.log(`Domains:      ${Object.keys(byDomain).length} (expected ${EXPECTED_DOMAINS.length})`);
console.log(`Center (3,3): ${centerCount} (${(centerPct * 100).toFixed(1)}%)`);
console.log('');

for (const domain of EXPECTED_DOMAINS) {
    const list = byDomain[domain] || [];
    const flagship = list.filter(h => h.impact >= 4).length;
    const easy = list.filter(h => h.ability >= 4).length;
    const center = list.filter(h => h.impact === 3 && h.ability === 3).length;
    console.log(`  ${domain.padEnd(8)} ${list.length} habits · ${flagship} flagship (impact≥4) · ${easy} easy-entry (ability≥4) · ${center} centered`);
}
console.log('');

if (warnings.length) {
    console.log('Warnings:');
    warnings.forEach(w => console.log('  ⚠ ' + w));
    console.log('');
}

if (failures.length === 0) {
    console.log('✓ All 9 domains pass distribution checks.');
    process.exit(0);
}

console.log(`✗ ${failures.length} failure(s):`);
failures.forEach(f => console.log('  ✗ ' + f));
process.exit(1);
