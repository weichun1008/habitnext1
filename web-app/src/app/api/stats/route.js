import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { computeStats, addDays, HEATMAP_DAYS } from '@/lib/stats';

// GET /api/stats?userId=<id>&today=YYYY-MM-DD
// Returns the aggregated stats bundle for the Slice I stats page.
// See spec: docs/superpowers/specs/2026-05-21-slice-i-stats-streak-design.md §5.3

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const today = searchParams.get('today');

        if (!userId || !today) {
            return NextResponse.json(
                { error: 'userId and today (YYYY-MM-DD) are required' },
                { status: 400 }
            );
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
            return NextResponse.json(
                { error: 'today must be YYYY-MM-DD' },
                { status: 400 }
            );
        }

        const cutoff = addDays(today, -(HEATMAP_DAYS - 1));

        const [history, tasks, categories] = await Promise.all([
            prisma.taskHistory.findMany({
                where: {
                    task: { userId },
                    date: { gte: cutoff },
                },
                select: { taskId: true, date: true, completed: true },
            }),
            prisma.task.findMany({
                where: { userId },
                select: { id: true, title: true, category: true, identity: true },
            }),
            prisma.habitCategory.findMany({
                select: { name: true, color: true, icon: true, order: true },
                orderBy: { order: 'asc' },
            }),
        ]);

        const stats = computeStats(history, tasks, categories, today);
        return NextResponse.json(stats);
    } catch (err) {
        console.error('[api/stats] error', err);
        return NextResponse.json(
            { error: 'Failed to compute stats' },
            { status: 500 }
        );
    }
}
