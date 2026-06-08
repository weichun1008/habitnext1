/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    aspiration: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(() => Promise.resolve({ id: 'u1', nickname: '小明' })) },
    template: { create: jest.fn((args) => Promise.resolve({ id: 'tpl1', ...args.data })) },
  },
}));

import prisma from '@/lib/prisma';
import { POST } from '../../app/api/plans/from-aspiration/route';

const req = (body) => ({ json: () => Promise.resolve(body) });

const aspiration = {
  id: 'asp1', userId: 'u1', identity: '我是重視睡眠的人', title: '睡得更好',
  habits: [
    { task: { id: 'a', title: '深蹲', category: 'fitness', status: 'active', userImpact: 5, userAbility: 3, targetDays: 66,
      officialHabit: { difficulties: { beginner: { enabled: true, type: 'binary', dailyTarget: 1, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily' } } } } } },
  ],
};

describe('POST /api/plans/from-aspiration', () => {
  beforeEach(() => { jest.clearAllMocks(); prisma.aspiration.findUnique.mockResolvedValue(aspiration); });

  it('creates a pending public user template', async () => {
    const res = await POST(req({ aspirationId: 'asp1', userId: 'u1', name: '我的睡眠計畫', description: 'd', visibility: 'public' }));
    expect(res.status).toBe(200);
    const data = prisma.template.create.mock.calls[0][0].data;
    expect(data.authorType).toBe('user');
    expect(data.authorUserId).toBe('u1');
    expect(data.authorName).toBe('小明');
    expect(data.reviewStatus).toBe('pending');
    expect(data.isPublic).toBe(true);
    expect(data.expertId).toBeNull();
    expect(data.tasks.version).toBe('2.0');
    expect(data.tasks.phases.length).toBeGreaterThanOrEqual(1);
  });

  it('private template is approved + not public', async () => {
    await POST(req({ aspirationId: 'asp1', userId: 'u1', name: 'x', visibility: 'private' }));
    const data = prisma.template.create.mock.calls[0][0].data;
    expect(data.reviewStatus).toBe('approved');
    expect(data.isPublic).toBe(false);
  });

  it('400 when aspiration has no active habits', async () => {
    prisma.aspiration.findUnique.mockResolvedValue({ ...aspiration, habits: [] });
    const res = await POST(req({ aspirationId: 'asp1', userId: 'u1', name: 'x', visibility: 'private' }));
    expect(res.status).toBe(400);
  });
});
