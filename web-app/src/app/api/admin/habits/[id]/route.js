import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const habit = await prisma.officialHabit.findUnique({ where: { id } });
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
        const { id } = await params;
        const body = await request.json();
        const { name, description, category, icon, difficulties, isActive } = body;

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (icon !== undefined) updateData.icon = icon;
        if (difficulties !== undefined) updateData.difficulties = difficulties;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;

        const habit = await prisma.officialHabit.update({
            where: { id },
            data: updateData
        });
        return NextResponse.json(habit);
    } catch (error) {
        console.error('Update habit error:', error);
        return NextResponse.json({ error: '更新習慣失敗' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await prisma.officialHabit.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: '刪除習慣失敗' }, { status: 500 });
    }
}
