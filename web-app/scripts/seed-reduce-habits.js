// scripts/seed-reduce-habits.js
// Slice U — idempotently upserts the official reverse (decrease) habits so users
// can add 降低抽菸 / 戒菸 / 降低喝酒 / 減少勉強社交 from the library without the form.
// Upsert is keyed on the unique `name`, so re-running against the shared DB is a no-op.
// Usage: node scripts/seed-reduce-habits.js (run from web-app/)

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'reduce-habits.json');
  const habits = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const beforeCount = await prisma.officialHabit.count();
  console.log(`Before: ${beforeCount} habits in DB`);

  let created = 0;
  let updated = 0;
  for (const h of habits) {
    const existing = await prisma.officialHabit.findUnique({ where: { name: h.name } });
    await prisma.officialHabit.upsert({
      where: { name: h.name },
      update: {
        description: h.description ?? null,
        category: h.category,
        icon: h.icon ?? null,
        difficulties: h.difficulties,
        impact: h.impact ?? 3,
        ability: h.ability ?? 3,
        direction: h.direction ?? null,
        isActive: h.isActive ?? true,
      },
      create: {
        name: h.name,
        description: h.description ?? null,
        category: h.category,
        icon: h.icon ?? null,
        difficulties: h.difficulties,
        impact: h.impact ?? 3,
        ability: h.ability ?? 3,
        direction: h.direction ?? null,
        isActive: h.isActive ?? true,
      },
    });
    if (existing) updated++; else created++;
  }

  const afterCount = await prisma.officialHabit.count();
  console.log(`Seeded reduce habits: created=${created}, updated=${updated}`);
  console.log(`After: ${afterCount} habits in DB`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
