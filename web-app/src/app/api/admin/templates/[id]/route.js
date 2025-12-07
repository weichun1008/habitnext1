import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch single template by ID
export async function GET(request, { params }) {
    try {
        const template = await prisma.template.findUnique({
            where: { id: params.id },
            include: {
                expert: {
                    select: { id: true, name: true, title: true, avatar: true }
                },
                assignments: {
                    include: {
                        user: { select: { id: true, nickname: true, phone: true } }
                    }
                }
            }
        });

        if (!template) {
            return NextResponse.json({ error: '模板不存在' }, { status: 404 });
        }

        return NextResponse.json(template);

    } catch (error) {
        console.error('Fetch template error:', error);
        return NextResponse.json({ error: `取得模板失敗: ${error.message}` }, { status: 500 });
    }
}

// PUT: Update template
export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { name, description, category, isPublic, tasks } = body;

        const template = await prisma.template.update({
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(category && { category }),
                ...(isPublic !== undefined && { isPublic }),
                ...(tasks && { tasks }) // Native JSON support in PostgreSQL
            },
            include: {
                expert: {
                    select: { id: true, name: true, title: true }
                }
            }
        });

        return NextResponse.json(template);

    } catch (error) {
        console.error('Update template error:', error);
        return NextResponse.json({ error: `更新模板失敗: ${error.message}` }, { status: 500 });
    }
}

// DELETE: Delete template
export async function DELETE(request, { params }) {
    try {
        await prisma.template.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete template error:', error);
        return NextResponse.json({ error: `刪除模板失敗: ${error.message}` }, { status: 500 });
    }
}
