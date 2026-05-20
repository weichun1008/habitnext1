// scripts/seed-sleep-templates.js
// Idempotently seeds the 4 sleep Templates (sleep_<type>).
// Usage: node scripts/seed-sleep-templates.js (run from web-app/)
//
// Identifies templates by (expertId, name) — re-running updates content.

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'sleep-templates.json');
  const templates = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const expertEmail = 'system-sleep-course@habitnext.app';
  let expert = await prisma.expert.findFirst({ where: { email: expertEmail } });
  if (!expert) {
    expert = await prisma.expert.create({
      data: {
        name: 'HabitNext 系統 · 睡眠',
        email: expertEmail,
        password: 'unused',
        title: '系統內建',
        isActive: true,
        isApproved: true,
      },
    });
    console.log('Created system sleep expert:', expert.id);
  } else {
    console.log('Using existing system sleep expert:', expert.id);
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
  console.log(`Seeded sleep templates: created=${created}, updated=${updated}`);
  console.log(`After: ${afterCount} templates in DB`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
