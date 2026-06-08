/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    template: {
      findUnique: jest.fn(() => Promise.resolve({ id: 't1', authorType: 'user', reviewStatus: 'pending' })),
      update: jest.fn((args) => Promise.resolve({ id: 't1', ...args.data })),
    },
  },
}));

import prisma from '@/lib/prisma';
import { PATCH } from '../../app/api/admin/plans/[id]/review/route';

const req = (body) => ({ json: () => Promise.resolve(body) });

describe('PATCH /api/admin/plans/[id]/review', () => {
  beforeEach(() => jest.clearAllMocks());

  it('approve sets reviewStatus approved', async () => {
    const res = await PATCH(req({ decision: 'approve' }), { params: { id: 't1' } });
    expect(res.status).toBe(200);
    expect(prisma.template.update.mock.calls[0][0].data.reviewStatus).toBe('approved');
  });

  it('reject sets reviewStatus rejected with reason', async () => {
    await PATCH(req({ decision: 'reject', reason: '內容不足' }), { params: { id: 't1' } });
    expect(prisma.template.update.mock.calls[0][0].data.reviewStatus).toBe('rejected');
  });

  it('400 on invalid decision', async () => {
    const res = await PATCH(req({ decision: 'maybe' }), { params: { id: 't1' } });
    expect(res.status).toBe(400);
  });

  it('409 when template is not pending', async () => {
    prisma.template.findUnique.mockResolvedValue({ id: 't1', authorType: 'user', reviewStatus: 'approved' });
    const res = await PATCH(req({ decision: 'approve' }), { params: { id: 't1' } });
    expect(res.status).toBe(409);
  });
});
