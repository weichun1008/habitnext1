import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const templatesRaw = await prisma.template.findMany({
            where: { isPublic: true },
            include: {
                expert: {
                    select: { name: true, title: true, avatar: true }
                },
                _count: {
                    select: { assignments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const templates = templatesRaw.map(t => ({
            ...t,
            _count: {
                assignments: t._count.assignments,
                tasks: Array.isArray(t.tasks) ? t.tasks.length : 0
            }
        }));

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Fetch public templates error:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}
