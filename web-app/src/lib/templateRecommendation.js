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

module.exports = {
    FLOWER_TYPES,
    SLEEP_CATEGORIES,
    isRecommendedFor,
    sortByRecommendation,
};
