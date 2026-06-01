/**
 * Tests for src/lib/habitInsightAI.js — Slice N AI-draft helper.
 *
 * Coverage:
 *   - parseDraftResponse: clean JSON, fenced JSON, malformed JSON (with raw),
 *     missing optional fields, type coercion.
 *   - buildUserPrompt: includes habit/paper/URL; optional focus hint appended.
 *   - draftHabitInsight: SDK stub round-trip, model defaulting, error paths.
 */

const {
    DEFAULT_MODEL,
    buildUserPrompt,
    parseDraftResponse,
    draftHabitInsight,
} = require('../../lib/habitInsightAI');

describe('parseDraftResponse', () => {
    test('parses a clean JSON object', () => {
        const raw = JSON.stringify({
            title: '糖加速老化',
            summary: '研究顯示...',
            detail: '完整內容',
            takeaway: '少糖',
            tags: ['糖', '抗老'],
        });
        const parsed = parseDraftResponse(raw);
        expect(parsed.title).toBe('糖加速老化');
        expect(parsed.tags).toEqual(['糖', '抗老']);
    });

    test('strips ```json ... ``` fences before parsing', () => {
        const inner = JSON.stringify({ title: 'x', summary: 'y', detail: 'z' });
        const raw = '```json\n' + inner + '\n```';
        const parsed = parseDraftResponse(raw);
        expect(parsed.title).toBe('x');
    });

    test('strips ``` ... ``` fences without language tag', () => {
        const inner = JSON.stringify({ title: 'a', summary: 'b', detail: 'c' });
        const raw = '```\n' + inner + '\n```';
        const parsed = parseDraftResponse(raw);
        expect(parsed.title).toBe('a');
    });

    test('coerces missing optional fields to defaults', () => {
        const raw = JSON.stringify({ title: 't', summary: 's', detail: 'd' });
        const parsed = parseDraftResponse(raw);
        expect(parsed.takeaway).toBeNull();
        expect(parsed.tags).toEqual([]);
    });

    test('drops empty / non-string tag entries', () => {
        const raw = JSON.stringify({
            title: 't', summary: 's', detail: 'd',
            tags: ['ok', '', null, '  whitespace  ', 'good'],
        });
        const parsed = parseDraftResponse(raw);
        expect(parsed.tags).toEqual(['ok', 'whitespace', 'good']);
    });

    test('throws with rawText attached when JSON is malformed', () => {
        const raw = 'not even close to JSON';
        try {
            parseDraftResponse(raw);
            throw new Error('should have thrown');
        } catch (e) {
            expect(e.message).toMatch(/Failed to parse/);
            expect(e.rawText).toBe(raw);
        }
    });

    test('throws on empty input', () => {
        expect(() => parseDraftResponse('')).toThrow(/Empty/);
        expect(() => parseDraftResponse(null)).toThrow(/Empty/);
    });
});

describe('buildUserPrompt', () => {
    test('includes habit / paper / abstract / URL', () => {
        const p = buildUserPrompt({
            habitName: '戒糖',
            paperTitle: 'JAMA 2024',
            abstract: 'short abstract',
            sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/abc',
        });
        expect(p).toContain('戒糖');
        expect(p).toContain('JAMA 2024');
        expect(p).toContain('short abstract');
        expect(p).toContain('https://pubmed.ncbi.nlm.nih.gov/abc');
    });

    test('appends focus hint when provided', () => {
        const p = buildUserPrompt({
            habitName: '戒糖',
            paperTitle: 'JAMA 2024',
            abstract: 'a',
            sourceUrl: 'u',
            focusHint: 'focus on aging mechanism',
        });
        expect(p).toContain('focus on aging mechanism');
    });

    test('omits focus hint section when blank', () => {
        const p = buildUserPrompt({
            habitName: '戒糖',
            paperTitle: 'JAMA',
            abstract: 'a',
            sourceUrl: 'u',
        });
        expect(p).not.toContain('Focus hint');
    });
});

describe('draftHabitInsight', () => {
    function fakeClient(returnText) {
        return {
            messages: {
                create: jest.fn(async () => ({
                    content: [{ type: 'text', text: returnText }],
                })),
            },
        };
    }

    test('round-trips a draft via stubbed Anthropic client', async () => {
        const draftJson = JSON.stringify({
            title: '糖與老化', summary: 's', detail: 'd', takeaway: 't', tags: ['糖'],
        });
        const client = fakeClient(draftJson);
        const { draft, sourcePrompt, model } = await draftHabitInsight({
            client,
            habitName: '戒糖',
            paperTitle: 'JAMA',
            abstract: 'abs',
            sourceUrl: 'u',
        });
        expect(draft.title).toBe('糖與老化');
        expect(sourcePrompt).toContain('JAMA');
        expect(model).toBe(DEFAULT_MODEL);
        expect(client.messages.create).toHaveBeenCalledTimes(1);
        const arg = client.messages.create.mock.calls[0][0];
        expect(arg.model).toBe(DEFAULT_MODEL);
        expect(arg.temperature).toBe(0.3);
        expect(arg.system).toMatch(/Traditional Chinese/);
    });

    test('honours a custom model override', async () => {
        const draftJson = JSON.stringify({ title: 't', summary: 's', detail: 'd' });
        const client = fakeClient(draftJson);
        const { model } = await draftHabitInsight({
            client,
            model: 'claude-opus-4-5',
            habitName: '戒糖',
            paperTitle: 'p',
            abstract: 'a',
            sourceUrl: 'u',
        });
        expect(model).toBe('claude-opus-4-5');
    });

    test('joins multiple text blocks from the response', async () => {
        const half1 = '{"title":"糖加速', halfFenced = '老化","summary":"s","detail":"d"}';
        const client = {
            messages: {
                create: jest.fn(async () => ({
                    content: [
                        { type: 'text', text: half1 },
                        { type: 'text', text: halfFenced },
                    ],
                })),
            },
        };
        const { draft } = await draftHabitInsight({
            client, habitName: '戒糖', paperTitle: 'p', abstract: 'a', sourceUrl: 'u',
        });
        expect(draft.title).toBe('糖加速老化');
    });

    test('throws when required fields are missing', async () => {
        const client = fakeClient('{}');
        await expect(
            draftHabitInsight({ client, habitName: '', paperTitle: 'p', abstract: 'a' })
        ).rejects.toThrow(/required/);
    });

    test('throws when no client is provided', async () => {
        await expect(
            draftHabitInsight({ habitName: '戒糖', paperTitle: 'p', abstract: 'a' })
        ).rejects.toThrow(/client/);
    });
});
