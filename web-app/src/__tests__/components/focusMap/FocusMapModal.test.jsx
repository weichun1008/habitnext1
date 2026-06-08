import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FocusMapModal from '../../../components/FocusMapModal';

const candidates = [
  { id: 'a', title: '睡前不看手機', officialHabit: { impact: 5, ability: 5 } },
  { id: 'b', title: '飯後散步',     officialHabit: { impact: 5, ability: 2 } },
];

beforeEach(() => {
  global.fetch = jest.fn((url, opts) => {
    if (String(url).includes('/api/tasks/candidates')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(candidates) });
    }
    if (String(url).includes('/api/tasks/batch-rate')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, counts: { activate: 1 } }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});
afterEach(() => jest.restoreAllMocks());

async function advanceAllRatings() {
  // 影響力 2 題 + 執行度 2 題 = 4 次「下一個/看焦點地圖」
  for (let i = 0; i < 4; i++) {
    const btn = await screen.findByRole('button', { name: /下一個|看焦點地圖/ });
    fireEvent.click(btn);
  }
}

describe('FocusMapModal — 三階段', () => {
  test('開啟後先進入影響力階段', async () => {
    render(<FocusMapModal isOpen userId="u1" onClose={() => {}} onActivated={() => {}} />);
    expect(await screen.findByText(/第一步 · 影響力/)).toBeInTheDocument();
    expect(screen.queryByText(/Fogg/i)).not.toBeInTheDocument();
  });

  test('評完影響力進入執行度', async () => {
    render(<FocusMapModal isOpen userId="u1" onClose={() => {}} onActivated={() => {}} />);
    await screen.findByText(/第一步 · 影響力/);
    fireEvent.click(screen.getByRole('button', { name: /下一個/ }));
    fireEvent.click(screen.getByRole('button', { name: /下一個/ }));
    expect(await screen.findByText(/第二步 · 執行度/)).toBeInTheDocument();
  });

  test('全部評完進入焦點地圖（顯示矩陣與 CTA）', async () => {
    render(<FocusMapModal isOpen userId="u1" onClose={() => {}} onActivated={() => {}} />);
    await screen.findByText(/第一步 · 影響力/);
    await advanceAllRatings();
    expect(await screen.findByText('你的焦點地圖')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /加入 .* 個習慣/ })).toBeInTheDocument();
  });

  test('CTA→確認加入會呼叫 batch-rate 並回呼 onActivated', async () => {
    const onActivated = jest.fn();
    render(<FocusMapModal isOpen userId="u1" onClose={() => {}} onActivated={onActivated} />);
    await screen.findByText(/第一步 · 影響力/);
    await advanceAllRatings();
    fireEvent.click(await screen.findByRole('button', { name: /加入 .* 個習慣/ }));
    fireEvent.click(await screen.findByRole('button', { name: /確認加入/ }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks/batch-rate', expect.objectContaining({ method: 'PATCH' }));
      expect(onActivated).toHaveBeenCalled();
    });
    const call = global.fetch.mock.calls.find(c => String(c[0]).includes('batch-rate'));
    const body = JSON.parse(call[1].body);
    // 結帳語意：每筆只會是 activate 或 archive，沒被加入的一律歸檔以清空候選池。
    expect(body.ratings.every(r => r.action === 'activate' || r.action === 'archive')).toBe(true);
    expect(body.ratings.some(r => r.action === 'archive')).toBe(true);
  });
});
