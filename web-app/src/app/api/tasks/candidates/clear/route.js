import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/tasks/candidates/clear
// body: { userId }
// 把該使用者所有 status='candidate' 的 Task 一次封存為 'archived'。
// banner 上 X = 全部捨棄候選 的後端入口。
export async function POST(request) {
    try {
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const result = await prisma.task.updateMany({
            where: { userId, status: 'candidate' },
            data: { status: 'archived', ratedAt: new Date() },
        });

        return NextResponse.json({ ok: true, archived: result.count });
    } catch (error) {
        console.error('Clear candidates error:', error);
        return NextResponse.json({ error: '清除候選失敗' }, { status: 500 });
    }
}
