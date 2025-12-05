import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all templates (optionally filter by expertId or isPublic)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const expertId = searchParams.get('expertId');
        const publicOnly = searchParams.get('public') === 'true';

        const where = {};
        if (expertId) where.expertId = expertId;
        if (publicOnly) where.isPublic = true;

        const templates = await prisma.template.findMany({
            where,
            include: {
                expert: {
                    select: { id: true, name: true, title: true, avatar: true }
                },
                _count: { select: { assignments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(templates);

    } catch (error) {
        console.error('Fetch templates error:', error);
        return NextResponse.json({ error: `取得模板失敗: ${error.message}` }, { status: 500 });
    }
}

// POST: Create a new template
export async function POST(request) {
    try {
        const body = await request.json();
        const { expertId, name, description, category, isPublic, tasks } = body;

        if (!expertId || !name || !category || !tasks) {
            return NextResponse.json({ error: '請填寫完整資料' }, { status: 400 });
        }

        const template = await prisma.template.create({
            data: {
                expertId,
                name,
                description: description || '',
                category,
                isPublic: isPublic || false,
                tasks: tasks // Array of task objects
            },
            include: {
                expert: {
                    select: { id: true, name: true, title: true }
                }
            }
        });

        return NextResponse.json(template);

    } catch (error) {
        console.error('Create template error:', error);
        return NextResponse.json({ error: `建立模板失敗: ${error.message}` }, { status: 500 });
    }
}
