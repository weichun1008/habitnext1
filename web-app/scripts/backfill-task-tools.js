/**
 * Slice T backfill — give EXISTING tasks their tool.
 *
 * For every Task that has an officialHabitId whose OfficialHabit.fiveT.toolVirtual
 * is set, copy { type, params } into Task.toolType / Task.toolConfig — but ONLY
 * when the task doesn't already have a toolType (additive, non-destructive).
 *
 * Idempotent: re-running skips tasks that already carry a tool.
 * Safe: only fills null toolType; never overwrites a user/seed-set tool.
 */
require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    where: { officialHabitId: { not: null }, toolType: null },
    select: { id: true, title: true, officialHabitId: true },
  });
  console.log(`Candidate tasks (officialHabitId set, no toolType): ${tasks.length}`);

  // Cache official habit fiveT lookups.
  const habitIds = [...new Set(tasks.map((t) => t.officialHabitId))];
  const habits = await prisma.officialHabit.findMany({
    where: { id: { in: habitIds } },
    select: { id: true, fiveT: true },
  });
  const fiveTById = new Map(habits.map((h) => [h.id, h.fiveT]));

  let updated = 0;
  const byType = { breathing: 0, timer: 0, music: 0 };
  for (const task of tasks) {
    const tv = fiveTById.get(task.officialHabitId)?.toolVirtual;
    if (!tv || !tv.type) continue;
    await prisma.task.update({
      where: { id: task.id },
      data: { toolType: tv.type, toolConfig: tv.params ?? null },
    });
    updated += 1;
    if (byType[tv.type] != null) byType[tv.type] += 1;
    console.log(`  ✓ ${task.title} → ${tv.type}`);
  }

  console.log('--- Summary ---');
  console.log(`breathing: ${byType.breathing}`);
  console.log(`timer:     ${byType.timer}`);
  console.log(`music:     ${byType.music}`);
  console.log(`updated:   ${updated}, skipped: ${tasks.length - updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
