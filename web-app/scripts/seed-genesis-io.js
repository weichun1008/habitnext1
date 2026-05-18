// scripts/seed-genesis-io.js
// Idempotently upserts the 9 GENESIS+IO standard categories.
// Usage: node scripts/seed-genesis-io.js (run from web-app/)

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'genesis-io.json');
  const categories = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let createdCount = 0;
  let updatedCount = 0;

  for (const c of categories) {
    const existing = await prisma.habitCategory.findUnique({ where: { name: c.name } });
    await prisma.habitCategory.upsert({
      where: { name: c.name },
      update: { order: c.order, icon: c.icon, color: c.color },
      create: { name: c.name, order: c.order, icon: c.icon, color: c.color },
    });
    if (existing) updatedCount++; else createdCount++;
  }

  console.log(`Seeded GENESIS+IO categories: created=${createdCount}, updated=${updatedCount}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
