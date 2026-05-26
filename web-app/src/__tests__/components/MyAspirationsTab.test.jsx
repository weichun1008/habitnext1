import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MyAspirationsTab from '../../components/profile/MyAspirationsTab';

const row = (overrides = {}) => ({
    id: 'a1',
    text: '想要好好睡覺',
    domain: '壓力與睡眠',
    status: 'active',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 days ago
    _count: { habits: 3 },
    ...overrides,
});

function mockFetchSequence(handlers) {
    let i = 0;
    global.fetch = jest.fn(async (...args) => {
        const h = handlers[i++] || handlers[handlers.length - 1];
        return h(...args);
    });
}

beforeEach(() => {
    // suppress jsdom alert / confirm dialogs that the component triggers.
    window.confirm = jest.fn(() => true);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('MyAspirationsTab — render', () => {
    test('shows loading then list', async () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [row()] })]);
        render(<MyAspirationsTab userId="u1" />);
        expect(screen.getByText(/載入中/)).toBeInTheDocument();
        expect(await screen.findByText('想要好好睡覺')).toBeInTheDocument();
        expect(screen.getByText(/掛 3 個任務/)).toBeInTheDocument();
        expect(screen.getByText('14 天前')).toBeInTheDocument();
    });

    test('hides archived rows (v1: filter toggle is v2 territory)', async () => {
        const data = [
            row({ id: 'a1', text: '活著的', status: 'active' }),
            row({ id: 'a2', text: '封存的', status: 'archived' }),
            row({ id: 'a3', text: '完成的', status: 'achieved' }),
        ];
        mockFetchSequence([async () => ({ ok: true, json: async () => data })]);
        render(<MyAspirationsTab userId="u1" />);
        expect(await screen.findByText('活著的')).toBeInTheDocument();
        expect(screen.getByText('完成的')).toBeInTheDocument();
        expect(screen.queryByText('封存的')).not.toBeInTheDocument();
    });

    test('empty state copy when no rows', async () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [] })]);
        render(<MyAspirationsTab userId="u1" />);
        expect(await screen.findByText(/還沒有嚮往/)).toBeInTheDocument();
    });

    test('error state when fetch fails', async () => {
        mockFetchSequence([async () => ({ ok: false, status: 500, json: async () => ({}) })]);
        render(<MyAspirationsTab userId="u1" />);
        expect(await screen.findByText(/取得嚮往失敗/)).toBeInTheDocument();
    });
});

describe('MyAspirationsTab — actions', () => {
    test('標記達成 PATCHes status=achieved + reloads', async () => {
        const before = row({ status: 'active' });
        const after = { ...before, status: 'achieved' };
        mockFetchSequence([
            async () => ({ ok: true, json: async () => [before] }),  // initial GET
            async () => ({ ok: true, json: async () => after }),     // PATCH
            async () => ({ ok: true, json: async () => [after] }),   // reload GET
        ]);
        render(<MyAspirationsTab userId="u1" />);
        const btn = await screen.findByText('標記達成');
        fireEvent.click(btn);
        await waitFor(() => expect(screen.queryByText('標記達成')).not.toBeInTheDocument());
        // PATCH body had achievedAt + achieved.
        const patchCall = global.fetch.mock.calls[1];
        expect(patchCall[1].method).toBe('PATCH');
        const body = JSON.parse(patchCall[1].body);
        expect(body.status).toBe('achieved');
        expect(typeof body.achievedAt).toBe('string');
    });

    test('封存 PATCHes status=archived and the row disappears', async () => {
        const before = row({ status: 'active' });
        const after = { ...before, status: 'archived' };
        mockFetchSequence([
            async () => ({ ok: true, json: async () => [before] }),
            async () => ({ ok: true, json: async () => after }),
            async () => ({ ok: true, json: async () => [after] }),
        ]);
        render(<MyAspirationsTab userId="u1" />);
        await screen.findByText('想要好好睡覺');
        fireEvent.click(screen.getByText('封存'));
        // After reload + client-side archived filter, the row vanishes.
        await waitFor(() => expect(screen.queryByText('想要好好睡覺')).not.toBeInTheDocument());
        const patchCall = global.fetch.mock.calls[1];
        const body = JSON.parse(patchCall[1].body);
        expect(body.status).toBe('archived');
    });

    test('刪除 confirms, fires DELETE, and removes the row', async () => {
        const before = row();
        mockFetchSequence([
            async () => ({ ok: true, json: async () => [before] }),
            async () => ({ ok: true, json: async () => ({ success: true }) }), // DELETE
            async () => ({ ok: true, json: async () => [] }),                  // reload
        ]);
        render(<MyAspirationsTab userId="u1" />);
        await screen.findByText('想要好好睡覺');
        fireEvent.click(screen.getByText('刪除'));
        expect(window.confirm).toHaveBeenCalled();
        await waitFor(() => expect(screen.queryByText('想要好好睡覺')).not.toBeInTheDocument());
        const deleteCall = global.fetch.mock.calls[1];
        expect(deleteCall[1].method).toBe('DELETE');
    });

    test('刪除 aborts when user cancels confirm', async () => {
        window.confirm = jest.fn(() => false);
        mockFetchSequence([async () => ({ ok: true, json: async () => [row()] })]);
        render(<MyAspirationsTab userId="u1" />);
        await screen.findByText('想要好好睡覺');
        fireEvent.click(screen.getByText('刪除'));
        // Only the initial GET fired.
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(screen.getByText('想要好好睡覺')).toBeInTheDocument();
    });
});

describe('MyAspirationsTab — achieved rows', () => {
    test('achieved row does not show 標記達成 button', async () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [row({ status: 'achieved' })] })]);
        render(<MyAspirationsTab userId="u1" />);
        await screen.findByText('想要好好睡覺');
        expect(screen.queryByText('標記達成')).not.toBeInTheDocument();
        // Archive + delete still available.
        expect(screen.getByText('封存')).toBeInTheDocument();
        expect(screen.getByText('刪除')).toBeInTheDocument();
    });
});
