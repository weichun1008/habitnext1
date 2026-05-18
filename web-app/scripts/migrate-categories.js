// scripts/migrate-categories.js
// Re-maps OfficialHabit.category strings to the 9 standard category names
// using prisma/seed/category-migration.json. Idempotent.
// Usage: node scripts/migrate-categories.js [--dry-run]

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { resolveTargetCategory } = require('./lib/category-resolver');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();

  const stdPath = path.join(__dirname, '..', 'prisma', 'seed', 'genesis-io.json');
  const mappingPath = path.join(__dirname, '..', 'prisma', 'seed', 'category-migration.json');
  const standards = JSON.parse(fs.readFileSync(stdPath, 'utf-8'));
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
  const stdNames = new Set(standards.map(c => c.name));

  const dbCats = await prisma.habitCategory.findMany();
  const dbNames = new Set(dbCats.map(c => c.name));
  for (const n of stdNames) {
    if (!dbNames.has(n)) {
      throw new Error(`Standard category "${n}" not present in DB. Run seed-genesis-io.js first.`);
    }
  }

  const habits = await prisma.officialHabit.findMany({ select: { id: true, name: true, category: true } });
  let updated = 0;
  let unchanged = 0;
  const moves = [];

  for (const h of habits) {
    const target = resolveTargetCategory(h.category, mapping, stdNames);
    if (target === h.category) {
      unchanged++;
      continue;
    }
    moves.push({ id: h.id, name: h.name, from: h.category, to: target });
    if (!dryRun) {
      await prisma.officialHabit.update({ where: { id: h.id }, data: { category: target } });
    }
    updated++;
  }

  console.log(`\nMigration ${dryRun ? '(DRY RUN) ' : ''}summary:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  if (moves.length) {
    console.log('\nMoves:');
    for (const m of moves.slice(0, 50)) {
      console.log(`  • "${m.name}"  ${m.from}  →  ${m.to}`);
    }
    if (moves.length > 50) console.log(`  …and ${moves.length - 50} more`);
  }

  const leftover = dbCats.filter(c => !stdNames.has(c.name));
  if (leftover.length) {
    console.log(`\nNon-standard HabitCategory rows still in DB (not auto-deleted):`);
    for (const c of leftover) console.log(`  • ${c.name}`);
    console.log('Review and delete via /admin/dashboard/habits/categories if no longer needed.');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
