// scripts/seed-habit-translations.js
// 把 prisma/seed/habit-translations/{locale}.json 灌進 OfficialHabit.translations。
// 翻譯檔以 canonical name（zh-TW）為 key，每筆 { name, description }。
// 可重跑（idempotent — 每次整顆 translations JSON 重建後寫入，依 name 比對）。
// Usage: node scripts/seed-habit-translations.js
require('./lib/env');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const LOCALES = ['en', 'zh-CN', 'ja', 'ko', 'de', 'es'];
const DIR = path.join(__dirname, '..', 'prisma', 'seed', 'habit-translations');

async function main() {
    // 讀全部語言檔：{ locale: { [canonicalName]: { name, description } } }
    const byLocale = {};
    for (const locale of LOCALES) {
        const file = path.join(DIR, `${locale}.json`);
        if (!fs.existsSync(file)) {
            console.warn(`✗ 缺翻譯檔，略過 ${locale}: ${file}`);
            continue;
        }
        byLocale[locale] = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
    const loaded = Object.keys(byLocale);
    if (loaded.length === 0) { console.error('✗ 沒有任何翻譯檔'); process.exit(1); }

    // 以翻譯檔的聯集 name 當更新對象，per-habit 組 translations JSON。
    const names = new Set();
    for (const locale of loaded) for (const n of Object.keys(byLocale[locale])) names.add(n);

    const prisma = new PrismaClient();
    let updated = 0, notFound = 0;
    for (const name of names) {
        const translations = {};
        for (const locale of loaded) {
            const entry = byLocale[locale][name];
            if (entry && entry.name) {
                translations[locale] = { name: entry.name, description: entry.description || '' };
            }
        }
        const r = await prisma.officialHabit.updateMany({ where: { name }, data: { translations } });
        if (r.count > 0) updated += r.count;
        else { notFound++; console.warn('✗ DB 找不到習慣：', name); }
    }

    const total = await prisma.officialHabit.count();
    const filled = await prisma.officialHabit.count({ where: { NOT: { translations: { equals: null } } } });
    console.log(`\nDone. 語言 [${loaded.join(', ')}]、對象 ${names.size} 個、更新 ${updated}、找不到 ${notFound}。`);
    console.log(`目前 ${filled}/${total} 個官方習慣已有翻譯。`);
    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
