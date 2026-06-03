const { WORLDS, WORLD_KEYS, getWorld, isValidWorld } = require('@/lib/worlds');

describe('worlds registry', () => {
    test('WORLDS has 3 entries, each with the required fields', () => {
        expect(WORLDS).toHaveLength(3);
        for (const w of WORLDS) {
            expect(typeof w.key).toBe('string');
            expect(typeof w.name).toBe('string');
            expect(typeof w.tagline).toBe('string');
            expect(typeof w.icon).toBe('string');
            expect(typeof w.accent).toBe('string');
            expect(['available', 'soon']).toContain(w.status);
        }
    });

    test('journey is available; home and figure are soon', () => {
        expect(getWorld('journey').status).toBe('available');
        expect(getWorld('home').status).toBe('soon');
        expect(getWorld('figure').status).toBe('soon');
    });

    test('WORLD_KEYS lists the three keys', () => {
        expect(WORLD_KEYS).toEqual(['journey', 'home', 'figure']);
    });

    test('getWorld returns the matching world', () => {
        expect(getWorld('journey').name).toBe('旅程');
    });

    test('getWorld returns null for an unknown key', () => {
        expect(getWorld('x')).toBeNull();
    });

    test('isValidWorld accepts known keys and rejects others', () => {
        expect(isValidWorld('journey')).toBe(true);
        expect(isValidWorld('home')).toBe(true);
        expect(isValidWorld('figure')).toBe(true);
        expect(isValidWorld('x')).toBe(false);
        expect(isValidWorld(null)).toBe(false);
    });
});
