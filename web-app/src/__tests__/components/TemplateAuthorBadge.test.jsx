import { render, screen } from '@testing-library/react';
import AuthorBadge from '../../components/templates/AuthorBadge';

describe('AuthorBadge', () => {
  test('user-authored shows 用戶自創 + author name', () => {
    render(<AuthorBadge template={{ authorType: 'user', authorName: '小明' }} />);
    expect(screen.getByText(/用戶自創/)).toBeInTheDocument();
    expect(screen.getByText(/小明/)).toBeInTheDocument();
  });
  test('official shows 官方', () => {
    render(<AuthorBadge template={{ authorType: 'official', expert: { name: '王醫師' } }} />);
    expect(screen.getByText(/官方/)).toBeInTheDocument();
  });
});
