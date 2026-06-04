import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/plan-families — 探索計畫第一層用。只回啟用中的家族，依 order。
export async function GET() {
  try {
    const families = await prisma.planFamily.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(families);
  } catch (error) {
    console.error('Fetch plan families error:', error);
    return NextResponse.json({ error: '取得計畫家族失敗' }, { status: 500 });
  }
}
