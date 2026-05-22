import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: Update a plan category.
// System rows (isSystem=true) are slug-locked by lib/typeKeys.js + lib/sleepTypeKeys.js
// so name/slug stay enum-consistent; only color/icon/order can be changed.
export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { name, color, icon, order } = body;

        const existing = await prisma.planCategory.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ error: '分類不存在' }, { status: 404 });
        }

        const data = {};
        if (color !== undefined) data.color = color;
        if (icon !== undefined) data.icon = icon;
        if (order !== undefined) data.order = order;

        // Name edits only allowed on non-system rows
        if (name && !existing.isSystem) {
            data.name = name.trim();
        } else if (name && existing.isSystem && name.trim() !== existing.name) {
            return NextResponse.json({ error: '系統分類不可重新命名（會破壞與程式碼的對應）' }, { status: 403 });
        }

        const category = await prisma.planCategory.update({ where: { id: params.id }, data });
        return NextResponse.json(category);
    } catch (error) {
        console.error('Update plan category error:', error);
        return NextResponse.json({ error: '更新分類失敗' }, { status: 500 });
    }
}

// DELETE: Delete a plan category.
// System rows are protected — removing them would silently break Template.category lookups.
export async function DELETE(request, { params }) {
    try {
        const existing = await prisma.planCategory.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ error: '分類不存在' }, { status: 404 });
        }
        if (existing.isSystem) {
            return NextResponse.json({ error: '系統分類不可刪除' }, { status: 403 });
        }

        await prisma.planCategory.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete plan category error:', error);
        return NextResponse.json({ error: '刪除分類失敗' }, { status: 500 });
    }
}
