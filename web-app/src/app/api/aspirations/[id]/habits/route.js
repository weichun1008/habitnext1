import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/aspirations/:id/habits
// body: { taskId }
// Called after committing a task or template join — registers the link.
// Idempotent at the DB level via the @@unique([aspirationId, taskId]) constraint;
// duplicate POST returns the existing row.
export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { taskId } = body;

        if (!taskId) {
            return NextResponse.json({ error: 'taskId required' }, { status: 400 });
        }

        // Try create; if duplicate, return the existing row.
        try {
            const created = await prisma.aspirationHabit.create({
                data: {
                    aspirationId: params.id,
                    taskId,
                },
            });
            return NextResponse.json(created);
        } catch (e) {
            if (e?.code === 'P2002') {
                // Unique constraint violation — return existing row
                const existing = await prisma.aspirationHabit.findFirst({
                    where: { aspirationId: params.id, taskId },
                });
                return NextResponse.json(existing);
            }
            throw e;
        }
    } catch (error) {
        console.error('Create AspirationHabit error:', error);
        return NextResponse.json({ error: '寫入嚮往任務關聯失敗' }, { status: 500 });
    }
}
