import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH /api/admin/plans/[id]/review
// body: { decision: 'approve' | 'reject', reason? }
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { decision, reason } = await request.json();
    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'decision must be approve or reject' }, { status: 400 });
    }
    const tpl = await prisma.template.findUnique({ where: { id }, select: { id: true, reviewStatus: true } });
    if (!tpl) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (tpl.reviewStatus !== 'pending') {
      return NextResponse.json({ error: '此計畫不是待審狀態' }, { status: 409 });
    }
    const updated = await prisma.template.update({
      where: { id },
      data: {
        reviewStatus: decision === 'approve' ? 'approved' : 'rejected',
        description: decision === 'reject' && reason ? `（退回：${reason}）` : undefined,
      },
    });
    return NextResponse.json({ ok: true, reviewStatus: updated.reviewStatus });
  } catch (error) {
    console.error('plan review error:', error);
    return NextResponse.json({ error: '審核失敗' }, { status: 500 });
  }
}
