import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeEvidence } from '@/lib/evidenceStrength';

// POST /api/admin/habits/:habitId/insights
// Slice N — admin creates an insight (either from an AI draft after review,
// or fully hand-written). Body matches the HabitInsight model fields; the
// FK habitId comes from the route param so we don't double-pass it.
//
// Auth: relies on existing admin-route conventions (see other
// /api/admin/* routes). v1 does not add a new gate — same shape.
export async function POST(request, { params }) {
    try {
        const { habitId } = await params;
        const body = await request.json();
        const {
            title,
            summary,
            detail,
            takeaway,
            sources,
            tags,
            status,
            order,
            aiGenerated,
            sourcePrompt,
            evidence,
        } = body;

        if (!habitId) {
            return NextResponse.json({ error: 'habitId required' }, { status: 400 });
        }
        // Sanity-check the three required text fields. Empty title/summary/detail
        // would render as blank cards on user-facing surfaces.
        if (!title?.trim() || !summary?.trim() || !detail?.trim()) {
            return NextResponse.json({ error: 'title / summary / detail required' }, { status: 400 });
        }

        // Verify the habit exists so a typo'd habitId returns 404 instead of
        // a foreign-key error on commit.
        const habit = await prisma.officialHabit.findUnique({ where: { id: habitId } });
        if (!habit) {
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }

        const safeStatus = ['draft', 'published', 'archived'].includes(status) ? status : 'draft';

        const created = await prisma.habitInsight.create({
            data: {
                habitId,
                title: title.trim(),
                summary: summary.trim(),
                detail: detail.trim(),
                takeaway: takeaway?.trim() || null,
                sources: Array.isArray(sources) ? sources : [],
                tags: Array.isArray(tags)
                    ? tags.filter(t => t != null).map(t => String(t).trim()).filter(Boolean)
                    : [],
                status: safeStatus,
                order: Number.isFinite(order) ? order : 0,
                aiGenerated: Boolean(aiGenerated),
                sourcePrompt: sourcePrompt || null,
                evidence: sanitizeEvidence(evidence),
            },
        });
        return NextResponse.json(created);
    } catch (error) {
        console.error('Create habit insight error:', error);
        return NextResponse.json({ error: '建立科學佐證失敗' }, { status: 500 });
    }
}
