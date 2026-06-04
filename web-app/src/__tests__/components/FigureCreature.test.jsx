import { render } from '@testing-library/react';
import FigureCreature from '@/components/worlds/FigureCreature';

it('渲染公仔 SVG（有 aria-label 公仔夥伴）', () => {
  const { container } = render(<FigureCreature size={48} />);
  const svg = container.querySelector('svg[aria-label="公仔夥伴"]');
  expect(svg).toBeTruthy();
  expect(svg.getAttribute('width')).toBe('48');
});

it('不同 stage props 都能渲染出 svg（stage 1 與 stage 6）', () => {
  const { container: c1 } = render(<FigureCreature stage={1} />);
  expect(c1.querySelector('svg[aria-label="公仔夥伴"]')).toBeTruthy();

  const { container: c6 } = render(<FigureCreature stage={6} />);
  expect(c6.querySelector('svg[aria-label="公仔夥伴"]')).toBeTruthy();
});

it('超出範圍的 stage 不會 crash', () => {
  const { container: cLow } = render(<FigureCreature stage={-3} />);
  expect(cLow.querySelector('svg')).toBeTruthy();

  const { container: cHigh } = render(<FigureCreature stage={99} />);
  expect(cHigh.querySelector('svg')).toBeTruthy();
});
