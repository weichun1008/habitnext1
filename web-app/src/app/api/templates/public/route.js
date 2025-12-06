import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const templates = await prisma.template.findMany({
            where: { isPublic: true },
            include: {
                expert: {
                    select: { name: true, title: true, avatar: true }
                },
                _count: {
                    select: { tasks: true, assignments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Fetch public templates error:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}
