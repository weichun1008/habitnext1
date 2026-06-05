import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AspirationRecommendationPanel from '../../components/AspirationRecommendationPanel';

const aspiration = {
    id: 'asp1',
    text: '想要好好睡覺',
    domain: '壓力與睡眠',
};

function mockFetchOk(payload) {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => payload }));
}

afterEach(() => {
    jest.restoreAllMocks();
});

describe('AspirationRecommendationPanel — initial render', () => {
    test('returns null when no aspiration is passed', () => {
        mockFetchOk({ templates: [], habits: [] });
        const { container } = render(
            <AspirationRecommendationPanel aspiration={null} onBack={() => {}} />
        );
        expect(container.firstChild).toBeNull();
    });

    test('shows loading then renders header with aspiration text', async () => {
        mockFetchOk({ templates: [], habits: [] });
        render(
            <AspirationRecommendationPanel aspiration={aspiration} onBack={() => {}} />
        );
        expect(screen.getByText(/載入推薦中/)).toBeInTheDocument();
        expect(await screen.findByText('想要好好睡覺')).toBeInTheDocument();
    });
});

describe('AspirationRecommendationPanel — recommendations', () => {
    test('renders template + habit cards from the API response', async () => {
        const templates = [
            { id: 't1', name: '壓力型睡眠處方', description: '14 天循序漸進', tasks: { phases: [{ days: 7, tasks: [{ title: 'a' }, { title: 'b' }] }] }, expert: { name: '某專家' } },
        ];
        const habits = [
            { id: 'h1', name: '睡前 60 分鐘停止螢幕', description: '入門 baby step', difficulties: { beginner: { enabled: true }, intermediate: { enabled: true } } },
        ];
        mockFetchOk({ templates, habits });
        render(
            <AspirationRecommendationPanel aspiration={aspiration} onBack={() => {}} />
        );
        expect(await screen.findByText('壓力型睡眠處方')).toBeInTheDocument();
        expect(screen.getByText(/14 天循序漸進/)).toBeInTheDocument();
        expect(screen.getByText('睡前 60 分鐘停止螢幕')).toBeInTheDocument();
    });

    test('shows empty hints in each section when nothing is recommended', async () => {
        mockFetchOk({ templates: [], habits: [] });
        render(
            <AspirationRecommendationPanel aspiration={aspiration} onBack={() => {}} />
        );
        expect(await screen.findByText('沒有對應的計畫')).toBeInTheDocument();
        expect(screen.getByText('沒有對應的習慣')).toBeInTheDocument();
        // Empty results variant of the skip blurb.
        expect(screen.getByText(/還沒有對應的計畫 \/ 習慣/)).toBeInTheDocument();
    });
});

