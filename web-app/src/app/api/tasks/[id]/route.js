import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT: Update a task (including history/progress)
export async function PUT(request, { params }) {
    const { id } = params;
    try {
        const body = await request.json();
        const { historyUpdate, ...taskData } = body;

        // 1. Update Task Details
        let updatedTask = await prisma.task.update({
            where: { id },
            data: {
                title: taskData.title,
                details: taskData.details,
                type: taskData.type,
                category: taskData.category,
                frequency: taskData.frequency,
                recurrence: taskData.recurrence,
                reminder: taskData.reminder,
                subtasks: taskData.subtasks,
                dailyTarget: taskData.dailyTarget,
                unit: taskData.unit,
                stepValue: taskData.stepValue,
                date: taskData.date,
                time: taskData.time,
            }
        });

        // 2. Handle History Update (if provided)
        // historyUpdate format: { date: '2023-01-01', completed: true, value: 10 }
        if (historyUpdate) {
            const { date, completed, value } = historyUpdate;

            // Upsert history record
            await prisma.taskHistory.upsert({
                where: {
                    taskId_date: {
                        taskId: id,
                        date: date
                    }
                },
                update: {
                    completed,
                    value
                },
                create: {
                    taskId: id,
                    date,
                    completed,
                    value
                }
            });
        }

        // Refetch with history
        const finalTask = await prisma.task.findUnique({
            where: { id },
            include: { history: true }
        });

        return NextResponse.json(finalTask);
    } catch (error) {
        console.error('Update task error:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

// DELETE: Delete a task
export async function DELETE(request, { params }) {
    const { id } = params;
    try {
        await prisma.task.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
