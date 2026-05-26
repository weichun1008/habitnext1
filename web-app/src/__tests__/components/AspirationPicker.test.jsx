import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AspirationPicker from '../../components/AspirationPicker';

// Mock the preset JSON to make assertions deterministic. The real file has 32
// entries across 9 domains; here a 3-entry slice is enough to exercise
// rendering + picking without coupling to real preset text.
jest.mock('../../../prisma/seed/preset-aspirations.json', () => ([
    { text: '想要 X', domain: '基因與腸道' },
    { text: '想要 Y', domain: '飲食' },
    { text: '想要 Z', domain: '壓力與睡眠' },
]), { virtual: true });

const flushPromises = () => new Promise(r => setTimeout(r, 0));

function mockFetchSequence(handlers) {
    let i = 0;
    global.fetch = jest.fn(async (...args) => {
        const h = handlers[i++] || handlers[handlers.length - 1];
        return h(...args);
    });
}

afterEach(() => {
    jest.restoreAllMocks();
});

describe('AspirationPicker — initial render', () => {
    test('renders nothing when isOpen is false', () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [] })]);
        const { container } = render(
            <AspirationPicker isOpen={false} onClose={() => {}} userId="u1" onSelectAspiration={() => {}} />
        );
        expect(container.firstChild).toBeNull();
    });

    test('renders header + preset section with all 3 domain headings', async () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [] })]);
        render(<AspirationPicker isOpen userId="u1" onClose={() => {}} onSelectAspiration={() => {}} />);
        expect(screen.getByText('你想要什麼？')).toBeInTheDocument();
        // Domain headings — at minimum the three with presets in the mocked fixture.
        expect(await screen.findByText('基因與腸道')).toBeInTheDocument();
        expect(screen.getByText('飲食')).toBeInTheDocument();
        expect(screen.getByText('壓力與睡眠')).toBeInTheDocument();
    });

    test('does not render 為你推薦 section when neither typeKey nor sleepTypeKey is set', async () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [] })]);
        render(<AspirationPicker isOpen userId="u1" onClose={() => {}} onSelectAspiration={() => {}} />);
        await flushPromises();
        expect(screen.queryByText('為你推薦')).not.toBeInTheDocument();
    });

    test('renders 為你推薦 section when sleepTypeKey is set', async () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [] })]);
        render(
            <AspirationPicker
                isOpen
                userId="u1"
                userSleepTypeKey="stress"
                onClose={() => {}}
                onSelectAspiration={() => {}}
            />
        );
        expect(await screen.findByText('為你推薦')).toBeInTheDocument();
    });
});