describe('AspirationRecommendationPanel — callbacks', () => {
    test('clicking a template card calls onPickTemplate with (template, aspiration)', async () => {
        const template = { id: 't1', name: '計畫一', description: '說明', tasks: { phases: [] } };
        mockFetchOk({ templates: [template], habits: [] });
        const onPickTemplate = jest.fn(async () => {});
        render(
            <AspirationRecommendationPanel
                aspiration={aspiration}
                onBack={() => {}}
                onPickTemplate={onPickTemplate}
            />
        );
        const card = await screen.findByText('計畫一');
        fireEvent.click(card.closest('button'));
        await waitFor(() => expect(onPickTemplate).toHaveBeenCalledWith(template, aspiration));
    });

    test('clicking 直接加入 fires onPickHabit with (habit, aspiration)', async () => {
        // 2026-05-29: HabitCard now has two CTAs (加入候選 + 直接加入). The
        // direct-add path is the green "直接加入" button; 加入候選 routes
        // through onAddHabitAsCandidate instead. See sibling test below.
        const habit = { id: 'h1', name: '習慣一', description: '說明', difficulties: { beginner: { enabled: true } } };
        mockFetchOk({ templates: [], habits: [habit] });
        const onPickHabit = jest.fn(async () => {});
        render(
            <AspirationRecommendationPanel
                aspiration={aspiration}
                onBack={() => {}}
                onPickHabit={onPickHabit}
            />
        );
        await screen.findByText('習慣一');
        fireEvent.click(screen.getByRole('button', { name: /直接加入/ }));
        await waitFor(() => expect(onPickHabit).toHaveBeenCalledWith(habit, aspiration));
    });

    test('clicking 加入候選 fires onAddHabitAsCandidate, locks both buttons, shows sticky CTA', async () => {
        const habit = { id: 'h1', name: '習慣一', description: '說明', difficulties: { beginner: { enabled: true } } };
        mockFetchOk({ templates: [], habits: [habit] });
        const onAddHabitAsCandidate = jest.fn(async () => {});
        const onOpenFocusMap = jest.fn();
        render(
            <AspirationRecommendationPanel
                aspiration={aspiration}
                onBack={() => {}}
                onPickHabit={() => {}}
                onAddHabitAsCandidate={onAddHabitAsCandidate}
                onOpenFocusMap={onOpenFocusMap}
            />
        );
        await screen.findByText('習慣一');
        fireEvent.click(screen.getByRole('button', { name: /加入候選/ }));
        await waitFor(() => expect(onAddHabitAsCandidate).toHaveBeenCalledWith(habit, aspiration));
        // Once added, both buttons are disabled and the 加入候選 label flips.
        await waitFor(() => expect(screen.getByRole('button', { name: /已加入候選/ })).toBeDisabled());
        expect(screen.getByRole('button', { name: /直接加入/ })).toBeDisabled();
        // Sticky bottom CTA appears with running count.
        const cta = screen.getByRole('button', { name: /開始評分/ });
        expect(cta).toBeInTheDocument();
        fireEvent.click(cta);
        expect(onOpenFocusMap).toHaveBeenCalledTimes(1);
    });

    test('sticky 開始評分 CTA does not render until at least 1 candidate added', async () => {
        const habit = { id: 'h2', name: '習慣二', description: '', difficulties: { beginner: { enabled: true } } };
        mockFetchOk({ templates: [], habits: [habit] });
        render(
            <AspirationRecommendationPanel
                aspiration={aspiration}
                onBack={() => {}}
                onPickHabit={() => {}}
                onAddHabitAsCandidate={async () => {}}
                onOpenFocusMap={() => {}}
            />
        );
        await screen.findByText('習慣二');
        expect(screen.queryByRole('button', { name: /開始評分/ })).not.toBeInTheDocument();
    });

    test('clicking back fires onBack', async () => {
        mockFetchOk({ templates: [], habits: [] });
        const onBack = jest.fn();
        render(
            <AspirationRecommendationPanel aspiration={aspiration} onBack={onBack} />
        );
        await screen.findByText('想要好好睡覺');
        fireEvent.click(screen.getByLabelText('返回'));
        expect(onBack).toHaveBeenCalled();
    });

    test('skip-to-templates / skip-to-habits fire their handlers', async () => {
        mockFetchOk({ templates: [], habits: [] });
        const onSkipToTemplates = jest.fn();
        const onSkipToHabits = jest.fn();
        render(
            <AspirationRecommendationPanel
                aspiration={aspiration}
                onBack={() => {}}
                onSkipToTemplates={onSkipToTemplates}
                onSkipToHabits={onSkipToHabits}
            />
        );
        await screen.findByText(/還沒有對應的計畫/);
        fireEvent.click(screen.getByText('探索計畫'));
        expect(onSkipToTemplates).toHaveBeenCalled();
        fireEvent.click(screen.getByText('探索習慣'));
        expect(onSkipToHabits).toHaveBeenCalled();
    });
});

describe('AspirationRecommendationPanel — error handling', () => {
    test('shows an error when the fetch fails', async () => {
        global.fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
        render(
            <AspirationRecommendationPanel aspiration={aspiration} onBack={() => {}} />
        );
        expect(await screen.findByText(/取得推薦失敗/)).toBeInTheDocument();
    });
});

const ASP = { id: 'a1', text: '我想睡得更好', domain: '壓力與睡眠', identity: '早睡的人' };
const PAYLOAD = {
    aspiration: ASP, templates: [],
    habits: [
        { id: 'h1', name: '睡前 1 小時不看手機', category: '壓力與睡眠', difficulties: {}, insights: [{ evidence: { studyType: 2, scale: 1, causality: 2, replication: 2 } }] },
        { id: 'h2', name: '泡熱水澡', category: '壓力與睡眠', difficulties: {}, insights: [] },
    ],
};

describe('AspirationRecommendationPanel — Task 4 header + evidence badge', () => {
    beforeEach(() => { global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => PAYLOAD })); });
    afterEach(() => jest.restoreAllMocks());

    it('header 顯示嚮往與身分', async () => {
        render(<AspirationRecommendationPanel aspiration={ASP} onBack={() => {}} />);
        expect(await screen.findByText('我想睡得更好')).toBeInTheDocument();
        expect(screen.getByText(/早睡的人/)).toBeInTheDocument();
    });

    it('有已發布佐證的習慣顯示證據力 badge、無佐證的不顯示', async () => {
        render(<AspirationRecommendationPanel aspiration={ASP} onBack={() => {}} />);
        expect(await screen.findByText(/證據力/)).toBeInTheDocument();
        expect(screen.getByText('泡熱水澡')).toBeInTheDocument();
        expect(screen.getAllByText(/證據力/).length).toBe(1);
    });
});
