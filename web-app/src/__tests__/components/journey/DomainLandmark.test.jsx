import { render } from '@testing-library/react';
import DomainLandmark from '@/components/journey/landmarks/DomainLandmark';
it('給 domain+level 渲染對應 SVG group（有 data-domain/data-level）', () => {
  const { container } = render(<svg><DomainLandmark domain="運動" level={3} x={0} y={0} /></svg>);
  const g = container.querySelector('[data-domain="運動"]');
  expect(g).toBeTruthy();
  expect(g.getAttribute('data-level')).toBe('3');
});
it('未知 domain → 不爆，渲染通用 fallback', () => {
  const { container } = render(<svg><DomainLandmark domain="other" level={1} x={0} y={0} /></svg>);
  expect(container.querySelector('svg')).toBeTruthy();
});
