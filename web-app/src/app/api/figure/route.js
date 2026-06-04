import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
const { worldScopedWhere } = require('@/lib/worldScope');
const { figureStage, nextStageProgress } = require('@/lib/figureWorld');

// GET /api/figure?userId= — read-only. Figure-world completion count (shared
// prologue + 'figure'), derived stage + next-stage progress.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    const count = await prisma.taskHistory.count({
      where: { completed: true, task: { userId }, ...worldScopedWhere('figure') },
    });
    return NextResponse.json({ count, stage: figureStage(count), progress: nextStageProgress(count) });
  } catch (error) {
    console.error('Figure API error:', error);
    return NextResponse.json({ error: 'Failed to load figure' }, { status: 500 });
  }
}
