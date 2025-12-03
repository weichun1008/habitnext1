import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all tasks for a user (requires userId in query params for now, or header)
// In a real app, we'd use session/cookies. For this prototype, we'll pass userId header.
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const tasks = await prisma.task.findMany({
            where: { userId },
            include: { history: true },
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

        const task = await prisma.task.create({
            data: {
                userId,
                title: taskData.title,
                details: taskData.details,
                type: taskData.type,
                category: taskData.category,
                frequency: taskData.frequency,
                recurrence: taskData.recurrence || {},
                reminder: taskData.reminder || {},
                subtasks: taskData.subtasks || [],
                dailyTarget: taskData.dailyTarget,
                unit: taskData.unit,
                stepValue: taskData.stepValue,
                date: taskData.date,
                time: taskData.time,
            },
            include: { history: true }
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error('Create task error:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
