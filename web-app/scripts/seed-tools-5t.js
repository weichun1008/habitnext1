// scripts/seed-tools-5t.js
// Slice T — idempotently attaches the 5T tool config (fiveT.toolVirtual / fiveT.toolPhysical)
// to existing OfficialHabit rows by matching their Chinese name. This only UPDATES the
// fiveT column and MERGES onto whatever is already there, so re-running against the shared
// dev=prod Neon DB is safe and produces the same result every time.
// Usage: node scripts/seed-tools-5t.js (run from web-app/)

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const { defaultToolConfig } = require('../src/lib/tools');

const includesAny = (name, needles) => needles.some(n => name.includes(n));

function virtualForName(name) {
  if (includesAny(name, ['4-7-8', '呼吸', '腹式', '深呼吸'])) {
    return { type: 'breathing', params: defaultToolConfig('breathing') };
  }
  if (includesAny(name, ['番茄', '棒式', '平板', '午睡', '冥想', '靜默', '放空', '專注'])) {
    return { type: 'timer', params: defaultToolConfig('timer') };
  }
  if (includesAny(name, ['睡前', '助眠', '睡眠', '入睡'])) {
    return { type: 'music', params: { ...defaultToolConfig('music'), problemId: 'stress' } };
  }
  return null;
}

function physicalForName(name) {
  const items = [];
  if (name.includes('睡')) items.push({ name: '眼罩' });
  if (includesAny(name, ['伏地挺身', '棒式', '平板'])) items.push({ name: '伏地挺身架' });
  if (includesAny(name, ['補充', '保健', '維生素', '營養'])) items.push({ name: '保健品' });
  return items;
}

async function main() {
  const prisma = new PrismaClient();

  const habits = await prisma.officialHabit.findMany();
  console.log(`Loaded ${habits.length} OfficialHabit rows`);

  const counts = { breathing: 0, timer: 0, music: 0, physical: 0 };
  let updated = 0;
  let skipped = 0;

  for (const habit of habits) {
    const toolVirtual = virtualForName(habit.name);
    const toolPhysical = physicalForName(habit.name);

    if (!toolVirtual && toolPhysical.length === 0) {
      skipped++;
      continue;
    }

    const fiveT = {
      ...(habit.fiveT || {}),
      ...(toolVirtual ? { toolVirtual } : {}),
      ...(toolPhysical.length ? { toolPhysical } : {}),
    };

    await prisma.officialHabit.update({ where: { id: habit.id }, data: { fiveT } });

    if (toolVirtual) counts[toolVirtual.type]++;
    if (toolPhysical.length) counts.physical++;
    updated++;
    console.log(
      `  ✓ ${habit.name} → ${toolVirtual ? toolVirtual.type : '—'}` +
        `${toolPhysical.length ? ` + physical[${toolPhysical.map(p => p.name).join(', ')}]` : ''}`
    );
  }

  console.log('--- Summary ---');
  console.log(`breathing: ${counts.breathing}`);
  console.log(`timer:     ${counts.timer}`);
  console.log(`music:     ${counts.music}`);
  console.log(`physical:  ${counts.physical}`);
  console.log(`updated:   ${updated}, skipped: ${skipped}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
