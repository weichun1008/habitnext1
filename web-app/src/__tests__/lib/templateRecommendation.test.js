// Unit tests for templateRecommendation — covers the bug fix where
// TemplateExplorer hid all flower / sleep templates when the user had not
// taken the quiz.

const {
    isRecommendedFor,
    sortByRecommendation,
    TEMPLATE_SECTIONS,
    sectionIdFor,
    groupTemplatesBySection,
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

describe('TEMPLATE_SECTIONS', () => {
    test('has flower, sleep, other in that order', () => {
        expect(TEMPLATE_SECTIONS.map(s => s.id)).toEqual(['flower', 'sleep', 'other']);
    });

    test('flower + sleep sections have quizPendingCopy; other does not', () => {
        const flower = TEMPLATE_SECTIONS.find(s => s.id === 'flower');
        const sleep = TEMPLATE_SECTIONS.find(s => s.id === 'sleep');
        const otherSection = TEMPLATE_SECTIONS.find(s => s.id === 'other');
        expect(flower.quizPendingCopy).toBeTruthy();
        expect(sleep.quizPendingCopy).toBeTruthy();
        expect(otherSection.quizPendingCopy).toBeNull();
    });
});

describe('sectionIdFor', () => {
    test('maps flower categories to "flower"', () => {
        ['daisy', 'rose', 'orchid', 'sunflower'].forEach(c => {
            expect(sectionIdFor({ category: c })).toBe('flower');
        });
    });

    test('maps sleep_ categories to "sleep"', () => {
        ['sleep_stress', 'sleep_rhythm', 'sleep_metabolic', 'sleep_hormone'].forEach(c => {
            expect(sectionIdFor({ category: c })).toBe('sleep');
        });
    });

    test('maps anything else to "other"', () => {
        expect(sectionIdFor({ category: 'health' })).toBe('other');
        expect(sectionIdFor({ category: 'fitness' })).toBe('other');
        expect(sectionIdFor({ category: null })).toBe('other');
        expect(sectionIdFor(null)).toBe('other');
    });
});

describe('groupTemplatesBySection', () => {
    test('partitions templates into 3 buckets', () => {
        const templates = [
            flower('daisy'), flower('rose'),
            sleep('sleep_stress'),
            other('g1', 'health'), other('g2', 'fitness'),
        ];
        const grouped = groupTemplatesBySection(templates, null, null);
        expect(grouped.flower).toHaveLength(2);
        expect(grouped.sleep).toHaveLength(1);
        expect(grouped.other).toHaveLength(2);
    });

    test('recommendation floats to top WITHIN its own section, others untouched', () => {
        const templates = [
            flower('daisy'), flower('rose'), flower('orchid'), flower('sunflower'),
            sleep('sleep_stress'), sleep('sleep_rhythm'),
            other('g', 'health'),
        ];
        const grouped = groupTemplatesBySection(templates, 'orchid', 'rhythm');
        expect(grouped.flower[0].id).toBe('orchid');
        expect(grouped.sleep[0].id).toBe('sleep_rhythm');
        expect(grouped.other.map(t => t.id)).toEqual(['g']);
    });

    test('empty input returns three empty buckets', () => {
        const grouped = groupTemplatesBySection([], null, null);
        expect(grouped).toEqual({ flower: [], sleep: [], other: [] });
    });

    test('all-flower input leaves sleep + other empty', () => {
        const templates = [flower('daisy'), flower('rose')];
        const grouped = groupTemplatesBySection(templates, null, null);
        expect(grouped.flower).toHaveLength(2);
        expect(grouped.sleep).toEqual([]);
        expect(grouped.other).toEqual([]);
    });
});
