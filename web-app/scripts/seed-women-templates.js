// scripts/seed-women-templates.js
// Idempotently seeds the 4 flower Templates (daisy/rose/orchid/sunflower).
// Usage: node scripts/seed-women-templates.js (run from web-app/)
//
// Identifies templates by (expertId, name) — re-running updates content.

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'women-templates.json');
  const templates = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Find or create a system expert account to own these templates
  let expert = await prisma.expert.findFirst({ where: { email: 'system-women-course@habitnext.app' } });
  if (!expert) {
    expert = await prisma.expert.create({
      data: {
        name: 'HabitNext 系統',
        email: 'system-women-course@habitnext.app',
        password: 'unused',
        title: '系統內建',
        isActive: true,
        isApproved: true,
      },
    });
    console.log('Created system expert:', expert.id);
  } else {
    console.log('Using existing system expert:', expert.id);
  }

  const beforeCount = await prisma.template.count();
  console.log(`Before: ${beforeCount} templates in DB`);

  let created = 0;
  let updated = 0;
  for (const t of templates) {
    const existing = await prisma.template.findFirst({
      where: { expertId: expert.id, name: t.name },
    });
    const data = {
      expertId: expert.id,
      name: t.name,
      description: t.description ?? null,
      category: t.category,
      isPublic: t.isPublic ?? true,
      startDateType: t.startDateType ?? 'user_choice',
      tasks: t.tasks,
    };
    if (existing) {
      await prisma.template.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.template.create({ data });
      created++;
    }
  }

  const afterCount = await prisma.template.count();
  console.log(`Seeded flower templates: created=${created}, updated=${updated}`);
  console.log(`After: ${afterCount} templates in DB`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
