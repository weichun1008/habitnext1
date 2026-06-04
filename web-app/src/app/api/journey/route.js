import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
const { categoryToDomain } = require('@/lib/categoryToDomain');
const { aggregateJourney } = require('@/lib/journeyWorld');

// GET /api/journey?userId= — 唯讀聚合旅程世界城市地圖。
// 回傳 pin = { id, date, domain, title, hasPhoto }。座標不出後端：photoUrl / lat / lng
// 都不進回應（photoUrl 只用來算 hasPhoto；照片 bytes 走授權端點 /api/memory/[id]）。
//
// ★ World Switch 邊界決策（2026-06-02，跨 session 協調）：本 API 刻意「不」依
//   user.activeWorld 過濾 —— 旅程地圖顯示**所有世界累積**的地點，是一張跨世界的真實
//   回憶地圖（非各世界獨立）。理由：journey 是三世界中唯一記地點的世界，home/figure
//   無地點資料可洩；且把真實回憶按世界切碎違背 Slice O/P「珍惜累積」的初衷。
//   注意命名區分：activeWorld='journey'（使用者當下在玩的世界）≠ 本 /api/journey
//   （跨世界累積的唯讀地圖）。若未來產品決定改成「只顯示 journey 世界」，用
//   worldScope.worldScopedWhere('journey') 併進下方 where 即可（一行）。
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const histories = await prisma.taskHistory.findMany({
      where: { completed: true, city: { not: null }, task: { userId } },
      select: { id: true, date: true, city: true, photoUrl: true, task: { select: { category: true, title: true } } },
    });
    const rows = histories.map((h) => ({
      id: h.id,
      city: h.city,
      domain: categoryToDomain(h.task?.category),
      date: h.date,
      title: h.task?.title || '',
      hasPhoto: !!h.photoUrl,
    }));
    return NextResponse.json(aggregateJourney(rows));
  } catch (error) {
    console.error('Journey API error:', error);
    return NextResponse.json({ error: 'Failed to load journey' }, { status: 500 });
  }
}
