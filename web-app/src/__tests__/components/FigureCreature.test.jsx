import { render } from '@testing-library/react';
import FigureCreature from '@/components/worlds/FigureCreature';

it('渲染公仔 SVG（有 aria-label 公仔夥伴）', () => {
  const { container } = render(<FigureCreature size={48} />);
  const svg = container.querySelector('svg[aria-label="公仔夥伴"]');
  expect(svg).toBeTruthy();
  expect(svg.getAttribute('width')).toBe('48');
});
