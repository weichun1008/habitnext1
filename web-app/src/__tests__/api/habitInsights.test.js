/**
 * @jest-environment node
 *
 * Tests for Slice N insight routes:
 *   GET /api/habits/[habitId]/insights
 *   POST /api/admin/habits/[habitId]/insights
 *   PATCH/DELETE /api/admin/habits/insights/[id]
 *
 * AI draft route is exercised indirectly via habitInsightAI.test.js (pure
 * lib) — wiring the route + SDK stub is more setup than payoff for v1.
 */

// The library exports prisma BOTH as named and default — these routes use
// the named import, but other routes in the codebase use the default, so
// the mock provides both pointing at the same stub.
jest.mock('@/lib/prisma', () => {
    const stub = {
        habitInsight: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        officialHabit: {
            findUnique: jest.fn(),
        },
    };
    return { __esModule: true, prisma: stub, default: stub };
});

const prisma = require('@/lib/prisma').prisma;
const { GET } = require('@/app/api/habits/[habitId]/insights/route');
const { POST: CREATE } = require('@/app/api/admin/habits/[habitId]/insights/route');
const { PATCH, DELETE } = require('@/app/api/admin/habits/insights/[id]/route');

function makeReq(url = 'http://localhost/x', { method = 'GET', body } = {}) {
    return {
        url,
        method,
        json: async () => body ?? {},
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/habits/:habitId/insights', () => {
    test('defaults to published only', async () => {
        prisma.habitInsight.findMany.mockResolvedValue([{ id: 'i1', status: 'published' }]);
        const res = await GET(makeReq('http://localhost/api/habits/h1/insights'), { params: Promise.resolve({ habitId: 'h1' }) });
        expect(res.status).toBe(200);
        const arg = prisma.habitInsight.findMany.mock.calls[0][0];
        expect(arg.where).toEqual({ habitId: 'h1', status: 'published' });
        expect(arg.orderBy).toEqual([{ order: 'asc' }, { createdAt: 'desc' }]);
    });

    test('?status=all skips the status filter', async () => {
        prisma.habitInsight.findMany.mockResolvedValue([]);
        await GET(makeReq('http://localhost/api/habits/h1/insights?status=all'), { params: Promise.resolve({ habitId: 'h1' }) });
        const arg = prisma.habitInsight.findMany.mock.calls[0][0];
        expect(arg.where).toEqual({ habitId: 'h1' });
    });

    test('rejects missing habitId', async () => {
        const res = await GET(makeReq('http://localhost/api/habits//insights'), { params: Promise.resolve({ habitId: '' }) });
        expect(res.status).toBe(400);
    });
});

describe('POST /api/admin/habits/:habitId/insights', () => {
    test('creates with sanitized fields and validates required text', async () => {
        prisma.officialHabit.findUnique.mockResolvedValue({ id: 'h1', name: '戒糖' });
        prisma.habitInsight.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }));
        const req = makeReq('http://localhost/x', {
            method: 'POST',
            body: {
                title: '  糖加速老化  ',
                summary: 'sum',
                detail: 'det',
                takeaway: null,
                tags: ['  ok  ', '', null, '  good  '],
                sources: [{ url: 'u', label: 'l' }],
                status: 'bogus',
                aiGenerated: true,
                sourcePrompt: 'prompt',
            },
        });
        const res = await CREATE(req, { params: Promise.resolve({ habitId: 'h1' }) });
        expect(res.status).toBe(200);
        const created = await res.json();
        expect(created.title).toBe('糖加速老化');     // trimmed
        expect(created.tags).toEqual(['ok', 'good']);  // null + empty filtered
        expect(created.status).toBe('draft');          // invalid → default
        expect(created.takeaway).toBeNull();
        expect(created.aiGenerated).toBe(true);
        expect(created.sourcePrompt).toBe('prompt');
    });

    test('rejects when title/summary/detail missing', async () => {
        const req = makeReq('http://localhost/x', { method: 'POST', body: { title: '', summary: 's', detail: 'd' } });
        const res = await CREATE(req, { params: Promise.resolve({ habitId: 'h1' }) });
        expect(res.status).toBe(400);
        expect(prisma.habitInsight.create).not.toHaveBeenCalled();
    });

    test('returns 404 when habit does not exist', async () => {
        prisma.officialHabit.findUnique.mockResolvedValue(null);
        const req = makeReq('http://localhost/x', { method: 'POST', body: { title: 't', summary: 's', detail: 'd' } });
        const res = await CREATE(req, { params: Promise.resolve({ habitId: 'missing' }) });
        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/admin/habits/insights/:id', () => {
    test('partial update — only specified fields are written', async () => {
        prisma.habitInsight.findUnique.mockResolvedValue({ id: 'i1' });
        prisma.habitInsight.update.mockImplementation(async ({ data }) => ({ id: 'i1', ...data }));
        const req = makeReq('http://localhost/x', {
            method: 'PATCH',
            body: { status: 'published', order: 3 },
        });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'i1' }) });
        expect(res.status).toBe(200);
        const arg = prisma.habitInsight.update.mock.calls[0][0];
        expect(arg.data).toEqual({ status: 'published', order: 3 });
    });

    test('rejects invalid status', async () => {
        prisma.habitInsight.findUnique.mockResolvedValue({ id: 'i1' });
        const req = makeReq('http://localhost/x', { method: 'PATCH', body: { status: 'wat' } });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'i1' }) });
        expect(res.status).toBe(400);
        expect(prisma.habitInsight.update).not.toHaveBeenCalled();
    });

    test('returns 404 when row missing', async () => {
        prisma.habitInsight.findUnique.mockResolvedValue(null);
        const req = makeReq('http://localhost/x', { method: 'PATCH', body: { status: 'published' } });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'gone' }) });
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/admin/habits/insights/:id', () => {
    test('hard-deletes when row exists', async () => {
        prisma.habitInsight.findUnique.mockResolvedValue({ id: 'i1' });
        prisma.habitInsight.delete.mockResolvedValue({ id: 'i1' });
        const req = makeReq('http://localhost/x', { method: 'DELETE' });
        const res = await DELETE(req, { params: Promise.resolve({ id: 'i1' }) });
        expect(res.status).toBe(200);
        expect(prisma.habitInsight.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
    });

    test('returns 404 when row missing', async () => {
        prisma.habitInsight.findUnique.mockResolvedValue(null);
        const req = makeReq('http://localhost/x', { method: 'DELETE' });
        const res = await DELETE(req, { params: Promise.resolve({ id: 'gone' }) });
        expect(res.status).toBe(404);
    });
});
