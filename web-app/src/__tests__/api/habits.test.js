/**
 * @jest-environment node
 *
 * Tests for /api/habits — real handler tests (mocks @/lib/prisma).
 * Previously this file was placeholder assertions; rewritten as part of the
 * Slice I followup batch to match the pattern established in stats.test.js.
 */

jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: {
        habitCategory: { findMany: jest.fn() },
        officialHabit: { findMany: jest.fn() },
    },
}));

const prisma = require('@/lib/prisma').default;
const { GET } = require('@/app/api/habits/route');

function makeReq(qs = '') {
    return { url: `http://localhost/api/habits${qs ? '?' + qs : ''}` };
}

describe('GET /api/habits', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns active habits and categories in expected shape', async () => {
        prisma.habitCategory.findMany.mockResolvedValue([
            { id: 'cat-1', name: '飲食', color: '#0ea5e9', order: 1, icon: 'Apple' },
        ]);
        prisma.officialHabit.findMany.mockResolvedValue([
            {
                id: 'h-1',
                name: '每日喝水',
                category: '飲食',
                isActive: true,
                difficulties: { beginner: { enabled: true, dailyTarget: 2000 } },
                createdAt: new Date('2026-05-01T00:00:00Z'),
            },
        ]);

        const res = await GET(makeReq());
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body).toHaveProperty('habits');
        expect(body).toHaveProperty('categories');
        expect(body.habits).toHaveLength(1);
        expect(body.habits[0].name).toBe('每日喝水');
        expect(body.categories[0]).toMatchObject({ id: 'cat-1', name: '飲食', icon: 'Apple' });
    });

    test('filters habits by category when ?category= is provided', async () => {
        prisma.habitCategory.findMany.mockResolvedValue([]);
        prisma.officialHabit.findMany.mockResolvedValue([]);

        await GET(makeReq('category=%E9%81%8B%E5%8B%95'));

        expect(prisma.officialHabit.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { isActive: true, category: '運動' },
            })
        );
    });

    test('does not filter when category param is absent', async () => {
        prisma.habitCategory.findMany.mockResolvedValue([]);
        prisma.officialHabit.findMany.mockResolvedValue([]);

        await GET(makeReq());

        expect(prisma.officialHabit.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { isActive: true } })
        );
    });

    test('sorts habits by HabitCategory.order, then createdAt desc', async () => {
        prisma.habitCategory.findMany.mockResolvedValue([
            { id: 'c-mind', name: '心靈', color: '#a78bfa', order: 7, icon: 'Heart' },
            { id: 'c-food', name: '飲食', color: '#0ea5e9', order: 4, icon: 'Apple' },
        ]);
        prisma.officialHabit.findMany.mockResolvedValue([
            { id: 'h-mind-newer', name: '冥想 5 分鐘', category: '心靈', createdAt: new Date('2026-05-10') },
            { id: 'h-food-older', name: '早餐有蛋白質', category: '飲食', createdAt: new Date('2026-04-01') },
            { id: 'h-food-newer', name: '午餐前喝水', category: '飲食', createdAt: new Date('2026-05-15') },
        ]);

        const res = await GET(makeReq());
        const body = await res.json();

        // 飲食 (order=4) before 心靈 (order=7); within 飲食, newer createdAt first
        expect(body.habits.map(h => h.id)).toEqual(['h-food-newer', 'h-food-older', 'h-mind-newer']);
    });

    test('habits with unknown category fall to the end (999 sentinel)', async () => {
        prisma.habitCategory.findMany.mockResolvedValue([
            { id: 'c-1', name: '飲食', color: '#0ea5e9', order: 4, icon: 'Apple' },
        ]);
        prisma.officialHabit.findMany.mockResolvedValue([
            { id: 'orphan', name: 'Legacy habit', category: '不存在', createdAt: new Date('2026-05-15') },
            { id: 'known', name: '喝水', category: '飲食', createdAt: new Date('2026-05-01') },
        ]);

        const res = await GET(makeReq());
        const body = await res.json();
        expect(body.habits.map(h => h.id)).toEqual(['known', 'orphan']);
    });

    test('returns 500 when Prisma throws', async () => {
        prisma.habitCategory.findMany.mockRejectedValue(new Error('db down'));
        prisma.officialHabit.findMany.mockResolvedValue([]);

        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const res = await GET(makeReq());
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBeTruthy();
        spy.mockRestore();
    });
});
