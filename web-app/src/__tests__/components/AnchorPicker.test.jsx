import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AnchorPicker from '../../components/explore/AnchorPicker';

const yourTasks = [
  { id: 't1', title: '喝水', isLocked: false },
  { id: 't2', title: '跑步', isLocked: false },
];

describe('AnchorPicker', () => {
  it('renders "你的習慣" section when yourTasks has active items', () => {
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={yourTasks} />);
    expect(screen.getByText(/你的習慣/)).toBeInTheDocument();
    expect(screen.getByText('喝水')).toBeInTheDocument();
    expect(screen.getByText('跑步')).toBeInTheDocument();
  });

  it('hides "你的習慣" section when yourTasks is empty', () => {
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={[]} />);
    expect(screen.queryByText(/你的習慣/)).not.toBeInTheDocument();
  });

  it('always renders "生活時刻" section with curated moments grouped by time of day', () => {
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={[]} />);
    expect(screen.getByText('生活時刻')).toBeInTheDocument();
    // subsection headers exist
    expect(screen.getByText('早晨')).toBeInTheDocument();
    expect(screen.getByText('晚上')).toBeInTheDocument();
    // specific items still present
    expect(screen.getByText('起床後')).toBeInTheDocument();
    expect(screen.getByText('睡前躺上床後')).toBeInTheDocument();
  });

  it('filters out quantitative habits from "你的習慣" (they are targets not anchors)', () => {
    const mixedTasks = [
      { id: 't1', title: '喝水 2000cc', isLocked: false, type: 'quantitative' },
      { id: 't2', title: '冥想 10 分鐘', isLocked: false, type: 'quantitative' },
      { id: 't3', title: '寫感恩日記',   isLocked: false, type: 'binary' },
    ];
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={mixedTasks} />);
    expect(screen.getByText('寫感恩日記')).toBeInTheDocument();
    expect(screen.queryByText('喝水 2000cc')).not.toBeInTheDocument();
    expect(screen.queryByText('冥想 10 分鐘')).not.toBeInTheDocument();
  });

  it('filters out checklist habits from "你的習慣" (they are multi-step routines)', () => {
    const tasks = [
      { id: 't1', title: '晨間儀式', isLocked: false, type: 'checklist' },
      { id: 't2', title: '寫日記',   isLocked: false, type: 'binary' },
    ];
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={tasks} />);
    expect(screen.getByText('寫日記')).toBeInTheDocument();
    expect(screen.queryByText('晨間儀式')).not.toBeInTheDocument();
  });

  it('calls onChange with the label when a curated moment is clicked', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value={null} onChange={onChange} yourTasks={[]} />);
    fireEvent.click(screen.getByText('起床後'));
    expect(onChange).toHaveBeenCalledWith('起床後');
  });

  it('calls onChange with task title when a your-habit card is clicked', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value={null} onChange={onChange} yourTasks={yourTasks} />);
    fireEvent.click(screen.getByText('喝水'));
    expect(onChange).toHaveBeenCalledWith('喝水');
  });

  it('highlights the selected anchor when value matches', () => {
    render(<AnchorPicker value="起床後" onChange={() => {}} yourTasks={[]} />);
    const selected = screen.getByText('起床後').closest('button');
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });

  it('reveals text input when 自訂... is clicked', () => {
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={[]} />);
    fireEvent.click(screen.getByText(/自訂/));
    expect(screen.getByPlaceholderText(/輸入自訂錨點/)).toBeInTheDocument();
  });

  it('calls onChange when custom text is submitted via Enter', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value={null} onChange={onChange} yourTasks={[]} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂錨點/);
    fireEvent.change(input, { target: { value: '會議結束後  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('會議結束後');
  });

  it('excludes the task referenced by excludeTaskId from your-habits list', () => {
    render(
      <AnchorPicker
        value={null}
        onChange={() => {}}
        yourTasks={yourTasks}
        excludeTaskId="t1"
      />
    );
    expect(screen.queryByText('喝水')).not.toBeInTheDocument();
    expect(screen.getByText('跑步')).toBeInTheDocument();
  });

  it('truncates custom input to CUSTOM_ANCHOR_MAX_LENGTH (30) chars before submit', () => {
    const onChange = jest.fn();
    const long = 'a'.repeat(50);
    render(<AnchorPicker value={null} onChange={onChange} yourTasks={[]} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂錨點/);
    fireEvent.change(input, { target: { value: long } });
    expect(input.value.length).toBeLessThanOrEqual(30);
  });
});
