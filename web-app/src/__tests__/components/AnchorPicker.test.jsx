import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AnchorPicker from '../../components/explore/AnchorPicker';

// 2026-05-23: AnchorPicker no longer renders the "你的習慣" section. Tests
// that asserted on its rendering / filtering have been deleted; one assertion
// is kept (in-and-inverted) to lock in the new contract.
//
// New UX (this iteration):
//   - Pinned "目前錨點" pill at the top when value is set
//   - Click an already-selected button = onChange('') (toggle off)
//   - Pill renders custom values too

describe('AnchorPicker — life moments', () => {
  it('renders 生活時刻 section grouped by time of day', () => {
    render(<AnchorPicker value={null} onChange={() => {}} />);
    expect(screen.getByText('生活時刻')).toBeInTheDocument();
    expect(screen.getByText('早晨')).toBeInTheDocument();
    expect(screen.getByText('晚上')).toBeInTheDocument();
    expect(screen.getByText('起床後')).toBeInTheDocument();
    expect(screen.getByText('睡前躺上床後')).toBeInTheDocument();
  });

  it('calls onChange with the label when a curated moment is clicked', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('起床後'));
    expect(onChange).toHaveBeenCalledWith('起床後');
  });

  it('highlights the selected anchor when value matches', () => {
    render(<AnchorPicker value="起床後" onChange={() => {}} />);
    // getByText would match both the pill's <span> and the button — scope to
    // role=button so we land on the AnchorButton specifically.
    const selected = screen.getByRole('button', { name: '起床後' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('AnchorPicker — 你的習慣 section removed', () => {
  it('never renders 你的習慣 section, even when yourTasks is non-empty', () => {
    // Pass yourTasks to confirm the prop is ignored, not just empty.
    const yourTasks = [
      { id: 't1', title: '喝水', isLocked: false, type: 'binary' },
      { id: 't2', title: '跑步', isLocked: false, type: 'binary' },
    ];
    render(<AnchorPicker value={null} onChange={() => {}} yourTasks={yourTasks} />);
    expect(screen.queryByText(/你的習慣/)).not.toBeInTheDocument();
    expect(screen.queryByText('喝水')).not.toBeInTheDocument();
    expect(screen.queryByText('跑步')).not.toBeInTheDocument();
  });
});

describe('AnchorPicker — selected pill + toggle off', () => {
  it('renders 目前錨點 pill when value is set', () => {
    render(<AnchorPicker value="起床後" onChange={() => {}} />);
    const pill = screen.getByTestId('anchor-selected-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('目前錨點');
    expect(pill).toHaveTextContent('起床後');
  });

  it('does not render pill when value is falsy', () => {
    render(<AnchorPicker value={null} onChange={() => {}} />);
    expect(screen.queryByTestId('anchor-selected-pill')).not.toBeInTheDocument();
  });

  it('renders pill even when value is a custom string not in any preset', () => {
    render(<AnchorPicker value="會議結束後" onChange={() => {}} />);
    expect(screen.getByTestId('anchor-selected-pill')).toHaveTextContent('會議結束後');
  });

  it('calls onChange("") when the pill clear button is clicked', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value="起床後" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('清除錨點'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('toggles off when the already-selected preset is clicked again', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value="起床後" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '起床後' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('AnchorPicker — custom input', () => {
  it('reveals text input when 自訂... is clicked', () => {
    render(<AnchorPicker value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByText(/自訂/));
    expect(screen.getByPlaceholderText(/輸入自訂錨點/)).toBeInTheDocument();
  });

  it('calls onChange when custom text is submitted via Enter', () => {
    const onChange = jest.fn();
    render(<AnchorPicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂錨點/);
    fireEvent.change(input, { target: { value: '會議結束後  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('會議結束後');
  });

  it('truncates custom input to CUSTOM_ANCHOR_MAX_LENGTH (30) chars before submit', () => {
    render(<AnchorPicker value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂錨點/);
    const long = 'a'.repeat(50);
    fireEvent.change(input, { target: { value: long } });
    expect(input.value.length).toBeLessThanOrEqual(30);
  });
});
