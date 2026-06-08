import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildPlanFromAspiration } from '@/lib/planBuilder';

// POST /api/plans/from-aspiration
// body: { aspirationId, userId, name, description?, visibility: 'public' | 'private' }
export async function POST(request) {
  try {
    const { aspirationId, userId, name, description, visibility } = await request.json();
    if (!aspirationId || !userId || !name) {
      return NextResponse.json({ error: 'aspirationId, userId, name required' }, { status: 400 });
    }

    const aspiration = await prisma.aspiration.findUnique({
      where: { id: aspirationId },
      include: {
        habits: { include: { task: { include: { officialHabit: { select: { difficulties: true } } } } } },
      },
    });
    if (!aspiration || aspiration.userId !== userId) {
      return NextResponse.json({ error: '找不到嚮往' }, { status: 404 });
    }

    const habits = (aspiration.habits || [])
      .map(ah => ah.task)
      .filter(t => t && t.status === 'active' && t.officialHabit)
      .map(t => ({
        taskId: t.id, title: t.title, category: t.category,
        officialHabit: t.officialHabit, userImpact: t.userImpact, userAbility: t.userAbility, targetDays: t.targetDays,
      }));

    if (habits.length === 0) {
      return NextResponse.json({ error: '這個嚮往還沒有已加入的習慣' }, { status: 400 });
    }

    const plan = buildPlanFromAspiration({ habits });
    const isPublic = visibility === 'public';
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });

    const template = await prisma.template.create({
      data: {
        name,
        description: description || aspiration.identity || null,
        category: 'community',
        authorType: 'user',
        authorUserId: userId,
        authorName: user?.nickname || '使用者',
        reviewStatus: isPublic ? 'pending' : 'approved',
        isPublic,
        expertId: null,
        tasks: plan,
      },
    });

    return NextResponse.json({ ok: true, templateId: template.id, reviewStatus: template.reviewStatus });
  } catch (error) {
    console.error('from-aspiration error:', error);
    return NextResponse.json({ error: '建立計畫失敗' }, { status: 500 });
  }
}
