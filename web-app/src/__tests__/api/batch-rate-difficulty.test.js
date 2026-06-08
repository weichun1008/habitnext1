/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn((arr) => Promise.resolve(arr)),
    task: {
      update: jest.fn((args) => args),
      findMany: jest.fn(() => Promise.resolve([
        { id: 't1', officialHabitId: 'h1', officialHabit: { difficulties: {
          beginner: { enabled: true, type: 'binary', dailyTarget: 1, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily' } },
          intermediate: { enabled: true, type: 'quantitative', dailyTarget: 3, unit: '杯', stepValue: 1, subtasks: [], recurrence: { type: 'daily' } },
        } } },
      ])),
    },
  },
}));

import prisma from '@/lib/prisma';
import { PATCH } from '../../app/api/tasks/batch-rate/route';

const req = (body) => ({ json: () => Promise.resolve(body) });

describe('batch-rate applies difficulty on activate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('activate with ability 4 sets intermediate config', async () => {
    await PATCH(req({ ratings: [{ taskId: 't1', userImpact: 5, userAbility: 4, action: 'activate', targetDays: 66 }] }));
    const data = prisma.task.update.mock.calls[0][0].data;
    expect(data.status).toBe('active');
    expect(data.dailyTarget).toBe(3);
    expect(data.unit).toBe('杯');
    expect(data.type).toBe('quantitative');
  });

  it('keep_candidate does not touch config fields', async () => {
    await PATCH(req({ ratings: [{ taskId: 't9', userImpact: 2, userAbility: 2, action: 'keep_candidate' }] }));
    const data = prisma.task.update.mock.calls[0][0].data;
    expect('dailyTarget' in data).toBe(false);
    expect(data.status).toBe('candidate');
  });
});
