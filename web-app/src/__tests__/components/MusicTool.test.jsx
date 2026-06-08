// jsdom has no real audio engine — stub the media API before anything renders.
window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = jest.fn();

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MusicTool from '@/components/tools/MusicTool';

afterEach(() => {
    jest.clearAllMocks();
});

describe('MusicTool — default selection', () => {
    test('config={problemId:"stress"} renders the playable-first track (Moss Room) + its oneLiner', () => {
        render(<MusicTool config={{ problemId: 'stress' }} onComplete={() => {}} />);
        // t41 'Moss Room' is the only playable track in 'calm' → surfaces first and is auto-selected.
        // Title + oneLiner appear in both the top card and the list row, so assert ≥1 match.
        expect(screen.getAllByText('Moss Room').length).toBeGreaterThan(0);
        expect(
            screen.getAllByText('清透冷靜的旋律，讓過度活躍的大腦稍作喘息。').length
        ).toBeGreaterThan(0);
    });
});

describe('MusicTool — play/pause', () => {
    test('clicking play calls audio.play; clicking again calls pause', () => {
        render(<MusicTool config={{ problemId: 'stress' }} onComplete={() => {}} />);
        const toggle = screen.getByRole('button', { name: /播放|play/i });
        fireEvent.click(toggle);
        expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
        // Now it's a pause button.
        const pauseBtn = screen.getByRole('button', { name: /暫停|pause/i });
        fireEvent.click(pauseBtn);
        expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    });
});

describe('MusicTool — countdown completion', () => {
    test('countdown reaching 0 calls onComplete exactly once', () => {
        jest.useFakeTimers();
        const onComplete = jest.fn();
        // timerMin = 1/60 minute = 1 second.
        render(
            <MusicTool
                config={{ problemId: 'stress', timerMin: 1 / 60 }}
                onComplete={onComplete}
            />
        );
        // Start playback so the timer runs.
        fireEvent.click(screen.getByRole('button', { name: /播放|play/i }));
        act(() => {
            jest.advanceTimersByTime(5000);
        });
        expect(onComplete).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });
});

describe('MusicTool — continuous playback', () => {
    test('loop mode sets audio.loop true; countdown to 0 still fires onComplete once', () => {
        jest.useFakeTimers();
        const onComplete = jest.fn();
        const { container } = render(
            <MusicTool
                config={{ problemId: 'stress', playMode: 'loop', timerMin: 1 / 60 }}
                onComplete={onComplete}
            />
        );
        const audio = container.querySelector('audio');
        expect(audio.loop).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: /播放|play/i }));
        act(() => {
            jest.advanceTimersByTime(5000);
        });
        expect(onComplete).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });
});

describe('MusicTool — session length stepper', () => {
    test('± sets the intended session length (5–120), not the live clock', () => {
        render(<MusicTool config={{ problemId: 'stress' }} onComplete={() => {}} />);
        // Default timerMin 30 → stepper shows 30 分鐘.
        expect(screen.getByText('30 分鐘')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('增加時間'));
        expect(screen.getByText('35 分鐘')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('減少時間'));
        expect(screen.getByText('30 分鐘')).toBeInTheDocument();
    });
});

describe('MusicTool — non-playable tracks', () => {
    test('a track without audioUrl shows 即將推出 and clicking it does NOT call play', () => {
        render(<MusicTool config={{ problemId: 'stress' }} onComplete={() => {}} />);
        // '夜雨入眠' (t1) is in the calm list but has no audioUrl.
        const row = screen.getByText('夜雨入眠').closest('button');
        expect(screen.getAllByText('即將推出').length).toBeGreaterThan(0);
        fireEvent.click(row);
        // Clicking a non-playable track must not start playback.
        expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    });
});
