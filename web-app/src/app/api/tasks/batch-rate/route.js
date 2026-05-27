import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH /api/tasks/batch-rate
// body: { ratings: [{ taskId, userImpact, userAbility, action: 'activate' | 'keep_candidate' | 'archive' }] }
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

        await prisma.$transaction(
            ratings.map(r => {
                let status;
                if (r.action === 'activate') status = 'active';
                else if (r.action === 'archive') status = 'archived';
                else status = 'candidate';
                counts[r.action] = (counts[r.action] || 0) + 1;

                return prisma.task.update({
                    where: { id: r.taskId },
                    data: {
                        status,
                        userImpact: typeof r.userImpact === 'number' ? r.userImpact : null,
                        userAbility: typeof r.userAbility === 'number' ? r.userAbility : null,
                        ratedAt: now,
                    },
                });
            })
        );

        return NextResponse.json({ ok: true, counts });
    } catch (error) {
        console.error('Batch rate error:', error);
        return NextResponse.json({ error: '批次評分失敗' }, { status: 500 });
    }
}
