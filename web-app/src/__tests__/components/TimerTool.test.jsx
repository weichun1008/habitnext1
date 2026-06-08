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

it('pomodoro 模式經歷 專注→休息→完成，且 onComplete 只在最後呼叫一次', () => {
  const onComplete = jest.fn();
  render(
    <TimerTool
      config={{ seconds: 2, mode: 'pomodoro', rounds: 1, breakSeconds: 2 }}
      onComplete={onComplete}
    />
  );

  // 起始為專注階段
  expect(screen.getByText('專注')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /開始|start/i }));

  // 走完 2 秒專注 → 進入休息階段
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(screen.getByText('休息')).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();

  // 走完 2 秒休息 → 唯一一輪結束 → 完成
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(onComplete).toHaveBeenCalledTimes(1);

  // 不會重複呼叫
  act(() => {
    jest.advanceTimersByTime(4000);
  });
  expect(onComplete).toHaveBeenCalledTimes(1);
});
