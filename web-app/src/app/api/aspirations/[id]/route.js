import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/aspirations/:id
// body: { status?, achievedAt?, identity? }
export async function PATCH(request, { params }) {
    try {
        const body = await request.json();
        const { status, achievedAt, identity } = body;

        const data = {};
        // identity (2026-06-03) — empty string / whitespace clears it.
        if (identity !== undefined) {
            data.identity = typeof identity === 'string' && identity.trim() ? identity.trim() : null;
        }
        if (status !== undefined) {
            if (!['active', 'achieved', 'archived'].includes(status)) {
                return NextResponse.json({ error: 'invalid status' }, { status: 400 });
            }
            data.status = status;
            // Auto-set achievedAt when marking achieved
            if (status === 'achieved' && achievedAt === undefined) {
                data.achievedAt = new Date();
            }
            // Clear achievedAt when reverting to active
            if (status === 'active') {
                data.achievedAt = null;
            }
        }
        // Explicit achievedAt in the body takes precedence over the auto-derived
        // value above — lets callers override the timestamp (e.g. backfill).
        if (achievedAt !== undefined) {
            data.achievedAt = achievedAt ? new Date(achievedAt) : null;
        }

        const updated = await prisma.aspiration.update({
            where: { id: params.id },
            data,
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update aspiration error:', error);
        return NextResponse.json({ error: '更新嚮往失敗' }, { status: 500 });
    }
}

// DELETE /api/aspirations/:id — cascades AspirationHabit rows
export async function DELETE(request, { params }) {
    try {
        await prisma.aspiration.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete aspiration error:', error);
        return NextResponse.json({ error: '刪除嚮往失敗' }, { status: 500 });
    }
}
