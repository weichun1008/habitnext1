// Helpers for deciding whether a Template should be highlighted as
// 「為你推薦」 in the TemplateExplorer based on a user's quiz results.
// Pure functions — kept out of the JSX file for easy unit testing.

const FLOWER_TYPES = new Set(['daisy', 'rose', 'orchid', 'sunflower']);
const SLEEP_CATEGORIES = new Set([
    'sleep_stress', 'sleep_rhythm', 'sleep_metabolic', 'sleep_hormone',
]);

/**
 * Return true when the template's category matches the user's quiz result.
 * Templates with categories outside the typed namespaces are never
 * "recommended" (they're generic / other).
 */
function isRecommendedFor(template, userTypeKey, userSleepTypeKey) {
    if (!template || !template.category) return false;
    if (FLOWER_TYPES.has(template.category)) {
        return userTypeKey != null && template.category === userTypeKey;
    }
    if (SLEEP_CATEGORIES.has(template.category)) {
        return userSleepTypeKey != null && template.category === `sleep_${userSleepTypeKey}`;
    }
    return false;
}

/**
 * Stable-sort: recommended templates float to the top, everything else
 * keeps original order. Returns a new array.
 */
function sortByRecommendation(templates, userTypeKey, userSleepTypeKey) {
    return [...templates].sort((a, b) => {
        const aRec = isRecommendedFor(a, userTypeKey, userSleepTypeKey);
        const bRec = isRecommendedFor(b, userTypeKey, userSleepTypeKey);
        if (aRec !== bRec) return aRec ? -1 : 1;
        return 0;
    });
}

// ---------- Section grouping ----------------------------------------------
// TemplateExplorer renders templates grouped into three sections:
//   - flower  : the 4 daisy/rose/orchid/sunflower 14-day mini courses
//   - sleep   : the 4 stress/rhythm/metabolic/hormone 14-day sleep plans
//   - other   : everything else (generic public templates)
// Each section also carries display metadata + a 「問卷開發中」 hint key so
// the UI can show an info card when the user has not taken the quiz for
// that typing dimension.

const TEMPLATE_SECTIONS = [
    {
        id: 'flower',
        label: '花朵型小課程',
        description: '依女性週期身體狀態分型，14 天分階段任務，跟著週期長出新習慣。',
        quizPendingCopy: '花朵分型問卷功能開發中 — 目前可以先瀏覽全部，完成後會自動為你推薦最適合的花朵。',
    },
    {
        id: 'sleep',
        label: '睡眠處方',
        description: '依睡眠卡點分型（壓力 / 節律 / 代謝失衡 / 荷爾蒙），14 天 4 階段處方。',
        quizPendingCopy: '睡眠分型問卷功能開發中 — 目前可以先瀏覽全部，完成後會自動為你推薦最適合的處方。',
    },
    {
        id: 'other',
        label: '其他公開計畫',
        description: null,
        quizPendingCopy: null,
    },
];

function sectionIdFor(template) {
    if (!template || !template.category) return 'other';
    if (FLOWER_TYPES.has(template.category)) return 'flower';
    if (SLEEP_CATEGORIES.has(template.category)) return 'sleep';
    return 'other';
}

/**
 * Group + sort templates for the explorer.
 * Returns `{ flower: Template[], sleep: Template[], other: Template[] }`,
 * with each list sorted so recommended templates float to the top.
 */
function groupTemplatesBySection(templates, userTypeKey, userSleepTypeKey) {
    const grouped = { flower: [], sleep: [], other: [] };
    for (const t of templates) {
        grouped[sectionIdFor(t)].push(t);
    }
    for (const id of Object.keys(grouped)) {
        grouped[id] = sortByRecommendation(grouped[id], userTypeKey, userSleepTypeKey);
    }
    return grouped;
}

module.exports = {
    FLOWER_TYPES,
    SLEEP_CATEGORIES,
    isRecommendedFor,
    sortByRecommendation,
    TEMPLATE_SECTIONS,
    sectionIdFor,
    groupTemplatesBySection,
};
