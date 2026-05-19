// scripts/migrate-subtasks-format.js
// Upgrades existing Task.subtasks objects to the new shape:
//   { id, label, addedAt, removedAt? }
// Removes legacy `completed` field; renames `title` → `label` if needed.
// Adds `addedAt` defaulting to task.createdAt (ISO date).
// Idempotent: skips tasks whose subtasks already have `addedAt`.

require('./lib/env');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const tasks = await prisma.task.findMany({
    select: { id: true, subtasks: true, createdAt: true },
  });

  let migrated = 0;
  let skipped = 0;
  for (const t of tasks) {
    const arr = Array.isArray(t.subtasks) ? t.subtasks : [];
    if (arr.length === 0) { skipped++; continue; }
    if (arr.every(s => s.addedAt)) { skipped++; continue; }

    const taskCreatedDate = t.createdAt.toISOString().slice(0, 10);
    const newSubtasks = arr.map(s => {
      const { completed: _c, title, label, ...rest } = s;
      return {
        ...rest,
        label: label || title || '未命名子任務',
        addedAt: rest.addedAt || taskCreatedDate,
      };
    });
    await prisma.task.update({ where: { id: t.id }, data: { subtasks: newSubtasks } });
    migrated++;
  }
  console.log(`Migrated ${migrated} tasks, skipped ${skipped} (empty or already-upgraded)`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
