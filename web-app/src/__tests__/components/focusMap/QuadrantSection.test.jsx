import { render, screen, fireEvent } from '@testing-library/react';
import QuadrantSection from '../../../components/focusMap/QuadrantSection';

const golden = [
  { id: 'a', n: 1, title: '睡前不看手機' },
  { id: 'b', n: 2, title: '飯後散步' },
];

describe('QuadrantSection', () => {
  test('顯示象限名稱與白話說明（無 Fogg）', () => {
    render(<QuadrantSection quadrantKey="golden" items={golden} addedSet={new Set(['a'])} onToggle={() => {}} />);
    expect(screen.getByText('值得優先做')).toBeInTheDocument();
    expect(screen.getByText(/最划算/)).toBeInTheDocument();
    expect(screen.queryByText(/Fogg/i)).not.toBeInTheDocument();
  });

  test('已加入顯示「已加入」、未加入顯示「加入」', () => {
    render(<QuadrantSection quadrantKey="golden" items={golden} addedSet={new Set(['a'])} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /已加入/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '加入' })).toBeInTheDocument();
  });

  test('skip 象限未加入時文字為「仍要加入」且可點', () => {
    const onToggle = jest.fn();
    render(<QuadrantSection quadrantKey="skip" items={[{ id: 'c', n: 3, title: '喝水' }]} addedSet={new Set()} onToggle={onToggle} />);
    const btn = screen.getByRole('button', { name: /仍要加入/ });
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith('c');
  });

  test('items 為空時不渲染', () => {
    const { container } = render(<QuadrantSection quadrantKey="golden" items={[]} addedSet={new Set()} onToggle={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
