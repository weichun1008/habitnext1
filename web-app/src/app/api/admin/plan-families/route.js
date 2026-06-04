import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/plan-families — 後台編輯用，回全部（含未啟用），依 order。
export async function GET() {
  try {
    const families = await prisma.planFamily.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(families);
  } catch (error) {
    console.error('Admin fetch plan families error:', error);
    return NextResponse.json({ error: '取得計畫家族失敗' }, { status: 500 });
  }
}
