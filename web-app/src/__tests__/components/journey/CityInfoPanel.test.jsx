import { render, screen } from '@testing-library/react';
import CityInfoPanel from '@/components/journey/CityInfoPanel';
it('顯示城市名、階級、進度、領域', () => {
  const cityData = { city:'台北', total:5, tier:'village',
    domains:[{domain:'運動',count:5,flagshipLevel:1,buildingCount:1}], otherCount:0, pins:[] };
  render(<CityInfoPanel cityData={cityData} />);
  expect(screen.getByText('台北')).toBeInTheDocument();
  expect(screen.getByText(/村莊/)).toBeInTheDocument();
  expect(screen.getByText(/再 5 次升城鎮/)).toBeInTheDocument();
  expect(screen.getByText('運動')).toBeInTheDocument();
});
