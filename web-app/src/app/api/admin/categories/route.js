import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all categories
export async function GET() {
    try {
        const categories = await prisma.habitCategory.findMany({
            orderBy: { order: 'asc' }
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Fetch categories error:', error);
        return NextResponse.json({ error: '無法載入分類' }, { status: 500 });
    }
}

// POST create new category
export async function POST(request) {
    try {
        const body = await request.json();
        const { name, color } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: '請輸入分類名稱' }, { status: 400 });
        }

        // Get max order
        const maxOrder = await prisma.habitCategory.findFirst({
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        const category = await prisma.habitCategory.create({
            data: {
                name: name.trim(),
                color: color || '#10B981', // Default emerald
                order: (maxOrder?.order ?? 0) + 1
            }
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error('Create category error:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: '此分類名稱已存在' }, { status: 400 });
        }
        return NextResponse.json({ error: '建立失敗' }, { status: 500 });
    }
}
