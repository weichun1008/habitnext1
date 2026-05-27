import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { draftHabitInsight, DEFAULT_MODEL } from '@/lib/habitInsightAI';

// POST /api/admin/habits/insights/draft
// Slice N — admin pastes paper title + abstract + URL (+ optional focus
// hint); we call Claude to draft the HabitInsight JSON shape, return it
// alongside the audit-trail sourcePrompt. This endpoint DOES NOT write to
// the DB — admin reviews the draft, edits in the form, then explicitly
// POSTs to /api/admin/habits/:habitId/insights to persist.
//
// Env:
//   ANTHROPIC_API_KEY  required at runtime
//   CLAUDE_MODEL_NAME  optional; defaults to DEFAULT_MODEL
export async function POST(request) {
    try {
        const body = await request.json();
        const { habitId, paperTitle, abstract, sourceUrl, focusHint } = body;

        if (!habitId || !paperTitle?.trim() || !abstract?.trim()) {
            return NextResponse.json({ error: 'habitId / paperTitle / abstract required' }, { status: 400 });
        }
        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing on server' }, { status: 500 });
        }

        // Habit context grounds the AI's framing — we look up the row and
        // pass the name (and a fallback to description) into the prompt.
        const habit = await prisma.officialHabit.findUnique({ where: { id: habitId } });
        if (!habit) {
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const model = process.env.CLAUDE_MODEL_NAME || DEFAULT_MODEL;

        const { draft, sourcePrompt } = await draftHabitInsight({
            client,
            model,
            habitName: habit.name,
            paperTitle: String(paperTitle).trim(),
            abstract: String(abstract).trim(),
            sourceUrl: sourceUrl ? String(sourceUrl).trim() : '',
            focusHint: focusHint ? String(focusHint).trim() : '',
        });

        return NextResponse.json({
            draft,
            // The full prompt is returned so the admin's create form can pass
            // it back when persisting — sourcePrompt becomes part of the
            // HabitInsight row as audit trail.
            sourcePrompt,
            model,
            // A pre-built sources entry the admin can keep or strip.
            suggestedSource: sourceUrl
                ? [{ label: String(paperTitle).trim(), url: String(sourceUrl).trim(), type: 'pubmed' }]
                : [],
        });
    } catch (error) {
        console.error('AI draft insight error:', error);
        // If parsing failed, surface the raw text so the admin can hand-edit
        // rather than re-running and burning more tokens.
        if (error.rawText) {
            return NextResponse.json({
                error: 'AI 草稿無法解析為 JSON，請手動修正',
                rawText: error.rawText,
            }, { status: 422 });
        }
        return NextResponse.json({ error: error.message || 'AI 草擬失敗' }, { status: 500 });
    }
}
