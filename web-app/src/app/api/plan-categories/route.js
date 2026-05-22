import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public read-only endpoint — used by the user-facing TemplateExplorer
// to render category chips with admin-editable colors / icons / labels
// without leaking expert-management surface area.
export async function GET() {
    try {
        const categories = await prisma.planCategory.findMany({
            orderBy: { order: 'asc' },
            select: {
                slug: true,
                name: true,
                color: true,
                icon: true,
                isSystem: true,
            },
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Fetch public plan categories error:', error);
        return NextResponse.json({ error: '無法載入分類' }, { status: 500 });
    }
}
