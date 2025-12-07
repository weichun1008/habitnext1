import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { id } = params;
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
        const { id } = params;
        const body = await request.json();
        const { title, description, category, difficulty, icon, taskType, defaultConfig, isActive } = body;

        const habit = await prisma.officialHabit.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(category && { category }),
                ...(difficulty && { difficulty }),
                ...(icon !== undefined && { icon }),
                ...(taskType && { taskType }),
                ...(defaultConfig !== undefined && { defaultConfig }),
                ...(typeof isActive === 'boolean' && { isActive })
            }
        });
        return NextResponse.json(habit);
    } catch (error) {
        console.error('Update habit error:', error);
        return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        await prisma.officialHabit.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
    }
}
