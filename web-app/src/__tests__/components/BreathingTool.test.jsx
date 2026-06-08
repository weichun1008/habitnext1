import { render, screen, act, fireEvent } from '@testing-library/react';
import BreathingTool from '@/components/tools/BreathingTool';

beforeEach(() => {
    jest.useFakeTimers();
    window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
    }));
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
});

const tick = (ms) => act(() => { jest.advanceTimersByTime(ms); });

it('點 Start 後顯示「吸氣」', () => {
    render(<BreathingTool config={{ inhale: 1, hold: 1, exhale: 1, cycles: 1 }} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /start|開始/i }));
    expect(screen.getByText('吸氣')).toBeInTheDocument();
});

it('推進計時器：吸氣 → 憋氣 → 吐氣', () => {
    render(<BreathingTool config={{ inhale: 1, hold: 1, exhale: 1, cycles: 1 }} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /start|開始/i }));

    expect(screen.getByText('吸氣')).toBeInTheDocument();
    tick(1000);
    expect(screen.getByText('憋氣')).toBeInTheDocument();
    tick(1000);
    expect(screen.getByText('吐氣')).toBeInTheDocument();
});

it('跑完整個序列後 onComplete 被呼叫一次', () => {
    const onComplete = jest.fn();
    render(<BreathingTool config={{ inhale: 1, hold: 1, exhale: 1, cycles: 1 }} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /start|開始/i }));

    // inhale 1s + hold 1s + exhale 1s = 3 ticks to finish
    tick(3000);
    expect(onComplete).toHaveBeenCalledTimes(1);
});

it('顯示輪數進度與秒數倒數', () => {
    render(<BreathingTool config={{ inhale: 3, hold: 1, exhale: 1, cycles: 5 }} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /start|開始/i }));
    expect(screen.getByText(/第\s*1\s*\/\s*5\s*輪/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
});
