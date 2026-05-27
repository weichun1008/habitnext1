// scripts/backfill-task-status.js
// One-time migration after Slice L schema push.
// Task.status defaulted to 'candidate' for new rows, but the schema push
// also flipped every pre-existing row to that default — they'd disappear
// from the daily view. Flip them back to 'active'. Idempotent — only
// touches rows still on 'candidate' that pre-date this migration.

require('./lib/env');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  // Cutoff: anything created before "now" (when this script runs) and still
  // on 'candidate' is pre-Slice-L data. Post-Slice-L the candidate-pool flow
  // writes 'candidate' deliberately and those rows should NOT be flipped
  // — but they'll have createdAt >= cutoff so the where clause skips them.
  const cutoff = new Date();
  const result = await prisma.task.updateMany({
    where: { status: 'candidate', createdAt: { lt: cutoff } },
    data: { status: 'active' },
  });
  console.log(`Backfilled ${result.count} tasks: candidate → active`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
