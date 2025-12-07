import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: Update a plan category
export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { name, color, icon, order } = body;

        const category = await prisma.planCategory.update({
            where: { id: params.id },
            data: {
                ...(name && { name: name.trim() }),
                ...(color !== undefined && { color }),
                ...(icon !== undefined && { icon }),
                ...(order !== undefined && { order })
            }
        });
        return NextResponse.json(category);
    } catch (error) {
        console.error('Update plan category error:', error);
        return NextResponse.json({ error: '更新分類失敗' }, { status: 500 });
    }
}

// DELETE: Delete a plan category
export async function DELETE(request, { params }) {
    try {
        await prisma.planCategory.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete plan category error:', error);
        return NextResponse.json({ error: '刪除分類失敗' }, { status: 500 });
    }
}
