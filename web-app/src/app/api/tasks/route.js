import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const assignmentId = searchParams.get('assignmentId');
    // Slice L — daily view defaults to active only. Pass ?status=candidate
    // or ?status=all to see other statuses.
    const status = searchParams.get('status') || 'active';

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const where = { userId };
        if (assignmentId) where.assignmentId = assignmentId;
        if (status !== 'all') where.status = status;
        const tasks = await prisma.task.findMany({
            where,
            include: {
                history: true,
                // 2026-06-03 — carry the aspiration link(s) so the daily view
                // can group habits under their aspiration's identity header.
                // ordered by createdAt so the client can pick the earliest as
                // the task's "primary" aspiration deterministically.
                aspirationHabits: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        aspirationId: true,
                        aspiration: { select: { id: true, text: true, identity: true, domain: true, status: true } },
                    },
                },
                // Slice T — carry the backing official habit's fiveT so the
                // detail modal can surface its physical tools (toolPhysical).
                // name/description/translations 供前端把「未改名的任務快照」顯示成
                // 使用者語言（lib/i18n/dataLabels.js localizedTaskField）。
                officialHabit: { select: { fiveT: true, name: true, description: true, difficulties: true, translations: true } },
            },
            orderBy: { createdAt: 'asc' }
        });
        return NextResponse.json(tasks);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

// POST: Create a new task
export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, ...taskData } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Slice L — validate status; default candidate if missing/invalid
        const status = ['candidate', 'active', 'archived'].includes(taskData.status) ? taskData.status : 'candidate';
        const task = await prisma.task.create({
            data: {
                userId,
                title: taskData.title,
                details: taskData.details,
                cue: taskData.cue?.trim() || null,
                type: taskData.type,
                category: taskData.category,
                frequency: taskData.frequency,
                recurrence: taskData.recurrence || {},
                reminder: taskData.reminder || {},
                subtasks: taskData.subtasks || [],
                dailyTarget: taskData.dailyTarget,
                unit: taskData.unit,
                stepValue: taskData.stepValue,
                // Slice U — reverse-habit direction. null/'increase' = 正向；
                // 'decrease' = 減量/戒除（dailyTarget 當每日上限，0 = 戒除）。
                direction: taskData.direction ?? null,
                toolType: taskData.toolType ?? null,
                toolConfig: taskData.toolConfig ?? null,
                date: taskData.date,
                time: taskData.time,
                status,
                officialHabitId: taskData.officialHabitId ?? null,
            },
            include: { history: true }
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error('Create task error:', error);
        // Return detailed error for debugging
        return NextResponse.json({ error: `Failed to create task: ${error.message}` }, { status: 500 });
    }
}
