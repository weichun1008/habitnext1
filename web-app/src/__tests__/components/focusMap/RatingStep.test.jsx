import { render, screen, fireEvent } from '@testing-library/react';
import RatingStep from '../../../components/focusMap/RatingStep';

const base = {
  habitTitle: '睡前 1 小時不看手機',
  index: 0, total: 3, value: 3,
  onChange: jest.fn(), onPrev: jest.fn(), onNext: jest.fn(),
};

describe('RatingStep', () => {
  beforeEach(() => jest.clearAllMocks());

  test('影響力步驟顯示問句與進度', () => {
    render(<RatingStep phase="impact" {...base} />);
    expect(screen.getByText(/影響有多大/)).toBeInTheDocument();
    expect(screen.getByText(/第一步 · 影響力/)).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  test('執行度步驟顯示不同問句', () => {
    render(<RatingStep phase="ability" {...base} />);
    expect(screen.getByText(/有多容易做到/)).toBeInTheDocument();
    expect(screen.getByText(/第二步 · 執行度/)).toBeInTheDocument();
  });

  test('拖動刻度呼叫 onChange，但不會自動前進', () => {
    render(<RatingStep phase="impact" {...base} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '5' } });
    expect(base.onChange).toHaveBeenCalledWith(5);
    expect(base.onNext).not.toHaveBeenCalled();
  });

  test('按「下一個」才呼叫 onNext', () => {
    render(<RatingStep phase="impact" {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /下一個/ }));
    expect(base.onNext).toHaveBeenCalledTimes(1);
  });

  test('第一題不顯示「上一個」', () => {
    render(<RatingStep phase="impact" {...base} index={0} />);
    expect(screen.queryByRole('button', { name: /上一個/ })).not.toBeInTheDocument();
  });

  test('非第一題顯示「上一個」並可呼叫 onPrev', () => {
    render(<RatingStep phase="impact" {...base} index={1} />);
    fireEvent.click(screen.getByRole('button', { name: /上一個/ }));
    expect(base.onPrev).toHaveBeenCalledTimes(1);
  });

  test('最後一題（執行度）下一步文字為「看焦點地圖」', () => {
    render(<RatingStep phase="ability" {...base} index={2} total={3} />);
    expect(screen.getByRole('button', { name: /看焦點地圖/ })).toBeInTheDocument();
  });
});
