import { render } from '@testing-library/react';
import PolaroidPin from '@/components/journey/landmarks/PolaroidPin';
it('渲染 polaroid-pin group + image 指向 /api/memory/:id 帶 userId', () => {
  const { container } = render(<svg><PolaroidPin id="h123" userId="u9" x={10} y={20} /></svg>);
  const g = container.querySelector('[data-kind="polaroid-pin"]');
  expect(g).toBeTruthy();
  const img = container.querySelector('image');
  expect(img).toBeTruthy();
  const href = img.getAttribute('href') || img.getAttribute('xlink:href');
  expect(href).toContain('/api/memory/h123');
  expect(href).toContain('userId=u9');
});
it('無 userId 時 src 仍含 /api/memory/:id', () => {
  const { container } = render(<svg><PolaroidPin id="h7" /></svg>);
  const img = container.querySelector('image');
  expect(img.getAttribute('href')).toContain('/api/memory/h7');
});
