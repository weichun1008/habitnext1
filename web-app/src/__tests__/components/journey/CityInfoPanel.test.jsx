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
it('有 hasPhoto pin → 顯示美食回憶數', () => {
  const cityData = { city:'台北', total:5, tier:'village',
    domains:[], otherCount:0,
    pins:[{ id:'h1', date:'06-01', domain:'飲食', title:'拉麵', hasPhoto:true }] };
  render(<CityInfoPanel cityData={cityData} userId="u1" />);
  expect(screen.getByText(/個美食回憶/)).toBeInTheDocument();
});
it('無 hasPhoto pin → 不顯示美食回憶數', () => {
  const cityData = { city:'台北', total:5, tier:'village',
    domains:[], otherCount:0,
    pins:[{ id:'h2', date:'06-01', domain:'運動', title:'跑步', hasPhoto:false }] };
  render(<CityInfoPanel cityData={cityData} userId="u1" />);
  expect(screen.queryByText(/個美食回憶/)).not.toBeInTheDocument();
});
