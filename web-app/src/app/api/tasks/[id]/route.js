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
                cue: taskData.cue?.trim() || null,
                type: taskData.type,
                category: taskData.category,
                frequency: taskData.frequency,
                recurrence: taskData.recurrence,
                reminder: taskData.reminder,
                subtasks: taskData.subtasks,
                dailyTarget: taskData.dailyTarget,
                unit: taskData.unit,
                stepValue: taskData.stepValue,
                // Slice U — persist reverse-habit direction. Only write when the
                // payload carries it so progress-only PUTs (historyUpdate) don't
                // clobber an existing direction with undefined→null.
                ...(taskData.direction !== undefined ? { direction: taskData.direction } : {}),
                date: taskData.date,
                time: taskData.time,
                // Slice M — accept status transitions to paused/archived from
                // TaskCard action menu + TaskDetailModal footer. Validates the
                // enum so a stray value can't poison the daily view filter.
                ...(taskData.status !== undefined && ['candidate', 'active', 'paused', 'archived'].includes(taskData.status)
                    ? { status: taskData.status }
                    : {}),
            }
        });

        // 2. Handle History Update (if provided)
        // historyUpdate format: { date: '2023-01-01', completed: true, value: 10 }
        if (historyUpdate) {
            const { date, completed, value, subtaskCompletions, lat, lng, city, photoUrl, memoNote, world } = historyUpdate;

            // Slice O — only write location fields when provided. A normal
            // completion without location (feature off / denied) leaves any
            // existing coords untouched.
            const locWrite = {};
            if (lat !== undefined) locWrite.lat = lat;
            if (lng !== undefined) locWrite.lng = lng;
            if (city !== undefined) locWrite.city = city;

            // Slice Q — mirror locWrite for photo/memo. Omitting these fields
            // leaves any existing values untouched; passing null explicitly
            // clears them (intended "remove photo" path).
            const memWrite = {};
            if (photoUrl !== undefined) memWrite.photoUrl = photoUrl;
            if (memoNote !== undefined) memWrite.memoNote = memoNote;

            // World Switch — stamp the active world at completion time. Mirror
            // locWrite/memWrite: only write when provided. world may be null
            // (user hasn't picked a world yet) → that's the shared prologue,
            // a valid value, so we still write it through.
            const worldWrite = {};
            if (world !== undefined) worldWrite.world = world;

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
                    value,
                    subtaskCompletions: subtaskCompletions ?? null,
                    ...locWrite,
                    ...memWrite,
                    ...worldWrite
                },
                create: {
                    taskId: id,
                    date,
                    completed,
                    value,
                    subtaskCompletions: subtaskCompletions ?? null,
                    ...locWrite,
                    ...memWrite,
                    ...worldWrite
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
