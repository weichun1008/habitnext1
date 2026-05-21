/**
 * Tests for the DOMAIN_TO_ICON_KEY map + domainToIconKey() helper.
 * Added as part of the OfficialHabit.icon emoji → Lucide migration.
 */

const { DOMAIN_TO_ICON_KEY, domainToIconKey, CATEGORY_CONFIG } = require('@/lib/constants');

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
