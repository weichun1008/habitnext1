import { render, screen, fireEvent } from '@testing-library/react';
import MemoryCapture from '@/components/journey/MemoryCapture';

it('未附照片 → 顯示「記錄這餐」，點擊觸發檔案選擇 + 選檔回呼', () => {
  const onAttach = jest.fn();
  const { container } = render(<MemoryCapture hasPhoto={false} onAttach={onAttach} />);
  expect(screen.getByText(/記錄這餐/)).toBeInTheDocument();
  const input = container.querySelector('input[type="file"]');
  expect(input).toBeTruthy();
  const file = new File(['x'], 'meal.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [file] } });
  expect(onAttach).toHaveBeenCalledWith(file);
});
it('已附照片 → 顯示已收進旅程', () => {
  render(<MemoryCapture hasPhoto={true} onAttach={() => {}} />);
  expect(screen.getByText(/已收進旅程/)).toBeInTheDocument();
});
it('busy → 顯示收進中且按鈕停用', () => {
  render(<MemoryCapture hasPhoto={false} busy={true} onAttach={() => {}} />);
  expect(screen.getByText(/收進旅程中/)).toBeInTheDocument();
  expect(screen.getByRole('button')).toBeDisabled();
});
