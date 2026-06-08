/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { $transaction: jest.fn(() => Promise.resolve([])), task: { update: jest.fn((args) => args), findMany: jest.fn(() => Promise.resolve([])) } },
}));

const prisma = require('@/lib/prisma').default;
const { PATCH } = require('../../app/api/tasks/batch-rate/route');

function req(body) { return { json: () => Promise.resolve(body) }; }

describe('PATCH /api/tasks/batch-rate', () => {
  beforeEach(() => jest.clearAllMocks());

  test('activate 寫入 targetDays、status=active', async () => {
    await PATCH(req({ ratings: [{ taskId: 't1', userImpact: 5, userAbility: 5, action: 'activate', targetDays: 66 }] }));
    const updateArg = prisma.task.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 't1' });
    expect(updateArg.data.status).toBe('active');
    expect(updateArg.data.targetDays).toBe(66);
  });

  test('activate 且 targetDays=null（不設限）寫入 null', async () => {
    await PATCH(req({ ratings: [{ taskId: 't1', userImpact: 5, userAbility: 5, action: 'activate', targetDays: null }] }));
    expect(prisma.task.update.mock.calls[0][0].data.targetDays).toBeNull();
  });

  test('keep_candidate 不寫 targetDays（status=candidate）', async () => {
    await PATCH(req({ ratings: [{ taskId: 't2', userImpact: 2, userAbility: 2, action: 'keep_candidate' }] }));
    const data = prisma.task.update.mock.calls[0][0].data;
    expect(data.status).toBe('candidate');
    expect('targetDays' in data).toBe(false);
  });

  test('ratings 空陣列回 400', async () => {
    const res = await PATCH(req({ ratings: [] }));
    expect(res.status).toBe(400);
  });
});
