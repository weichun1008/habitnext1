import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const difficulty = searchParams.get('difficulty');
        const active = searchParams.get('active');

        const where = {};
        if (category) where.category = category;
        if (difficulty) where.difficulty = difficulty;
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
        const { title, description, category, difficulty, icon, taskType, defaultConfig } = body;

        if (!title || !category || !difficulty) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const habit = await prisma.officialHabit.create({
            data: {
                title,
                description,
                category,
                difficulty,
                icon,
                taskType: taskType || 'binary',
                defaultConfig: defaultConfig || {}
            }
        });
        return NextResponse.json(habit);
    } catch (error) {
        console.error('Create habit error:', error);
        return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
    }
}
