import { render, screen, act, fireEvent } from '@testing-library/react';
import TimerTool from '@/components/tools/TimerTool';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

it('count 模式初始顯示倒數 00:03', () => {
  render(<TimerTool config={{ seconds: 3, mode: 'count' }} onComplete={() => {}} />);
  expect(screen.getByText('00:03')).toBeTruthy();
});

it('count 模式 Start 後前進 3 秒到 00:00 並呼叫 onComplete 一次', () => {
  const onComplete = jest.fn();
  render(<TimerTool config={{ seconds: 3, mode: 'count' }} onComplete={onComplete} />);

  fireEvent.click(screen.getByRole('button', { name: /開始|start/i }));

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  expect(screen.getByText('00:00')).toBeTruthy();
  expect(onComplete).toHaveBeenCalledTimes(1);

  // 不會重複呼叫
  act(() => {
    jest.advanceTimersByTime(3000);
  });
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it('pomodoro 模式顯示「專注」階段指示', () => {
  render(
    <TimerTool config={{ seconds: 2, mode: 'pomodoro', rounds: 1 }} onComplete={() => {}} />
  );
  expect(screen.getByText('專注')).toBeTruthy();
});
