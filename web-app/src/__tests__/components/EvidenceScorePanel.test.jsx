import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EvidenceScorePanel from '../../components/insights/EvidenceScorePanel';

const evidence = { studyType: 2, scale: 1, causality: 2, replication: 1 }; // 進食順序 → 6 中

describe('EvidenceScorePanel', () => {
  it('無評分時不渲染', () => {
    const { container } = render(<EvidenceScorePanel evidence={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('顯示 4 個面向標籤與總分', () => {
    render(<EvidenceScorePanel evidence={evidence} />);
    expect(screen.getByText('研究類型')).toBeInTheDocument();
    expect(screen.getByText('對象與規模')).toBeInTheDocument();
    expect(screen.getByText('因果強度')).toBeInTheDocument();
    expect(screen.getByText('重複驗證')).toBeInTheDocument();
    expect(screen.getByText(/6 \/ 9/)).toBeInTheDocument();
  });

  it('點「了解我們怎麼評分」開啟 rubric modal', () => {
    render(<EvidenceScorePanel evidence={evidence} />);
    expect(screen.queryByText('我們怎麼評證據力')).toBeNull();
    fireEvent.click(screen.getByText(/了解我們怎麼評分/));
    expect(screen.getByText('我們怎麼評證據力')).toBeInTheDocument();
  });
});
