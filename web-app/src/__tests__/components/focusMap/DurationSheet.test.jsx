import { render, screen, fireEvent } from '@testing-library/react';
import DurationSheet from '../../../components/focusMap/DurationSheet';

const props = () => ({ value: 66, onPick: jest.fn(), onConfirm: jest.fn(), onClose: jest.fn() });

describe('DurationSheet', () => {
  test('顯示四個養成期間選項與推薦標記', () => {
    render(<DurationSheet {...props()} />);
    expect(screen.getByText('21 天')).toBeInTheDocument();
    expect(screen.getByText('66 天')).toBeInTheDocument();
    expect(screen.getByText('90 天')).toBeInTheDocument();
    expect(screen.getByText('不設限')).toBeInTheDocument();
    expect(screen.getByText('推薦')).toBeInTheDocument();
  });

  test('點選選項呼叫 onPick(value)', () => {
    const p = props();
    render(<DurationSheet {...p} />);
    fireEvent.click(screen.getByText('90 天'));
    expect(p.onPick).toHaveBeenCalledWith(90);
  });

  test('背後科學預設收合，點連結才展開', () => {
    render(<DurationSheet {...props()} />);
    expect(screen.queryByText(/平均約需/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /背後科學/ }));
    expect(screen.getByText(/平均約需/)).toBeInTheDocument();
  });

  test('確認加入呼叫 onConfirm', () => {
    const p = props();
    render(<DurationSheet {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /確認加入/ }));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
  });
});
