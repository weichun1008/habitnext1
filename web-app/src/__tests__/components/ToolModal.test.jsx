import { render, screen, fireEvent } from '@testing-library/react';
import ToolModal from '@/components/tools/ToolModal';
import { describeTool } from '@/lib/tools';

// Stub the three widgets so we can assert which one ToolModal picks per toolType
// without pulling in timers / media APIs.
jest.mock('@/components/tools/BreathingTool', () => () => <div>BREATHING</div>);
jest.mock('@/components/tools/TimerTool', () => () => <div>TIMER</div>);
jest.mock('@/components/tools/MusicTool', () => () => <div>MUSIC</div>);

const makeTask = (toolType, toolConfig) => ({
    id: 't1',
    title: '測試習慣',
    toolType,
    toolConfig,
});

it('renders the describeTool label as the title for breathing', () => {
    const config = { inhale: 4, hold: 7, exhale: 8, cycles: 5 };
    render(<ToolModal task={makeTask('breathing', config)} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(screen.getByText(describeTool('breathing', config))).toBeInTheDocument();
});

it('renders BreathingTool for toolType "breathing"', () => {
    render(<ToolModal task={makeTask('breathing', {})} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(screen.getByText('BREATHING')).toBeInTheDocument();
    expect(screen.queryByText('TIMER')).not.toBeInTheDocument();
    expect(screen.queryByText('MUSIC')).not.toBeInTheDocument();
});

it('renders TimerTool for toolType "timer"', () => {
    render(<ToolModal task={makeTask('timer', { seconds: 1500 })} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(screen.getByText('TIMER')).toBeInTheDocument();
    expect(screen.queryByText('BREATHING')).not.toBeInTheDocument();
});

it('renders MusicTool for toolType "music"', () => {
    render(<ToolModal task={makeTask('music', { timerMin: 30 })} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(screen.getByText('MUSIC')).toBeInTheDocument();
    expect(screen.queryByText('TIMER')).not.toBeInTheDocument();
});

it('renders nothing for an unknown toolType', () => {
    const { container } = render(<ToolModal task={makeTask('mystery', {})} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
});

it('renders nothing when toolType is null', () => {
    const { container } = render(<ToolModal task={makeTask(null, {})} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
});

it('renders nothing when task is null', () => {
    const { container } = render(<ToolModal task={null} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
});

it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<ToolModal task={makeTask('breathing', {})} onClose={onClose} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /close|關閉/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
});

it('calls onClose when the backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<ToolModal task={makeTask('breathing', {})} onClose={onClose} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByTestId('tool-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
});

it('does NOT call onClose when the modal panel itself is clicked', () => {
    const onClose = jest.fn();
    render(<ToolModal task={makeTask('breathing', {})} onClose={onClose} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByText(describeTool('breathing', {})));
    expect(onClose).not.toHaveBeenCalled();
});

it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<ToolModal task={makeTask('breathing', {})} onClose={onClose} onComplete={jest.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
});
