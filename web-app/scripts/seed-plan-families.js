// scripts/seed-plan-families.js — idempotent upsert（依 slug）3 個計畫家族。
// Usage: node scripts/seed-plan-families.js
require('./lib/env');
const { PrismaClient } = require('@prisma/client');

const FAMILIES = [
  { slug: 'flower', title: '花朵計畫', intro: '依女性週期身體狀態分型，14 天分階段任務，跟著週期長出新習慣。', icon: 'Flower2', color: '#ec4899', quizPendingCopy: '花朵分型問卷功能開發中 — 目前可以先瀏覽全部，完成後會自動為你推薦最適合的花朵。', order: 0 },
  { slug: 'sleep', title: '睡眠處方', intro: '依睡眠卡點分型（壓力／節律／代謝失衡／荷爾蒙），14 天 4 階段處方。', icon: 'Moon', color: '#6366f1', quizPendingCopy: '睡眠分型問卷功能開發中 — 目前可以先瀏覽全部，完成後會自動為你推薦最適合的處方。', order: 1 },
  { slug: 'other', title: '其他公開計畫', intro: '專家設計的各式主題習慣計畫。', icon: 'LayoutGrid', color: '#10b981', quizPendingCopy: null, order: 2 },
];

async function main() {
  const prisma = new PrismaClient();
  for (const f of FAMILIES) {
    await prisma.planFamily.upsert({
      where: { slug: f.slug },
      update: { title: f.title, intro: f.intro, icon: f.icon, color: f.color, quizPendingCopy: f.quizPendingCopy, order: f.order },
      create: { ...f, isActive: true },
    });
    console.log('+ upsert', f.slug);
  }
  const n = await prisma.planFamily.count();
  console.log(`Done. PlanFamily rows: ${n}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
