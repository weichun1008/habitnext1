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

    test('shows loading then renders header with aspiration text + domain', async () => {
        mockFetchOk({ templates: [], habits: [] });
        render(
            <AspirationRecommendationPanel aspiration={aspiration} onBack={() => {}} />
        );
        expect(screen.getByText(/載入推薦中/)).toBeInTheDocument();
        expect(await screen.findByText('想要好好睡覺')).toBeInTheDocument();
        expect(screen.getByText('壓力與睡眠')).toBeInTheDocument();
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

    test('clicking a habit card calls onPickHabit with (habit, aspiration)', async () => {
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
        const card = await screen.findByText('習慣一');
        fireEvent.click(card.closest('button'));
        await waitFor(() => expect(onPickHabit).toHaveBeenCalledWith(habit, aspiration));
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
