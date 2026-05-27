import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/habits/:habitId/insights?status=published|all
// Slice N — Scientific Brief.
// Public endpoint (no admin gate): used by HabitListView + TaskDetailModal
// to render the "為什麼這個習慣值得做" section. Defaults to status=published
// so drafts never leak to end-users. ?status=all is for the admin UI's
// list view; admin routes are separate but this `all` mode is convenient
// when the admin habit-detail page reads from this same endpoint.
export async function GET(request, { params }) {
    try {
        const { habitId } = await params;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'published';

        if (!habitId) {
            return NextResponse.json({ error: 'habitId required' }, { status: 400 });
        }

        const where = { habitId };
        if (status !== 'all') where.status = status;

        const insights = await prisma.habitInsight.findMany({
            where,
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        });
        return NextResponse.json(insights);
    } catch (error) {
        console.error('Fetch habit insights error:', error);
        return NextResponse.json({ error: '取得科學佐證失敗' }, { status: 500 });
    }
}
