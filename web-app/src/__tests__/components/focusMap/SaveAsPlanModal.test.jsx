import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SaveAsPlanModal from '../../../components/focusMap/SaveAsPlanModal';

const phases = [
  { id: 'p1', name: '養成期', days: 22, tasks: [{ title: '深蹲' }, { title: '喝水' }] },
  { id: 'p2', name: '進階', days: 22, tasks: [{ title: '深蹲' }] },
];

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, templateId: 't1', reviewStatus: 'pending' }) }));
});
afterEach(() => jest.restoreAllMocks());

const base = { isOpen: true, userId: 'u1', aspirationId: 'a1', defaultName: '睡得更好', previewPlan: { version: '2.0', phases }, onClose: jest.fn(), onSaved: jest.fn() };

describe('SaveAsPlanModal', () => {
  test('預覽階段與習慣', () => {
    render(<SaveAsPlanModal {...base} />);
    expect(screen.getByText(/養成期/)).toBeInTheDocument();
    expect(screen.getByText(/進階/)).toBeInTheDocument();
    expect(screen.getAllByText('深蹲').length).toBeGreaterThanOrEqual(1);
  });

  test('名稱預填、可改', () => {
    render(<SaveAsPlanModal {...base} />);
    expect(screen.getByDisplayValue('睡得更好')).toBeInTheDocument();
  });

  test('申請公開送出呼叫 API 並帶 visibility=public', async () => {
    render(<SaveAsPlanModal {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /申請公開/ }));
    await waitFor(() => {
      const call = global.fetch.mock.calls.find(c => String(c[0]).includes('/api/plans/from-aspiration'));
      expect(call).toBeTruthy();
      expect(JSON.parse(call[1].body).visibility).toBe('public');
      expect(base.onSaved).toHaveBeenCalled();
    });
  });

  test('存為私人帶 visibility=private', async () => {
    render(<SaveAsPlanModal {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /存為私人/ }));
    await waitFor(() => {
      const call = global.fetch.mock.calls.find(c => String(c[0]).includes('/api/plans/from-aspiration'));
      expect(JSON.parse(call[1].body).visibility).toBe('private');
    });
  });
});
