// scripts/audit-categories.js
// Read-only report: shows existing HabitCategory rows and habit counts.
// Usage: node scripts/audit-categories.js (run from web-app/)

require('./lib/env');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const cats = await prisma.habitCategory.findMany({ orderBy: { order: 'asc' } });
  const habitCounts = await prisma.officialHabit.groupBy({
    by: ['category'],
    _count: { _all: true },
  });
  const countByName = new Map(habitCounts.map(h => [h.category, h._count._all]));

  console.log(`Existing HabitCategory rows (${cats.length}):`);
  for (const c of cats) {
    const count = countByName.get(c.name) || 0;
    console.log(`  • ${c.name}  (order=${c.order}, icon=${c.icon || '-'}, color=${c.color || '-'})  → ${count} habits`);
  }

  const known = new Set(cats.map(c => c.name));
  const orphans = habitCounts.filter(h => !known.has(h.category));
  if (orphans.length) {
    console.log('\nOfficialHabits referencing a category NOT in HabitCategory table:');
    for (const o of orphans) {
      console.log(`  • "${o.category}" → ${o._count._all} habits`);
    }
  } else {
    console.log('\nNo orphan habit categories.');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
