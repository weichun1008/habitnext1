import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeEvidence } from '@/lib/evidenceStrength';

// PATCH /api/admin/habits/insights/:id
// Slice N — partial update on an insight. Any subset of fields can be
// passed; unspecified fields are left alone. This is the publish/archive/
// reorder path as well as ad-hoc text edits.
//
// Note the route lives under `/admin/habits/insights/[id]` (not nested
// under habitId) — once the row exists its habit FK is fixed, so the
// shorter URL is sufficient and avoids redundancy.
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const existing = await prisma.habitInsight.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
        }

        const data = {};
        if (body.title !== undefined) data.title = String(body.title).trim();
        if (body.summary !== undefined) data.summary = String(body.summary).trim();
        if (body.detail !== undefined) data.detail = String(body.detail).trim();
        if (body.takeaway !== undefined) {
            data.takeaway = body.takeaway ? String(body.takeaway).trim() : null;
        }
        if (body.sources !== undefined) {
            data.sources = Array.isArray(body.sources) ? body.sources : [];
        }
        if (body.tags !== undefined) {
            data.tags = Array.isArray(body.tags)
                ? body.tags.filter(t => t != null).map(t => String(t).trim()).filter(Boolean)
                : [];
        }
        if (body.status !== undefined) {
            if (!['draft', 'published', 'archived'].includes(body.status)) {
                return NextResponse.json({ error: 'invalid status' }, { status: 400 });
            }
            data.status = body.status;
        }
        if (body.order !== undefined && Number.isFinite(body.order)) {
            data.order = body.order;
        }
        if (body.evidence !== undefined) {
            // sanitizeEvidence 回 null 代表清除評分；合法物件則寫入。
            data.evidence = sanitizeEvidence(body.evidence);
        }
        // aiGenerated is set at create-time; not editable later.
        // sourcePrompt is audit-trail; not editable later.

        const updated = await prisma.habitInsight.update({ where: { id }, data });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update habit insight error:', error);
        return NextResponse.json({ error: '更新科學佐證失敗' }, { status: 500 });
    }
}

// DELETE /api/admin/habits/insights/:id
// Hard delete. HabitInsight has no dependent rows, so cascade isn't a
// concern. Admin-only.
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const existing = await prisma.habitInsight.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
        }
        await prisma.habitInsight.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete habit insight error:', error);
        return NextResponse.json({ error: '刪除科學佐證失敗' }, { status: 500 });
    }
}
