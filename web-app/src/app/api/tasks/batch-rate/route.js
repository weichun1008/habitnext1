import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveDifficulty } from '@/lib/difficulty';

// PATCH /api/tasks/batch-rate
// body: { ratings: [{ taskId, userImpact, userAbility, action, targetDays? }] }
//   action: 'activate' | 'keep_candidate' | 'archive'；targetDays 僅 activate 採用，null=不設限
// Updates each task in one transaction. Idempotent — calling again with the
// same payload produces the same state.
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { ratings } = body;

        if (!Array.isArray(ratings) || ratings.length === 0) {
            return NextResponse.json({ error: 'ratings array required' }, { status: 400 });
        }

        const now = new Date();
        const counts = { activate: 0, keep_candidate: 0, archive: 0 };

        // 取 activate 任務的 officialHabit.difficulties，供套用起始難度
        const activateIds = ratings.filter(r => r.action === 'activate').map(r => r.taskId);
        const habitByTaskId = new Map();
        if (activateIds.length > 0) {
            const rows = await prisma.task.findMany({
                where: { id: { in: activateIds } },
                select: { id: true, officialHabitId: true, officialHabit: { select: { difficulties: true } } },
            });
            for (const row of rows) habitByTaskId.set(row.id, row.officialHabit);
        }
        const abilityByTaskId = new Map(ratings.map(r => [r.taskId, r.userAbility]));

        await prisma.$transaction(
            ratings.map(r => {
                let status;
                if (r.action === 'activate') status = 'active';
                else if (r.action === 'archive') status = 'archived';
                else status = 'candidate';
                counts[r.action] = (counts[r.action] || 0) + 1;

                const data = {
                    status,
                    userImpact: typeof r.userImpact === 'number' ? r.userImpact : null,
                    userAbility: typeof r.userAbility === 'number' ? r.userAbility : null,
                    ratedAt: now,
                };
                if (r.action === 'activate' && 'targetDays' in r) {
                    data.targetDays = typeof r.targetDays === 'number' ? r.targetDays : null;
                }
                if (r.action === 'activate') {
                    const habit = habitByTaskId.get(r.taskId);
                    if (habit && habit.difficulties) {
                        const { config } = resolveDifficulty(habit, abilityByTaskId.get(r.taskId));
                        if (config && Object.keys(config).length > 0) {
                            if (config.type != null) data.type = config.type;
                            if (config.dailyTarget != null) data.dailyTarget = config.dailyTarget;
                            if (config.unit != null) data.unit = config.unit;
                            if (config.stepValue != null) data.stepValue = config.stepValue;
                            if (Array.isArray(config.subtasks)) data.subtasks = config.subtasks;
                            if (config.recurrence != null) {
                                data.recurrence = config.recurrence;
                                if (config.recurrence.type) data.frequency = config.recurrence.type;
                            }
                        }
                    }
                }

                return prisma.task.update({ where: { id: r.taskId }, data });
            })
        );

        return NextResponse.json({ ok: true, counts });
    } catch (error) {
        console.error('Batch rate error:', error);
        return NextResponse.json({ error: '批次評分失敗' }, { status: 500 });
    }
}
