import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const habitsRaw = await prisma.officialHabit.findMany({
            where: { NOT: { fiveT: { equals: null } } },
            select: { id: true, name: true, category: true, fiveT: true }
        });

        const taskByHabit = await prisma.task.groupBy({
            by: ['officialHabitId'],
            where: { toolType: { not: null }, officialHabitId: { not: null } },
            _count: { _all: true }
        });
        const habitCountMap = {};
        for (const row of taskByHabit) {
            habitCountMap[row.officialHabitId] = row._count._all;
        }

        const taskByType = await prisma.task.groupBy({
            by: ['toolType'],
            where: { toolType: { not: null } },
            _count: { _all: true }
        });
        const typeTotals = { breathing: 0, timer: 0, music: 0 };
        for (const row of taskByType) {
            if (row.toolType && row.toolType in typeTotals) {
                typeTotals[row.toolType] = row._count._all;
            }
        }

        const habits = habitsRaw.map((h) => {
            const fiveT = h.fiveT || {};
            return {
                id: h.id,
                name: h.name,
                category: h.category,
                toolType: fiveT.toolVirtual?.type ?? null,
                params: fiveT.toolVirtual?.params ?? null,
                physical: fiveT.toolPhysical ?? [],
                taskCount: habitCountMap[h.id] ?? 0
            };
        });

        const tasksUsingTool = habits.reduce((sum, h) => sum + h.taskCount, 0);

        return NextResponse.json({
            habits,
            typeTotals,
            totals: {
                habitsWithTool: habits.length,
                tasksUsingTool
            }
        });
    } catch (error) {
        console.error('Fetch habit tools error:', error);
        return NextResponse.json({ error: 'Failed to fetch habit tools' }, { status: 500 });
    }
}
