import { render, screen, fireEvent } from '@testing-library/react';
import WorldOverview from '@/components/journey/WorldOverview';
const cities = [
  { city:'台北', total:40, tier:'city' },
  { city:'東京', total:8, tier:'village' },
];
it('每個城市可點，點擊回呼 city 名', () => {
  const onSelect = jest.fn();
  const { container } = render(<WorldOverview cities={cities} onSelectCity={onSelect} />);
  expect(container.querySelectorAll('[data-city]').length).toBe(2);
  fireEvent.click(container.querySelector('[data-city="東京"]'));
  expect(onSelect).toHaveBeenCalledWith('東京');
});
it('空陣列 → null', () => {
  const { container } = render(<WorldOverview cities={[]} onSelectCity={() => {}} />);
  expect(container.firstChild).toBeNull();
});
