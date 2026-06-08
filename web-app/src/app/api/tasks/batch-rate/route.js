import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
                // 僅 activate 設定養成期間（targetDays === null 代表不設限）
                if (r.action === 'activate' && 'targetDays' in r) {
                    data.targetDays = typeof r.targetDays === 'number' ? r.targetDays : null;
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
