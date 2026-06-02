/**
 * @jest-environment node
 *
 * Tests for /api/stats — Slice I
 * Mocks @/lib/prisma and calls the handler directly.
 */

jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: {
        taskHistory: { findMany: jest.fn() },
        task: { findMany: jest.fn() },
        habitCategory: { findMany: jest.fn() },
    },
}));

const prisma = require('@/lib/prisma').default;
const { GET } = require('@/app/api/stats/route');

function makeReq(qs) {
    return { url: `http://localhost/api/stats?${qs}` };
}

describe('GET /api/stats', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns 400 when userId is missing', async () => {
        const res = await GET(makeReq('today=2026-05-21'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/userId/);
    });

    test('returns 400 when today is missing', async () => {
        const res = await GET(makeReq('userId=u1'));
        expect(res.status).toBe(400);
    });

    test('returns 400 when today is not YYYY-MM-DD', async () => {
        const res = await GET(makeReq('userId=u1&today=05/21/2026'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/YYYY-MM-DD/);
    });

    test('happy path: returns spec-shaped bundle with 84-entry heatmap', async () => {
        prisma.taskHistory.findMany.mockResolvedValue([
            { taskId: 'A', date: '2026-05-21', completed: true },
            { taskId: 'A', date: '2026-05-20', completed: true },
        ]);
        prisma.task.findMany.mockResolvedValue([
            { id: 'A', title: 'Drink water', category: '飲食' },
        ]);
        prisma.habitCategory.findMany.mockResolvedValue([
            { name: '飲食', color: '#0ea5e9', icon: 'Apple', order: 4 },
        ]);

        const res = await GET(makeReq('userId=u1&today=2026-05-21'));
        expect(res.status).toBe(200);
        const body = await res.json();

        // Shape contract per spec §5.3
        expect(body).toHaveProperty('overall.currentStreak');
        expect(body).toHaveProperty('overall.longestStreak');
        expect(body).toHaveProperty('overall.todayCompleted');
        expect(body).toHaveProperty('completionRate.last7');
        expect(body).toHaveProperty('completionRate.last30');
        expect(Array.isArray(body.domainBreakdown)).toBe(true);
        expect(Array.isArray(body.heatmap)).toBe(true);
        expect(Array.isArray(body.topTaskStreaks)).toBe(true);

        // Concrete values from our mocks
        expect(body.heatmap).toHaveLength(84);
        expect(body.overall.currentStreak).toBe(2);
        expect(body.overall.todayCompleted).toBe(true);
        expect(body.topTaskStreaks).toHaveLength(1);
        expect(body.topTaskStreaks[0].taskId).toBe('A');
        // identity removed from the streak payload 2026-06-03 (moved to Aspiration)
        expect(body.topTaskStreaks[0].identity).toBeUndefined();
    });

    test('queries DB scoped to userId with HEATMAP_DAYS cutoff', async () => {
        prisma.taskHistory.findMany.mockResolvedValue([]);
        prisma.task.findMany.mockResolvedValue([]);
        prisma.habitCategory.findMany.mockResolvedValue([]);

        await GET(makeReq('userId=u1&today=2026-05-21'));

        // history filtered by user and 84-day window
        const histCall = prisma.taskHistory.findMany.mock.calls[0][0];
        expect(histCall.where.task.userId).toBe('u1');
        expect(histCall.where.date.gte).toBe('2026-02-27');  // today - 83

        // tasks filtered by user
        const taskCall = prisma.task.findMany.mock.calls[0][0];
        expect(taskCall.where.userId).toBe('u1');
    });

    test('returns 500 when Prisma throws', async () => {
        prisma.taskHistory.findMany.mockRejectedValue(new Error('db down'));
        prisma.task.findMany.mockResolvedValue([]);
        prisma.habitCategory.findMany.mockResolvedValue([]);

        // Silence the console.error from the handler
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const res = await GET(makeReq('userId=u1&today=2026-05-21'));
        expect(res.status).toBe(500);

        spy.mockRestore();
    });
});
