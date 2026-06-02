import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// /api/admin/habits/:habitId — habit CRUD.
//
// 2026-05-29: relocated from the sibling `[id]/` directory so we have only
// one dynamic-slug name at this level. Next.js 14 throws
// "You cannot use different slug names for the same dynamic path
// ('habitId' !== 'id')" if both `[id]/` and `[habitId]/` coexist, even
// when one is a leaf and the other has nested children (the `insights/`
// subdir under [habitId] is the one we keep). URLs are unchanged because
// the slug name is only the param-binding identifier; callers still hit
// `/api/admin/habits/<some-id>`.

export async function GET(request, { params }) {
    try {
        const { habitId } = await params;
        const habit = await prisma.officialHabit.findUnique({ where: { id: habitId } });
        if (!habit) {
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }
        return NextResponse.json(habit);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch habit' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { habitId } = await params;
        const body = await request.json();
        const { name, description, category, icon, difficulties, isActive, defaultCue } = body;

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (icon !== undefined) updateData.icon = icon;
        if (difficulties !== undefined) updateData.difficulties = difficulties;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (defaultCue !== undefined) updateData.defaultCue = (defaultCue && String(defaultCue).trim()) || null;

        const habit = await prisma.officialHabit.update({
            where: { id: habitId },
            data: updateData
        });
        return NextResponse.json(habit);
    } catch (error) {
        console.error('Update habit error:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: '此習慣名稱已存在' }, { status: 409 });
        }
        return NextResponse.json({ error: '更新習慣失敗' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { habitId } = await params;
        await prisma.officialHabit.delete({ where: { id: habitId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: '刪除習慣失敗' }, { status: 500 });
    }
}
