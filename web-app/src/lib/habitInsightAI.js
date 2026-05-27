// src/lib/habitInsightAI.js
// Slice N — Scientific Brief AI-draft helper.
//
// Wraps the Anthropic SDK with a habit-insight-specific prompt that enforces
// JSON output (title / summary / detail / takeaway / tags). Kept as a pure
// helper (no Next.js / prisma imports) so the route handler stays thin and
// unit tests can mock the SDK directly.
//
// Spec: docs/superpowers/specs/2026-05-26-slice-N-scientific-brief-design.md
//       §5 Editorial flow + §5.2 prompt structure

const DEFAULT_MODEL = 'claude-sonnet-4-5';

// System prompt: writes habit insights in Traditional Chinese from a paper
// abstract. Constraints are explicit to minimise hallucinated numbers and
// hype phrasing. Output is JSON-only to keep parsing simple.
const SYSTEM_PROMPT = `You are a careful science writer for habitnext1, a Traditional Chinese (Taiwan) habit-tracking app.

Given a research paper's title and abstract, draft a HabitInsight as a JSON object with these fields:

- title (12-20 Traditional Chinese characters, punchy, no hype words)
- summary (80-150 Traditional Chinese characters, 2-3 sentences, MUST include the single most concrete number from the abstract)
- detail (300-800 Traditional Chinese characters, markdown allowed; structure: 研究設計 / 主要發現 / 限制)
- takeaway (15-40 Traditional Chinese characters, one actionable sentence in user-facing tone)
- tags (3-5 array items, Traditional Chinese, one-to-three chars each)

Strict constraints:
- Only use facts present in the provided abstract. Do not invent numbers or extrapolate beyond what's stated.
- Observational / cross-sectional studies MUST be explicitly framed as 相關性 (correlation), never 因果 (causation).
- Tone: rigorous but accessible. Avoid 革命性 / 顛覆 / 徹底 / 完全 / 絕對 / 神奇.
- Detail must include a 限制 paragraph if the abstract notes any limitation (sample size, study type, generalizability).
- Output JSON ONLY, no markdown fences, no surrounding prose. The output must parse with JSON.parse().`;

// Build the user message from the structured inputs. The habit name gives
// the AI grounding so the brief frames "why this habit" correctly. The focus
// hint is optional — admin can steer toward one angle (e.g. "focus on the
// aging mechanism, not the metabolic one") when the paper supports multiple.
function buildUserPrompt({ habitName, paperTitle, abstract, sourceUrl, focusHint }) {
    const lines = [
        `Habit this insight will attach to: ${habitName}`,
        '',
        `Paper title: ${paperTitle}`,
        '',
        `Abstract:`,
        abstract,
        '',
        `Source URL (you'll include this in the sources field): ${sourceUrl}`,
    ];
    if (focusHint && focusHint.trim()) {
        lines.push('');
        lines.push(`Focus hint (steer the angle): ${focusHint.trim()}`);
    }
    lines.push('');
    lines.push('Return JSON only.');
    return lines.join('\n');
}

// Parse the Claude response into the HabitInsight shape. Defensive: Claude
// sometimes returns text wrapped in ```json fences despite the prompt; strip
// those before JSON.parse. If parsing fails entirely, surface the raw text
// to the admin so they can hand-edit rather than dropping the work.
function parseDraftResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('Empty response from AI');
    }
    let stripped = rawText.trim();
    // Strip leading/trailing markdown code fences.
    const fenceMatch = stripped.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
    if (fenceMatch) stripped = fenceMatch[1].trim();
    try {
        const parsed = JSON.parse(stripped);
        // Light shape check; missing optional fields default empty.
        if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
        return {
            title: String(parsed.title || '').trim(),
            summary: String(parsed.summary || '').trim(),
            detail: String(parsed.detail || '').trim(),
            takeaway: parsed.takeaway ? String(parsed.takeaway).trim() : null,
            // Drop null/undefined BEFORE String() (otherwise null becomes
            // the literal "null" string and slips past the truthy filter).
            tags: Array.isArray(parsed.tags)
                ? parsed.tags.filter(t => t != null).map(t => String(t).trim()).filter(Boolean)
                : [],
        };
    } catch (err) {
        const e = new Error(`Failed to parse AI response as JSON: ${err.message}`);
        e.rawText = rawText;
        throw e;
    }
}

// draftHabitInsight — main entry, called by the admin route handler. Takes
// the SDK client as an argument so tests can inject a stub; production code
// constructs the client once per request from process.env.ANTHROPIC_API_KEY.
async function draftHabitInsight({ client, model = DEFAULT_MODEL, habitName, paperTitle, abstract, sourceUrl, focusHint }) {
    if (!client) throw new Error('Anthropic client is required');
    if (!habitName || !paperTitle || !abstract) {
        throw new Error('habitName, paperTitle, and abstract are required');
    }
    const userPrompt = buildUserPrompt({ habitName, paperTitle, abstract, sourceUrl, focusHint });
    const response = await client.messages.create({
        model,
        max_tokens: 2000,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [
            { role: 'user', content: userPrompt },
        ],
    });

    // Claude API returns content as an array of blocks; collect the text ones.
    const text = (response.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

    return {
        draft: parseDraftResponse(text),
        sourcePrompt: userPrompt, // audit trail; never exposed to users
        model,
    };
}

module.exports = {
    DEFAULT_MODEL,
    SYSTEM_PROMPT,
    buildUserPrompt,
    parseDraftResponse,
    draftHabitInsight,
};
