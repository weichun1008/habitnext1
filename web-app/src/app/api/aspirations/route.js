import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/aspirations?userId=&status=active
// status default 'active'; pass 'all' for archived + achieved too.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status') || 'active';

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const where = { userId };
        if (status !== 'all') where.status = status;

        const rows = await prisma.aspiration.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { habits: true } },
            },
        });
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Fetch aspirations error:', error);
        return NextResponse.json({ error: '取得嚮往失敗' }, { status: 500 });
    }
}

// POST /api/aspirations
// body: { userId, text, domain?, source? }
export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, text, domain, source, identity } = body;

        if (!userId || !text || typeof text !== 'string' || !text.trim()) {
            return NextResponse.json({ error: 'userId + text required' }, { status: 400 });
        }

        const created = await prisma.aspiration.create({
            data: {
                userId,
                text: text.trim(),
                domain: domain || null,
                source: source === 'preset' ? 'preset' : 'user',
                // identity moved here from Task (2026-06-03); optional.
                identity: typeof identity === 'string' && identity.trim() ? identity.trim() : null,
            },
        });
        return NextResponse.json(created);
    } catch (error) {
        console.error('Create aspiration error:', error);
        return NextResponse.json({ error: '新增嚮往失敗' }, { status: 500 });
    }
}
