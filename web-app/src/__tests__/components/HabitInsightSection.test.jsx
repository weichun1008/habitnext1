import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HabitInsightSection from '../../components/insights/HabitInsightSection';

// react-markdown is dynamic-imported via next/dynamic + ssr:false. In jsdom
// the dynamic component is asynchronous; jest config doesn't await its
// resolution by default. Stub it with a synchronous passthrough so detail
// text appears immediately and assertions don't have to chase timing.
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

describe('HabitInsightSection', () => {
    test('renders nothing when habitId is falsy', () => {
        const { container } = render(<HabitInsightSection habitId={null} />);
        // Loading flashes briefly; assert no section header ever appears.
        expect(container.querySelector('[data-testid="habit-insight-section"]')).toBeNull();
    });

    test('renders nothing when fetch returns empty array (silent absence)', async () => {
        mockFetchOnce([]);
        const { container } = render(<HabitInsightSection habitId="h1" />);
        // Wait for loading state to clear.
        await waitFor(() => {
            expect(container.querySelector('[data-testid="habit-insight-section"]')).toBeNull();
        });
    });

    test('renders nothing on fetch error (silent absence)', async () => {
        mockFetchOnce({}, { ok: false, status: 500 });
        const { container } = render(<HabitInsightSection habitId="h1" />);
        await waitFor(() => {
            expect(container.querySelector('[data-testid="habit-insight-section"]')).toBeNull();
        });
    });

    test('renders title + summary + takeaway + sources when insights exist', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="h1" />);
        expect(await screen.findByText('糖加速老化')).toBeInTheDocument();
        expect(screen.getByText(/JAMA 2024 研究/)).toBeInTheDocument();
        expect(screen.getByText('減少讓細胞老化的飲食訊號')).toBeInTheDocument();
        // Source label is rendered as an external link.
        const link = screen.getByRole('link', { name: /JAMA Network Open 2024/ });
        expect(link).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/39073813/');
        expect(link).toHaveAttribute('target', '_blank');
    });

    test('detail + tags hidden until 展開詳細 is clicked', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="h1" />);
        await screen.findByText('糖加速老化');
        // Detail markdown not yet in DOM; tag chips not yet either.
        expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
        expect(screen.queryByText('#抗老')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('展開詳細'));

        expect(screen.getByTestId('markdown')).toBeInTheDocument();
        expect(screen.getByText('#抗老')).toBeInTheDocument();
        expect(screen.getByText('#添加糖')).toBeInTheDocument();
        // Toggle label flips.
        expect(screen.getByText('收合詳細')).toBeInTheDocument();
    });

    test('renders multiple insights in order', async () => {
        mockFetchOnce([
            insight({ id: 'a', title: '糖跟老化' }),
            insight({ id: 'b', title: '糖跟脂肪肝' }),
        ]);
        render(<HabitInsightSection habitId="h1" />);
        await screen.findByText('糖跟老化');
        expect(screen.getByText('糖跟脂肪肝')).toBeInTheDocument();
    });

    test('source without URL renders as plain text, not link', async () => {
        mockFetchOnce([insight({
            sources: [{ label: 'Some Journal 2024 (URL not on hand)', url: '', type: 'journal' }],
        })]);
        render(<HabitInsightSection habitId="h1" />);
        await screen.findByText('糖加速老化');
        expect(screen.getByText(/Some Journal 2024/)).toBeInTheDocument();
        // Not wrapped in <a>
        expect(screen.queryByRole('link', { name: /Some Journal/ })).not.toBeInTheDocument();
    });

    test('hits the right endpoint with the habitId', async () => {
        mockFetchOnce([insight()]);
        render(<HabitInsightSection habitId="abc-123" />);
        await screen.findByText('糖加速老化');
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/habits/abc-123/insights',
            expect.objectContaining({ cache: 'no-store' })
        );
    });
});
