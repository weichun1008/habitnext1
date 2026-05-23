/**
 * Tests for the DOMAIN_TO_ICON_KEY map + domainToIconKey() helper.
 * Added as part of the OfficialHabit.icon emoji → Lucide migration.
 */

const { DOMAIN_TO_ICON_KEY, domainToIconKey, CATEGORY_CONFIG, resolveIconKey } = require('@/lib/constants');

describe('DOMAIN_TO_ICON_KEY', () => {
    test('covers all 9 GENESIS+IO domains', () => {
        const expectedDomains = [
            '基因與腸道', '環境', '飲食', '運動',
            '壓力與睡眠', '社交互動', '心靈', '認知與智慧',
            '職涯與平衡',
        ];
        expectedDomains.forEach(d => {
            expect(DOMAIN_TO_ICON_KEY).toHaveProperty(d);
        });
    });

    test('every mapped key exists in CATEGORY_CONFIG', () => {
        for (const [domain, key] of Object.entries(DOMAIN_TO_ICON_KEY)) {
            expect(CATEGORY_CONFIG).toHaveProperty(key);
        }
    });
});

describe('domainToIconKey', () => {
    test('returns the mapped key for known domains', () => {
        expect(domainToIconKey('飲食')).toBe('apple');
        expect(domainToIconKey('運動')).toBe('dumbbell');
        expect(domainToIconKey('壓力與睡眠')).toBe('moon');
        expect(domainToIconKey('社交互動')).toBe('users');
        expect(domainToIconKey('職涯與平衡')).toBe('briefcase');
    });

    test('falls back to "star" for unknown / null / undefined', () => {
        expect(domainToIconKey('某個未來新增的 domain')).toBe('star');
        expect(domainToIconKey(null)).toBe('star');
        expect(domainToIconKey(undefined)).toBe('star');
        expect(domainToIconKey('')).toBe('star');
    });
});

describe('CATEGORY_CONFIG (PR D Material Symbols migration)', () => {
    test('every entry is type "material" with a valid name + color + bg', () => {
        for (const [key, cfg] of Object.entries(CATEGORY_CONFIG)) {
            expect(cfg.type).toBe('material');
            expect(typeof cfg.name).toBe('string');
            expect(cfg.name.length).toBeGreaterThan(0);
            expect(typeof cfg.color).toBe('string');
            expect(cfg.color).toMatch(/^text-/);
            expect(typeof cfg.bg).toBe('string');
            expect(cfg.bg).toMatch(/^bg-/);
        }
    });

    test('no entry retains the legacy "value: SVGComponent" shape', () => {
        for (const cfg of Object.values(CATEGORY_CONFIG)) {
            expect(cfg.value).toBeUndefined();
        }
    });
});

// resolveIconKey is the single source of truth for "give me the
// CATEGORY_CONFIG key for this value" — added after MS migration to fix the
// silent fallback where TaskCard / TaskDetailModal / MonthView /
// CalendarTaskChip looked up CATEGORY_CONFIG[task.category] directly and got
// undefined for every template-derived task (whose category is a domain name).
describe('resolveIconKey', () => {
    test('passes through a direct CATEGORY_CONFIG key', () => {
        expect(resolveIconKey('apple')).toBe('apple');
        expect(resolveIconKey('moon')).toBe('moon');
        expect(resolveIconKey('star')).toBe('star');
    });

    test('translates a HabitCategory domain name to its config key', () => {
        expect(resolveIconKey('飲食')).toBe('apple');
        expect(resolveIconKey('運動')).toBe('dumbbell');
        expect(resolveIconKey('壓力與睡眠')).toBe('moon');
    });

    test('falls back to "star" for unknown / null / undefined', () => {
        expect(resolveIconKey(null)).toBe('star');
        expect(resolveIconKey(undefined)).toBe('star');
        expect(resolveIconKey('')).toBe('star');
        expect(resolveIconKey('a domain that will never exist')).toBe('star');
    });

    test('every result is a valid CATEGORY_CONFIG key', () => {
        const samples = [
            'apple', '飲食', null, undefined, 'unknown', '基因與腸道', 'star',
        ];
        samples.forEach(s => {
            expect(CATEGORY_CONFIG).toHaveProperty(resolveIconKey(s));
        });
    });
});
