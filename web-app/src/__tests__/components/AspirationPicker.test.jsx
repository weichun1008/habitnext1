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
        // Switch to the tab that matches the existing aspiration's domain.
        const tab = await screen.findByRole('tab', { name: '壓力與睡眠' });
        fireEvent.click(tab);
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
        // Switch to the 飲食 tab to see '想要 Y'.
        const tab = await screen.findByRole('tab', { name: '飲食' });
        fireEvent.click(tab);
        const btn = await screen.findByText('想要 Y');
        fireEvent.click(btn.closest('button'));
        // 2026-06-03 — selecting a NEW aspiration advances to the identity
        // sub-step; the POST only fires after the user commits it.
        const skipBtn = await screen.findByText('跳過');
        fireEvent.click(skipBtn);
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
        // Switch to the 飲食 tab. Wait for the tab to render first.
        const tab = await screen.findByRole('tab', { name: '飲食' });
        fireEvent.click(tab);
        // Wait for the existing entry to appear (GET must have resolved).
        await screen.findByText('已建立 · 繼續用');
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
        // '想要 X' is in '基因與腸道' which is the default tab — no tab switch needed.
        const btn = await screen.findByText('想要 X');
        fireEvent.click(btn.closest('button'));
        // Advance through the identity sub-step to trigger the (failing) POST.
        fireEvent.click(await screen.findByText('跳過'));
        expect(await screen.findByText(/新增嚮往失敗/)).toBeInTheDocument();
    });
});

describe('AspirationPicker — custom mode', () => {
    test('custom flow: reveals input → requires text → POSTs with source=user using activeTab domain', async () => {
        // '心靈' is a GENESIS_DOMAIN; we'll switch to that tab then enter custom text.
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
        // Switch to the 心靈 tab so customDomain is set to '心靈'.
        const tab = await screen.findByRole('tab', { name: '心靈' });
        fireEvent.click(tab);
        // Click the custom entry button.
        fireEvent.click(await screen.findByText('＋ 自己寫一句嚮往'));
        const input = await screen.findByPlaceholderText('我想…');
        fireEvent.change(input, { target: { value: '自訂目標' } });
        // Without text the submit button is disabled; with text it becomes enabled.
        const goBtn = screen.getByRole('button', { name: '下一步' });
        expect(goBtn).not.toBeDisabled();
        fireEvent.click(goBtn);
        // Custom create also passes through the identity sub-step before POST.
        fireEvent.click(await screen.findByText('跳過'));
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
        // Default tab is '基因與腸道' — click ＋ 自己寫一句嚮往 directly.
        fireEvent.click(await screen.findByText('＋ 自己寫一句嚮往'));
        await screen.findByPlaceholderText('我想…');
        fireEvent.click(screen.getByRole('button', { name: '取消' }));
        expect(screen.queryByPlaceholderText('我想…')).not.toBeInTheDocument();
        // The dashed entry button is back.
        expect(screen.getByText('＋ 自己寫一句嚮往')).toBeInTheDocument();
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

describe('AspirationPicker — 領域 tab', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/aspirations?')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it('渲染領域 tab，切到「飲食」後該 tab 選中且出現自訂入口', async () => {
    render(<AspirationPicker isOpen onClose={()=>{}} userId="u1" onSelectAspiration={()=>{}} />);
    const dietTab = await screen.findByRole('tab', { name: '飲食' });
    fireEvent.click(dietTab);
    expect(dietTab).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('＋ 自己寫一句嚮往')).toBeInTheDocument();
  });
});
