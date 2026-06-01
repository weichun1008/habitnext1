import { render } from '@testing-library/react';
import CityScene from '@/components/journey/CityScene';
const cityData = { city:'台北', total:70, tier:'metropolis',
  domains:[{domain:'運動',count:70,flagshipLevel:3,buildingCount:2}], otherCount:0, pins:[] };
it('渲染地面 + flagship + building 數量正確', () => {
  const { container } = render(<CityScene cityData={cityData} />);
  expect(container.querySelectorAll('[data-kind="flagship"]').length).toBe(1);
  expect(container.querySelectorAll('[data-kind="building"]').length).toBe(2);
});
