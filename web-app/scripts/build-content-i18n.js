// scripts/build-content-i18n.js
// 編譯「中文原字 → 翻譯」的扁平內容字典，輸出到 src/lib/i18n/content/{locale}.json。
// 來源：
//   1. prisma/seed/genesis-io-habits.json — 官方習慣的 zh name/description/subtask label（canonical key）
//   2. prisma/seed/habit-translations/{locale}.json — 官方習慣 name/description 的翻譯（依 zh name 為 key）
//   3. prisma/seed/{women,sleep}-templates.json — template 的 zh name/description/phase/task title/details/subtask label
//   4. prisma/seed/content-extra/{locale}.json — 上述 template 字串 + 所有子任務 label 的翻譯（扁平 zh→translated）
// 產物是「扁平 zh字串 → 翻譯字串」，供 localizeContent() 在前端做 O(1) 查表，
// 查不到就 fallback 回原字（涵蓋使用者自訂 / admin 後台新建 / 尚未翻譯）。
//
// 純編譯、不碰 DB。Usage: node scripts/build-content-i18n.js
const fs = require('fs');
const path = require('path');

const LOCALES = ['en', 'zh-CN', 'ja', 'ko', 'de', 'es'];
const SEED = path.join(__dirname, '..', 'prisma', 'seed');
const OUT = path.join(__dirname, '..', 'src', 'lib', 'i18n', 'content');

function readJson(p, fallback) {
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
    catch (e) { return fallback; }
}

function collectHabitZh() {
    // canonical zh 字串集合：name / description / subtask labels
    const src = readJson(path.join(SEED, 'genesis-io-habits.json'), []);
    const list = Array.isArray(src) ? src : (src.habits || []);
    const subtaskLabels = new Set();
    for (const h of list) {
        for (const cfg of Object.values(h.difficulties || {})) {
            for (const s of (cfg.subtasks || [])) if (s.label) subtaskLabels.add(s.label);
        }
    }
    return { list, subtaskLabels };
}

function main() {
    const { list: habits } = collectHabitZh();
    fs.mkdirSync(OUT, { recursive: true });

    let totalsByLocale = {};
    for (const locale of LOCALES) {
        const map = {};

        // (1)+(2) 官方習慣 name/description
        const habitTr = readJson(path.join(SEED, 'habit-translations', `${locale}.json`), {});
        for (const h of habits) {
            const tr = habitTr[h.name];
            if (tr) {
                if (h.name && tr.name) map[h.name] = tr.name;
                if (h.description && tr.description) map[h.description] = tr.description;
            }
        }

        // (3)+(4) template 字串 + 子任務 label（扁平翻譯檔）
        const extra = readJson(path.join(SEED, 'content-extra', `${locale}.json`), {});
        for (const [zh, t] of Object.entries(extra)) {
            if (zh && t) map[zh] = t;
        }

        fs.writeFileSync(path.join(OUT, `${locale}.json`), JSON.stringify(map, null, 0) + '\n');
        totalsByLocale[locale] = Object.keys(map).length;
    }
    console.log('content dicts built:', JSON.stringify(totalsByLocale));
}
main();
