import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/memory/[historyId]?userId= — Slice Q seam #1.
// Ownership-gated photo access. Today: 302 → stored Blob URL.
// 之後 (Q2) 可換成簽章/短效 URL 而不動 aggregateJourney（公開彙整只帶 hasPhoto）。
export async function GET(request, { params }) {
  try {
    const { historyId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!historyId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }
    const h = await prisma.taskHistory.findUnique({
      where: { id: historyId },
      select: { photoUrl: true, task: { select: { userId: true } } },
    });
    // 不存在 / 非本人 / 無照片 → 一律 404（不洩漏存在性差異）
    if (!h || h.task?.userId !== userId || !h.photoUrl) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.redirect(h.photoUrl, 302);
  } catch (error) {
    console.error('Memory endpoint error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
