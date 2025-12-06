import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request, { params }) {
    const { id } = params;

    try {
        // Delete tasks associated with this assignment first
        await prisma.task.deleteMany({
            where: { assignmentId: id }
        });

        // Delete the assignment
        await prisma.assignment.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete assignment error:', error);
        return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }
}
