import { render, screen, fireEvent } from '@testing-library/react';
import FocusMatrix from '../../../components/focusMap/FocusMatrix';

const points = [
  { id: 'a', n: 1, title: '睡前不看手機', impact: 5, ability: 5, quadrant: 'golden',     color: '#ea580c' },
  { id: 'b', n: 2, title: '飯後散步',     impact: 5, ability: 2, quadrant: 'big_fish',   color: '#7c3aed' },
  { id: 'c', n: 3, title: '喝水',         impact: 2, ability: 2, quadrant: 'skip',       color: '#94a3b8' },
];

describe('FocusMatrix', () => {
  test('每個 point 一個圓點', () => {
    const { container } = render(<FocusMatrix points={points} />);
    expect(container.querySelectorAll('[data-dot-id]').length).toBe(3);
  });

  test('圖例列出每個習慣名稱與編號', () => {
    render(<FocusMatrix points={points} />);
    expect(screen.getByText(/睡前不看手機/)).toBeInTheDocument();
    expect(screen.getByText(/飯後散步/)).toBeInTheDocument();
  });

  test('點圓點顯示名稱浮層，再點收合', () => {
    const { container } = render(<FocusMatrix points={points} />);
    const dot = container.querySelector('[data-dot-id="a"]');
    fireEvent.click(dot);
    expect(screen.getByTestId('dot-tip')).toHaveTextContent('睡前不看手機');
    fireEvent.click(dot);
    expect(screen.queryByTestId('dot-tip')).not.toBeInTheDocument();
  });

  test('hover 圓點也顯示名稱浮層', () => {
    const { container } = render(<FocusMatrix points={points} />);
    const dot = container.querySelector('[data-dot-id="b"]');
    fireEvent.mouseEnter(dot);
    expect(screen.getByTestId('dot-tip')).toHaveTextContent('飯後散步');
    fireEvent.mouseLeave(dot);
    expect(screen.queryByTestId('dot-tip')).not.toBeInTheDocument();
  });

  test('空 points 也能渲染（無點）', () => {
    const { container } = render(<FocusMatrix points={[]} />);
    expect(container.querySelectorAll('[data-dot-id]').length).toBe(0);
  });
});
