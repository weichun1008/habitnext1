import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT update category
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, color, order } = body;

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (color !== undefined) updateData.color = color;
        if (order !== undefined) updateData.order = order;

        const category = await prisma.habitCategory.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error('Update category error:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: '此分類名稱已存在' }, { status: 400 });
        }
        return NextResponse.json({ error: '更新失敗' }, { status: 500 });
    }
}

// DELETE category
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        await prisma.habitCategory.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete category error:', error);
        return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
    }
}
