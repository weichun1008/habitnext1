import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/tasks/candidates?userId=
// Returns the user's candidate tasks with the OfficialHabit join so the
// FocusMap sliders can seed from the catalog default impact/ability.
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    try {
        const candidates = await prisma.task.findMany({
            where: { userId, status: 'candidate' },
            include: {
                officialHabit: { select: { id: true, name: true, impact: true, ability: true, icon: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        return NextResponse.json(candidates);
    } catch (error) {
        console.error('Fetch candidates error:', error);
        return NextResponse.json({ error: '取得候選清單失敗' }, { status: 500 });
    }
}
