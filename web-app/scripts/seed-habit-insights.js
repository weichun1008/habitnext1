// scripts/seed-habit-insights.js
// Slice N — idempotent upsert of HabitInsight rows from
// prisma/seed/habit-insights.json.
//
// Each JSON entry carries a `habitName` (looked up against OfficialHabit.name)
// rather than a habitId, since cuid()s aren't predictable across DBs. The
// script logs (and skips) entries whose habit isn't found, so a typo doesn't
// silently drop the insight.
//
// Idempotency key: (habitId, title). If a row with that pair exists, we
// update; otherwise create. The HabitInsight model has no unique constraint
// on this pair (titles are admin-edited, so adding one would constrain
// future authoring), so we do an explicit findFirst + update/create dance.
//
// Usage:
//   cd web-app && node scripts/seed-habit-insights.js
//
// Requires POSTGRES_URL (either in shell env or .env.local loaded by lib/env).

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
    const prisma = new PrismaClient();
    const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'habit-insights.json');
    const entries = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    console.log(`Loaded ${entries.length} insight(s) from ${path.basename(dataPath)}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const entry of entries) {
        const { habitName, title, summary, detail, takeaway, sources, tags, status, order, aiGenerated, sourcePrompt, evidence } = entry;

        if (!habitName || !title || !summary || !detail) {
            console.warn(`✗ Skip — missing required fields:`, { habitName, title });
            skipped++;
            continue;
        }

        const habit = await prisma.officialHabit.findUnique({ where: { name: habitName } });
        if (!habit) {
            console.warn(`✗ Skip — habit not found: "${habitName}". Did you seed genesis-io-habits first?`);
            skipped++;
            continue;
        }

        const data = {
            title: title.trim(),
            summary: summary.trim(),
            detail: detail.trim(),
            takeaway: takeaway ? takeaway.trim() : null,
            sources: Array.isArray(sources) ? sources : [],
            tags: Array.isArray(tags)
                ? tags.filter(t => t != null).map(t => String(t).trim()).filter(Boolean)
                : [],
            status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
            order: Number.isFinite(order) ? order : 0,
            aiGenerated: Boolean(aiGenerated),
            sourcePrompt: sourcePrompt || null,
            evidence: (evidence && typeof evidence === 'object') ? evidence : null,
        };

        // Idempotency: match on (habitId, title). Title is the closest thing
        // to a human-readable slug we have; admins should pick distinct titles
        // per habit.
        const existing = await prisma.habitInsight.findFirst({
            where: { habitId: habit.id, title: data.title },
        });

        if (existing) {
            await prisma.habitInsight.update({
                where: { id: existing.id },
                data,
            });
            console.log(`↻ Updated: [${habitName}] "${data.title}"`);
            updated++;
        } else {
            await prisma.habitInsight.create({
                data: { ...data, habitId: habit.id },
            });
            console.log(`+ Created: [${habitName}] "${data.title}"`);
            created++;
        }
    }

    const totalAfter = await prisma.habitInsight.count();
    console.log('');
    console.log(`Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}.`);
    console.log(`Total HabitInsight rows in DB: ${totalAfter}`);

    await prisma.$disconnect();
}

main().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
