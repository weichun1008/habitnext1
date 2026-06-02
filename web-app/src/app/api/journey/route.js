import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
const { categoryToDomain } = require('@/lib/categoryToDomain');
const { aggregateJourney } = require('@/lib/journeyWorld');

// GET /api/journey?userId= — 唯讀聚合。座標不出後端：只回傳 city/domain/date/title。
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const histories = await prisma.taskHistory.findMany({
      where: { completed: true, city: { not: null }, task: { userId } },
      select: { date: true, city: true, task: { select: { category: true, title: true } } },
    });
    const rows = histories.map((h) => ({
      city: h.city,
      domain: categoryToDomain(h.task?.category),
      date: h.date,
      title: h.task?.title || '',
    }));
    return NextResponse.json(aggregateJourney(rows));
  } catch (error) {
    console.error('Journey API error:', error);
    return NextResponse.json({ error: 'Failed to load journey' }, { status: 500 });
  }
}
