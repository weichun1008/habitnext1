import { render, screen } from '@testing-library/react';
import JourneyView from '@/components/journey/JourneyView';
it('loading → skeleton (無城市內容)', () => {
  const { container } = render(<JourneyView data={null} trackLocationOn={true} loading={true} onOpenSettings={()=>{}} />);
  expect(container.querySelector('.animate-pulse')).toBeTruthy();
});
it('無城市 → 空狀態', () => {
  render(<JourneyView data={{ homeCity:null, cities:[] }} trackLocationOn={false} loading={false} onOpenSettings={()=>{}} />);
  expect(screen.getAllByText(/開始建造|記錄完成地點/)[0]).toBeInTheDocument();
});
it('單城市 → 直接顯示城市（有 svg）', () => {
  const data = { homeCity:'台北', cities:[{ city:'台北', total:5, tier:'village', domains:[], otherCount:0, pins:[] }] };
  const { container } = render(<JourneyView data={data} trackLocationOn={true} loading={false} onOpenSettings={()=>{}} />);
  expect(container.querySelector('svg')).toBeTruthy();
  expect(screen.getByText('台北')).toBeInTheDocument();
});
it('多城市 → 有城市切換 pill', () => {
  const data = { homeCity:'台北', cities:[
    { city:'台北', total:40, tier:'city', domains:[], otherCount:0, pins:[] },
    { city:'東京', total:8, tier:'village', domains:[], otherCount:0, pins:[] },
  ]};
  render(<JourneyView data={data} trackLocationOn={true} loading={false} onOpenSettings={()=>{}} />);
  expect(screen.getAllByText('東京')[0]).toBeInTheDocument();
});
