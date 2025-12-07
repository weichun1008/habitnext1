import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all plan categories
export async function GET() {
    try {
        const categories = await prisma.planCategory.findMany({
            orderBy: { order: 'asc' }
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Fetch plan categories error:', error);
        return NextResponse.json({ error: '無法載入計畫分類' }, { status: 500 });
    }
}

// POST: Create a new plan category
export async function POST(request) {
    try {
        const body = await request.json();
        const { name, color, icon, order } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: '請輸入分類名稱' }, { status: 400 });
        }

        // Check if name already exists
        const existing = await prisma.planCategory.findUnique({
            where: { name: name.trim() }
        });
        if (existing) {
            return NextResponse.json({ error: '此分類名稱已存在' }, { status: 400 });
        }

        // Get max order if not provided
        let newOrder = order;
        if (newOrder === undefined) {
            const maxOrder = await prisma.planCategory.findFirst({
                orderBy: { order: 'desc' },
                select: { order: true }
            });
            newOrder = (maxOrder?.order || 0) + 1;
        }

        const category = await prisma.planCategory.create({
            data: {
                name: name.trim(),
                color: color || '#10b981',
                icon: icon || null,
                order: newOrder
            }
        });
        return NextResponse.json(category);
    } catch (error) {
        console.error('Create plan category error:', error);
        return NextResponse.json({ error: '建立分類失敗' }, { status: 500 });
    }
}
