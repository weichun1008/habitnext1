// Unit tests for templateRecommendation — covers the bug fix where
// TemplateExplorer hid all flower / sleep templates when the user had not
// taken the quiz.

const {
    isRecommendedFor,
    sortByRecommendation,
} = require('../../lib/templateRecommendation');

const flower = (cat) => ({ id: cat, name: `${cat} plan`, category: cat });
const sleep = (cat) => ({ id: cat, name: `${cat} plan`, category: cat });
const other = (id, cat = 'general') => ({ id, name: `${id} plan`, category: cat });

describe('isRecommendedFor', () => {
    test('returns false for null / missing template or category', () => {
        expect(isRecommendedFor(null, 'daisy', null)).toBe(false);
        expect(isRecommendedFor({}, 'daisy', null)).toBe(false);
    });

    test('flower template is recommended only when userTypeKey matches exactly', () => {
        expect(isRecommendedFor(flower('daisy'), 'daisy', null)).toBe(true);
        expect(isRecommendedFor(flower('daisy'), 'rose', null)).toBe(false);
        expect(isRecommendedFor(flower('daisy'), null, null)).toBe(false);
    });

    test('sleep template is recommended only when sleepTypeKey matches (with prefix)', () => {
        expect(isRecommendedFor(sleep('sleep_stress'), null, 'stress')).toBe(true);
        expect(isRecommendedFor(sleep('sleep_stress'), null, 'rhythm')).toBe(false);
        expect(isRecommendedFor(sleep('sleep_stress'), null, null)).toBe(false);
    });

    test('non-typed templates are never recommended', () => {
        expect(isRecommendedFor(other('a', 'health'), 'daisy', 'stress')).toBe(false);
        expect(isRecommendedFor(other('a', 'mental'), null, null)).toBe(false);
    });
});

describe('sortByRecommendation', () => {
    test('does not hide ANY templates when no typeKey is set (the bug fix)', () => {
        const templates = [
            flower('daisy'), flower('rose'), flower('orchid'), flower('sunflower'),
            sleep('sleep_stress'), sleep('sleep_rhythm'), sleep('sleep_metabolic'), sleep('sleep_hormone'),
            other('generic'),
        ];
        const result = sortByRecommendation(templates, null, null);
        expect(result).toHaveLength(templates.length);
        // Order preserved when nothing is recommended
        expect(result.map(t => t.id)).toEqual(templates.map(t => t.id));
    });

    test('floats the recommended flower template to the top, keeps the rest', () => {
        const templates = [
            flower('daisy'), flower('rose'), sleep('sleep_stress'), other('g'),
        ];
        const result = sortByRecommendation(templates, 'rose', null);
        expect(result[0].id).toBe('rose');
        // Non-recommended preserved
        expect(result.slice(1).map(t => t.id)).toEqual(['daisy', 'sleep_stress', 'g']);
    });

    test('floats both flower and sleep recommendations to the top when both quizzes taken', () => {
        const templates = [
            other('g'), flower('daisy'), flower('rose'),
            sleep('sleep_stress'), sleep('sleep_rhythm'),
        ];
        const result = sortByRecommendation(templates, 'daisy', 'rhythm');
        const topTwoIds = result.slice(0, 2).map(t => t.id).sort();
        expect(topTwoIds).toEqual(['daisy', 'sleep_rhythm']);
        // 'g' / 'rose' / 'sleep_stress' remain visible
        expect(result.length).toBe(5);
    });

    test('does not mutate the input array', () => {
        const templates = [flower('daisy'), flower('rose')];
        const before = templates.map(t => t.id);
        sortByRecommendation(templates, 'rose', null);
        expect(templates.map(t => t.id)).toEqual(before);
    });
});
