import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const { name, isActive } = await request.json();

        const title = await prisma.expertTitle.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(typeof isActive === 'boolean' && { isActive })
            }
        });
        return NextResponse.json(title);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update title' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        // Check if used
        const usedCount = await prisma.expert.count({ where: { titleId: id } });
        if (usedCount > 0) {
            return NextResponse.json({ error: 'Cannot delete title assigned to experts. Archive it instead.' }, { status: 400 });
        }

        await prisma.expertTitle.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete title' }, { status: 500 });
    }
}
