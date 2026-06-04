import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/plan-families/:slug — 部分更新顯示欄位。slug 不可改。
export async function PATCH(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const existing = await prisma.planFamily.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ error: '找不到此家族' }, { status: 404 });
    }
    const data = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.intro !== undefined) data.intro = String(body.intro).trim();
    if (body.icon !== undefined) data.icon = body.icon ? String(body.icon).trim() : null;
    if (body.color !== undefined) data.color = body.color ? String(body.color).trim() : null;
    if (body.quizPendingCopy !== undefined) data.quizPendingCopy = body.quizPendingCopy ? String(body.quizPendingCopy).trim() : null;
    if (body.order !== undefined && Number.isFinite(body.order)) data.order = body.order;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    const updated = await prisma.planFamily.update({ where: { slug }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update plan family error:', error);
    return NextResponse.json({ error: '更新計畫家族失敗' }, { status: 500 });
  }
}
