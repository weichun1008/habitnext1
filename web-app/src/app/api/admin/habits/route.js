import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const active = searchParams.get('active');

        const where = {};
        if (category) where.category = category;
        if (active !== null) where.isActive = active === 'true';

        const habits = await prisma.officialHabit.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(habits);
    } catch (error) {
        console.error('Fetch habits error:', error);
        return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, description, category, icon, difficulties } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: '請輸入習慣名稱' }, { status: 400 });
        }
        if (!category) {
            return NextResponse.json({ error: '請選擇分類' }, { status: 400 });
        }

        // Validate at least one difficulty is enabled
        const hasDifficulty = difficulties && (
            difficulties.beginner?.enabled ||
            difficulties.intermediate?.enabled ||
            difficulties.challenge?.enabled
        );
        if (!hasDifficulty) {
            return NextResponse.json({ error: '請至少啟用一個難度等級' }, { status: 400 });
        }

        const habit = await prisma.officialHabit.create({
            data: {
                name: name.trim(),
                description: description || null,
                category,
                icon: icon || null,
                difficulties: difficulties || {}
            }
        });
        return NextResponse.json(habit);
    } catch (error) {
        console.error('Create habit error:', error);
        return NextResponse.json({ error: '建立習慣失敗' }, { status: 500 });
    }
}