describe('AspirationPicker — existing aspirations', () => {
    test('renders existing section + reuses the row on click (no POST)', async () => {
        const existing = [
            { id: 'a1', text: '想要好好睡覺', domain: '壓力與睡眠', _count: { habits: 3 } },
        ];
        mockFetchSequence([async () => ({ ok: true, json: async () => existing })]);
        const onSelectAspiration = jest.fn();
        render(
            <AspirationPicker
                isOpen
                userId="u1"
                onClose={() => {}}
                onSelectAspiration={onSelectAspiration}
            />
        );
        const btn = await screen.findByText('想要好好睡覺');
        fireEvent.click(btn.closest('button'));
        expect(onSelectAspiration).toHaveBeenCalledWith(existing[0]);
        // POST never fires for the reuse path.
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});

describe('AspirationPicker — preset POST', () => {
    test('clicking a preset POSTs and forwards the created row to onSelectAspiration', async () => {
        const created = { id: 'new1', text: '想要 Y', domain: '飲食', source: 'preset' };
        mockFetchSequence([
            async () => ({ ok: true, json: async () => [] }),       // GET existing
            async () => ({ ok: true, json: async () => created }),  // POST create
        ]);
        const onSelectAspiration = jest.fn();
        render(
            <AspirationPicker
                isOpen
                userId="u1"
                onClose={() => {}}
                onSelectAspiration={onSelectAspiration}
            />
        );
        const btn = await screen.findByText('想要 Y');
        fireEvent.click(btn.closest('button'));
        await waitFor(() => expect(onSelectAspiration).toHaveBeenCalledWith(created));
        // Second fetch was the POST.
        const postCall = global.fetch.mock.calls[1];
        expect(postCall[0]).toBe('/api/aspirations');
        expect(postCall[1].method).toBe('POST');
        const body = JSON.parse(postCall[1].body);
        expect(body).toMatchObject({ userId: 'u1', text: '想要 Y', domain: '飲食', source: 'preset' });
    });

    test('duplicate text on existing row skips POST and forwards the existing row', async () => {
        const existing = [
            { id: 'exist', text: '想要 Y', domain: '飲食', _count: { habits: 1 } },
        ];
        mockFetchSequence([async () => ({ ok: true, json: async () => existing })]);
        const onSelectAspiration = jest.fn();
        render(
            <AspirationPicker
                isOpen
                userId="u1"
                onClose={() => {}}
                onSelectAspiration={onSelectAspiration}
            />
        );
        // Wait for the existing-section to render — otherwise the preset
        // click happens BEFORE the GET resolves, the dup-check sees an empty
        // list, and falls through to POST.
        await screen.findByText(/已有的嚮往/);
        const presetButtons = screen.getAllByText('想要 Y');
        expect(presetButtons.length).toBeGreaterThan(1); // existing + preset
        // Click the preset catalogue version (the last one in DOM order).
        fireEvent.click(presetButtons[presetButtons.length - 1].closest('button'));
        await waitFor(() => expect(onSelectAspiration).toHaveBeenCalledWith(existing[0]));
        // POST never fired.
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('surfaces an error message when POST fails', async () => {
        mockFetchSequence([
            async () => ({ ok: true, json: async () => [] }),
            async () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }),
        ]);
        render(
            <AspirationPicker
                isOpen
                userId="u1"
                onClose={() => {}}
                onSelectAspiration={() => {}}
            />
        );
        const btn = await screen.findByText('想要 X');
        fireEvent.click(btn.closest('button'));
        expect(await screen.findByText(/新增嚮往失敗/)).toBeInTheDocument();
    });
});

describe('AspirationPicker — custom mode', () => {
    test('custom flow: reveals input → requires text + domain → POSTs with source=user', async () => {
        const created = { id: 'cust1', text: '自訂目標', domain: '心靈', source: 'user' };
        mockFetchSequence([
            async () => ({ ok: true, json: async () => [] }),
            async () => ({ ok: true, json: async () => created }),
        ]);
        const onSelectAspiration = jest.fn();
        render(
            <AspirationPicker
                isOpen
                userId="u1"
                onClose={() => {}}
                onSelectAspiration={onSelectAspiration}
            />
        );
        fireEvent.click(screen.getByText(/自訂嚮往/));
        const input = await screen.findByPlaceholderText(/你想要什麼/);
        fireEvent.change(input, { target: { value: '自訂目標' } });
        // Without a domain pick, the 繼續 button stays disabled.
        const goBtn = screen.getByRole('button', { name: /繼續/ });
        expect(goBtn).toBeDisabled();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '心靈' } });
        expect(goBtn).not.toBeDisabled();
        fireEvent.click(goBtn);
        await waitFor(() => expect(onSelectAspiration).toHaveBeenCalledWith(created));
        const postCall = global.fetch.mock.calls[1];
        const body = JSON.parse(postCall[1].body);
        expect(body).toMatchObject({ text: '自訂目標', domain: '心靈', source: 'user' });
    });

    test('cancel returns to the default custom button state', async () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [] })]);
        render(
            <AspirationPicker
                isOpen
                userId="u1"
                onClose={() => {}}
                onSelectAspiration={() => {}}
            />
        );
        fireEvent.click(screen.getByText(/自訂嚮往/));
        await screen.findByPlaceholderText(/你想要什麼/);
        fireEvent.click(screen.getByText('取消'));
        expect(screen.queryByPlaceholderText(/你想要什麼/)).not.toBeInTheDocument();
        // The dashed entry button is back.
        expect(screen.getByText(/自訂嚮往/)).toBeInTheDocument();
    });
});

describe('AspirationPicker — close', () => {
    test('clicking X calls onClose', async () => {
        mockFetchSequence([async () => ({ ok: true, json: async () => [] })]);
        const onClose = jest.fn();
        render(
            <AspirationPicker isOpen userId="u1" onClose={onClose} onSelectAspiration={() => {}} />
        );
        fireEvent.click(screen.getByLabelText('關閉'));
        expect(onClose).toHaveBeenCalled();
    });
});
