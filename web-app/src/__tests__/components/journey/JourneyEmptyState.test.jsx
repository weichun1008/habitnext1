import { render, screen, fireEvent } from '@testing-library/react';
import JourneyEmptyState from '@/components/journey/JourneyEmptyState';
it('未開啟 → 顯示開啟引導 + 按鈕回呼', () => {
  const onOpen = jest.fn();
  render(<JourneyEmptyState trackLocationOn={false} onOpenSettings={onOpen} />);
  expect(screen.getByText(/開始建造/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(onOpen).toHaveBeenCalled();
});
it('已開啟但無資料 → 顯示等待文案，無設定按鈕', () => {
  render(<JourneyEmptyState trackLocationOn={true} onOpenSettings={() => {}} />);
  expect(screen.getByText(/正在等待/)).toBeInTheDocument();
  expect(screen.queryByRole('button')).toBeNull();
});
