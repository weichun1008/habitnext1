import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all experts
export async function GET(request) {
    try {
        const experts = await prisma.expert.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                title: true,
                titleId: true,
                expertTitle: {
                    select: { name: true }
                },
                isApproved: true,
                createdAt: true,
                _count: {
                    select: { templates: true }
                }
            }
        });

        return NextResponse.json(experts);
    } catch (error) {
        console.error('Fetch experts error:', error);
        return NextResponse.json({ error: 'Failed to fetch experts' }, { status: 500 });
    }
}

// PUT: Update expert status or details
export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, isApproved, titleId } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
        }

        const updates = {};
        if (typeof isApproved === 'boolean') updates.isApproved = isApproved;
        if (titleId) {
            updates.titleId = titleId;
            // Also update legacy title field for backward compatibility
            const titleRecord = await prisma.expertTitle.findUnique({ where: { id: titleId } });
            if (titleRecord) {
                updates.title = titleRecord.name;
            }
        }

        const updatedExpert = await prisma.expert.update({
            where: { id },
            data: updates,
            select: {
                id: true,
                name: true,
                isApproved: true,
                title: true,
                titleId: true,
                expertTitle: { select: { name: true } }
            }
        });

        return NextResponse.json(updatedExpert);

    } catch (error) {
        console.error('Update expert error:', error);
        return NextResponse.json({ error: 'Failed to update expert' }, { status: 500 });
    }
}
