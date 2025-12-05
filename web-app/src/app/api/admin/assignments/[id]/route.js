import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch single assignment with details
export async function GET(request, { params }) {
    try {
        const assignment = await prisma.assignment.findUnique({
            where: { id: params.id },
            include: {
                user: { select: { id: true, nickname: true, phone: true } },
                template: { select: { id: true, name: true, category: true, tasks: true } },
                expert: { select: { id: true, name: true, title: true } }
            }
        });

        if (!assignment) {
            return NextResponse.json({ error: '指派記錄不存在' }, { status: 404 });
        }

        // Also fetch the tasks created for this assignment
        const tasks = await prisma.task.findMany({
            where: { assignmentId: params.id },
            include: { history: true }
        });

        return NextResponse.json({ ...assignment, tasks });

    } catch (error) {
        console.error('Fetch assignment error:', error);
        return NextResponse.json({ error: `取得指派記錄失敗: ${error.message}` }, { status: 500 });
    }
}

// PUT: Update assignment status or notes
export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { status, notes, endDate } = body;

        const assignment = await prisma.assignment.update({
            where: { id: params.id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null })
            }
        });

        return NextResponse.json(assignment);

    } catch (error) {
        console.error('Update assignment error:', error);
        return NextResponse.json({ error: `更新指派記錄失敗: ${error.message}` }, { status: 500 });
    }
}

// DELETE: Cancel assignment (optionally delete associated tasks)
export async function DELETE(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const deleteTasks = searchParams.get('deleteTasks') === 'true';

        if (deleteTasks) {
            // Delete all tasks associated with this assignment
            await prisma.task.deleteMany({
                where: { assignmentId: params.id }
            });
        } else {
            // Just unlock the tasks
            await prisma.task.updateMany({
                where: { assignmentId: params.id },
                data: { isLocked: false, assignmentId: null, expertName: null }
            });
        }

        await prisma.assignment.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete assignment error:', error);
        return NextResponse.json({ error: `取消指派失敗: ${error.message}` }, { status: 500 });
    }
}
