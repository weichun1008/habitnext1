import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch single expert
export async function GET(request, { params }) {
    try {
        const expert = await prisma.expert.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                name: true,
                title: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: { select: { templates: true, assignments: true } }
            }
        });

        if (!expert) {
            return NextResponse.json({ error: '專家不存在' }, { status: 404 });
        }

        return NextResponse.json(expert);

    } catch (error) {
        console.error('Fetch expert error:', error);
        return NextResponse.json({ error: `取得專家失敗: ${error.message}` }, { status: 500 });
    }
}

// PUT: Update expert (admin only)
export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { name, title, pin, role, isActive, requesterId } = body;

        // Check if requester is admin
        if (requesterId) {
            const requester = await prisma.expert.findUnique({
                where: { id: requesterId }
            });
            if (!requester || requester.role !== 'admin') {
                return NextResponse.json({ error: '權限不足' }, { status: 403 });
            }
        }

        const expert = await prisma.expert.update({
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(title && { title }),
                ...(pin && { pin }),
                ...(role && { role }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json(expert);

    } catch (error) {
        console.error('Update expert error:', error);
        return NextResponse.json({ error: `更新專家失敗: ${error.message}` }, { status: 500 });
    }
}

// DELETE: Delete expert (admin only)
export async function DELETE(request, { params }) {
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

        await prisma.expert.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete expert error:', error);
        return NextResponse.json({ error: `刪除專家失敗: ${error.message}` }, { status: 500 });
    }
}
