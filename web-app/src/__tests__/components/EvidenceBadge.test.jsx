import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EvidenceBadge from '../../components/insights/EvidenceBadge';

describe('EvidenceBadge', () => {
  it('無評分時不渲染', () => {
    const { container } = render(<EvidenceBadge evidence={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('strong evidence 顯示「證據力 強」', () => {
    render(<EvidenceBadge evidence={{ studyType: 3, scale: 2, causality: 2, replication: 2 }} />);
    expect(screen.getByText(/證據力 強/)).toBeInTheDocument();
  });

  it('點擊觸發 onClick', () => {
    const onClick = jest.fn();
    render(<EvidenceBadge evidence={{ studyType: 2, scale: 1, causality: 2, replication: 1 }} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
