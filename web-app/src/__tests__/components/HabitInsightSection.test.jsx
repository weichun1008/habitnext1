import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HabitInsightSection from '../../components/insights/HabitInsightSection';

// react-markdown is dynamic-imported via next/dynamic + ssr:false. Stub it
// with a synchronous passthrough so detail text appears immediately and
// assertions don't have to chase timing.
jest.mock('next/dynamic', () => () => {
    const Passthrough = ({ children }) => <div data-testid="markdown">{children}</div>;
    Passthrough.displayName = 'NextDynamicStub';
    return Passthrough;
});

function mockFetchOnce(payload, { ok = true, status = 200 } = {}) {
    global.fetch = jest.fn(async () => ({
        ok,
        status,
        json: async () => payload,
    }));
}

const insight = (overrides = {}) => ({
    id: 'i1',
    title: '糖加速老化',
    summary: 'JAMA 2024 研究發現 +1g 糖每年老化 0.02 年',
    detail: '**研究設計**\n\n342 位中年女性...',
    takeaway: '減少讓細胞老化的飲食訊號',
    sources: [
        { label: 'JAMA Network Open 2024', url: 'https://pubmed.ncbi.nlm.nih.gov/39073813/', type: 'pubmed' },
    ],
    tags: ['抗老', '添加糖'],
    status: 'published',
    ...overrides,
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('HabitInsightSection — silent absence', () => {
    test('renders nothing when habitId is falsy', () => {
        const { container } = render(<HabitInsightSection habitId={null} />);
        expect(container.querySelector('[data-testid="habit-insight-section"]')).toBeNull();
    });

    test('renders nothing when fetch returns empty array', async () => {
        mockFetchOnce([]);
        const { container } = render(<HabitInsightSection habitId="h1" />);
        await waitFor(() => {
            expect(container.querySelector('[data-testid="habit-insight-section"]')).toBeNull();
        });
    });

    test('renders nothing on fetch error', async () => {
        mockFetchOnce({}, { ok: false, status: 500 });
        const { container } = render(<HabitInsightSection habitId="h1" />);
        await waitFor(() => {
            expect(container.querySelector('[data-testid="habit-insight-section"]')).toBeNull();
        });
    });
});

describe('HabitInsightSection — Layer 1 (collapsed)', () => {
    test('shows takeaway wrapped in 「」 when one exists', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="h1" />);
        // Headline = takeaway quoted, NOT title.
        expect(await screen.findByText(/「減少讓細胞老化的飲食訊號」/)).toBeInTheDocument();
        // Title is NOT visible at layer 1.
        expect(screen.queryByText('糖加速老化')).not.toBeInTheDocument();
        // Summary, sources, detail also hidden.
        expect(screen.queryByText(/JAMA 2024 研究/)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /JAMA Network Open/ })).not.toBeInTheDocument();
    });

    test('falls back to title (no quote marks) when takeaway is missing', async () => {
        mockFetchOnce([insight({ takeaway: null })]);
        render(<HabitInsightSection habitId="h1" />);
        expect(await screen.findByText('糖加速老化')).toBeInTheDocument();
        // Should NOT be quoted.
        expect(screen.queryByText(/「糖加速老化」/)).not.toBeInTheDocument();
    });

    test('falls back to title when takeaway is empty string', async () => {
        mockFetchOnce([insight({ takeaway: '   ' })]);
        render(<HabitInsightSection habitId="h1" />);
        expect(await screen.findByText('糖加速老化')).toBeInTheDocument();
    });

    test('section header shows count when more than 1 insight', async () => {
        mockFetchOnce([insight({ id: 'a' }), insight({ id: 'b', title: 'X', takeaway: 'Y' })]);
        render(<HabitInsightSection habitId="h1" />);
        await screen.findByText(/「減少讓細胞老化的飲食訊號」/);
        // Count badge "· 2" appears next to the section title.
        expect(screen.getByText(/· 2/)).toBeInTheDocument();
    });

    test('section header omits count when exactly 1 insight', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="h1" />);
        await screen.findByText(/「減少讓細胞老化的飲食訊號」/);
        // Section title rendered, but no "· N" suffix.
        expect(screen.queryByText(/· \d+/)).not.toBeInTheDocument();
    });
});

describe('HabitInsightSection — Layer 2 (expanded)', () => {
    async function expandFirstCard() {
        const headline = await screen.findByText(/「減少讓細胞老化的飲食訊號」/);
        fireEvent.click(headline.closest('button'));
    }

    test('clicking headline reveals title + summary + sources + tags', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="h1" />);
        await expandFirstCard();
        expect(screen.getByText('糖加速老化')).toBeInTheDocument(); // title
        expect(screen.getByText(/JAMA 2024 研究發現/)).toBeInTheDocument(); // summary
        const link = screen.getByRole('link', { name: /JAMA Network Open/ });
        expect(link).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/39073813/');
        expect(screen.getByText('#抗老')).toBeInTheDocument();
        expect(screen.getByText('#添加糖')).toBeInTheDocument();
    });

    test('title duplicate suppressed when fallback (no takeaway) was used as headline', async () => {
        mockFetchOnce([insight({ takeaway: null })]);
        render(<HabitInsightSection habitId="h1" />);
        // Title is the layer-1 headline.
        const headline = await screen.findByText('糖加速老化');
        fireEvent.click(headline.closest('button'));
        // After expanding, the title should NOT appear a second time — only
        // in the headline. Use getAllByText to confirm just one instance.
        expect(screen.getAllByText('糖加速老化')).toHaveLength(1);
        // Summary still visible.
        expect(screen.getByText(/JAMA 2024 研究/)).toBeInTheDocument();
    });

    test('detail markdown stays hidden until 看研究細節 clicked', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="h1" />);
        await expandFirstCard();
        expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('看研究細節'));
        expect(screen.getByTestId('markdown')).toBeInTheDocument();
        expect(screen.getByText('收起研究細節')).toBeInTheDocument();
    });

    test('source without URL renders as plain text, not link', async () => {
        mockFetchOnce([insight({
            sources: [{ label: 'Some Journal 2024', url: '', type: 'journal' }],
        })]);
        render(<HabitInsightSection habitId="h1" />);
        await expandFirstCard();
        expect(screen.getByText(/Some Journal 2024/)).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Some Journal/ })).not.toBeInTheDocument();
    });

    test('clicking the headline again collapses the card', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="h1" />);
        await expandFirstCard();
        expect(screen.getByText('糖加速老化')).toBeInTheDocument();
        const headline = screen.getByText(/「減少讓細胞老化的飲食訊號」/);
        fireEvent.click(headline.closest('button'));
        expect(screen.queryByText('糖加速老化')).not.toBeInTheDocument();
        expect(screen.queryByText(/JAMA 2024 研究/)).not.toBeInTheDocument();
    });
});

describe('HabitInsightSection — endpoint', () => {
    test('hits the right endpoint with cache=no-store', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="abc-123" />);
        await screen.findByText(/「減少讓細胞老化的飲食訊號」/);
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/habits/abc-123/insights',
            expect.objectContaining({ cache: 'no-store' })
        );
    });
});
