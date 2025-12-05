import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all experts (admin only)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const requesterId = searchParams.get('requesterId');

        // Check if requester is admin
        if (requesterId) {
            const requester = await prisma.expert.findUnique({
                where: { id: requesterId }
            });
            if (!requester || requester.role !== 'admin') {
                return NextResponse.json({ error: '權限不足' }, { status: 403 });
            }
        }

        const experts = await prisma.expert.findMany({
            select: {
                id: true,
                name: true,
                title: true,
                role: true,
                isActive: true,
                createdAt: true,
                createdBy: true,
                _count: { select: { templates: true, assignments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(experts);

    } catch (error) {
        console.error('Fetch experts error:', error);
        return NextResponse.json({ error: `取得專家列表失敗: ${error.message}` }, { status: 500 });
    }
}

// POST: Create a new expert (admin only)
export async function POST(request) {
    try {
        const body = await request.json();
        const { name, title, pin, role, createdBy } = body;

        if (!name || !title || !pin) {
            return NextResponse.json({ error: '請填寫完整資料' }, { status: 400 });
        }

        // Check if creator is admin
        if (createdBy) {
            const creator = await prisma.expert.findUnique({
                where: { id: createdBy }
            });
            if (!creator || creator.role !== 'admin') {
                return NextResponse.json({ error: '權限不足' }, { status: 403 });
            }
        }

        const expert = await prisma.expert.create({
            data: {
                name,
                title,
                pin,
                role: role || 'expert',
                createdBy,
                isActive: true
            }
        });

        return NextResponse.json(expert);

    } catch (error) {
        console.error('Create expert error:', error);
        return NextResponse.json({ error: `建立專家失敗: ${error.message}` }, { status: 500 });
    }
}
