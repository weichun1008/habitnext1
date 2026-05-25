import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { filterRecommendedTemplates, filterRecommendedHabits } from '@/lib/aspirations';

// GET /api/aspirations/:id/recommendations
// Returns { aspiration, templates, habits } based on aspiration.domain.
export async function GET(request, { params }) {
    try {
        const aspiration = await prisma.aspiration.findUnique({ where: { id: params.id } });
        if (!aspiration) {
            return NextResponse.json({ error: '嚮往不存在' }, { status: 404 });
        }

        const [templates, habits, planCategories] = await Promise.all([
            prisma.template.findMany({
                where: { isPublic: true },
                include: {
                    expert: { select: { id: true, name: true, title: true } },
                    _count: { select: { assignments: true } },
                },
            }),
            prisma.officialHabit.findMany({ where: { isActive: true } }),
            prisma.planCategory.findMany({ select: { slug: true, domain: true, name: true, color: true, icon: true } }),
        ]);

        const planCategoryMap = {};
        for (const c of planCategories) {
            if (c.slug) planCategoryMap[c.slug] = c;
        }

        const recommendedTemplates = filterRecommendedTemplates(templates, aspiration.domain, planCategoryMap);
        const recommendedHabits = filterRecommendedHabits(habits, aspiration.domain);

        return NextResponse.json({
            aspiration,
            templates: recommendedTemplates,
            habits: recommendedHabits,
        });
    } catch (error) {
        console.error('Recommendations error:', error);
        return NextResponse.json({ error: '取得推薦失敗' }, { status: 500 });
    }
}
