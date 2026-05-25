// scripts/seed-plan-categories.js
// Idempotently:
//   1. Backfills slug on existing PlanCategory rows (slug = name)
//   2. Seeds 8 system rows for the lib-enumerated typing dimensions
//      (花朵 daisy/rose/orchid/sunflower + 睡眠 sleep_stress/rhythm/metabolic/hormone)
//
// Usage: node scripts/seed-plan-categories.js (run from web-app/)

require('./lib/env');
const { PrismaClient } = require('@prisma/client');

const SYSTEM_ROWS = [
  // Flower (women's course) — pink family. Domain = 壓力與睡眠
  // (女性週期 templates primarily target sleep / stress symptoms during the cycle.)
  { slug: 'daisy',           name: '雛菊型',         color: '#f472b6', icon: '🌼', order: 100, domain: '壓力與睡眠' },
  { slug: 'rose',            name: '玫瑰型',         color: '#ec4899', icon: '🌹', order: 101, domain: '壓力與睡眠' },
  { slug: 'orchid',          name: '蘭花型',         color: '#d946ef', icon: '🪷', order: 102, domain: '壓力與睡眠' },
  { slug: 'sunflower',       name: '向日葵型',       color: '#fb923c', icon: '🌻', order: 103, domain: '壓力與睡眠' },
  // Sleep — indigo family
  { slug: 'sleep_stress',    name: '睡眠 · 壓力',    color: '#818cf8', icon: '😵‍💫', order: 200, domain: '壓力與睡眠' },
  { slug: 'sleep_rhythm',    name: '睡眠 · 節律',    color: '#6366f1', icon: '🌙',  order: 201, domain: '壓力與睡眠' },
  { slug: 'sleep_metabolic', name: '睡眠 · 代謝',    color: '#4f46e5', icon: '⏰',  order: 202, domain: '壓力與睡眠' },
  { slug: 'sleep_hormone',   name: '睡眠 · 荷爾蒙',  color: '#4338ca', icon: '🔄',  order: 203, domain: '壓力與睡眠' },
];

async function main() {
  const prisma = new PrismaClient();

  // 1. Backfill slug on existing user-defined rows (where slug is null)
  const unslugged = await prisma.planCategory.findMany({ where: { slug: null } });
  console.log(`Found ${unslugged.length} PlanCategory rows without slug — backfilling slug = name…`);
  for (const row of unslugged) {
    await prisma.planCategory.update({
      where: { id: row.id },
      data: { slug: row.name, isSystem: false },
    });
    console.log(`  backfilled: "${row.name}" (id=${row.id})`);
  }

  // 2. Upsert system rows by slug (idempotent — re-run safely updates color/icon/order/name)
  let created = 0, updated = 0;
  for (const r of SYSTEM_ROWS) {
    const existing = await prisma.planCategory.findUnique({ where: { slug: r.slug } });
    if (existing) {
      await prisma.planCategory.update({
        where: { slug: r.slug },
        data: {
          name: r.name,
          color: r.color,
          icon: r.icon,
          order: r.order,
          domain: r.domain,
          isSystem: true,
        },
      });
      updated++;
    } else {
      await prisma.planCategory.create({
        data: {
          slug: r.slug,
          name: r.name,
          color: r.color,
          icon: r.icon,
          order: r.order,
          domain: r.domain,
          isSystem: true,
        },
      });
      created++;
    }
  }

  const totalCount = await prisma.planCategory.count();
  console.log(`Seeded system PlanCategories: created=${created}, updated=${updated}`);
  console.log(`Total PlanCategory rows: ${totalCount}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
