'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, Music, Clock, Repeat, Shuffle, Minus, Plus } from 'lucide-react';
import { resolveTracks, playableTracks } from '@/lib/musicTool';

// Slice T sleep-music player.
// Resolves a track list from `config`, auto-selects the first playable track
// (one with an audioUrl), and drives a single <audio> element plus a fade-to-
// onComplete countdown timer. Non-playable tracks render as "即將推出" and
// cannot be selected.

const DEFAULT_TIMER_MIN = 30;
const FADE_MS = 1500;

function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatRemaining(totalSeconds) {
    const safe = Math.max(0, Math.ceil(totalSeconds));
    const mm = Math.floor(safe / 60);
    const ss = safe % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function MusicTool({ config = {}, onComplete }) {
    const tracks = useMemo(() => resolveTracks(config), [config]);
    const playable = useMemo(() => playableTracks(tracks), [tracks]);

    const [currentId, setCurrentId] = useState(() => (playable[0] ? playable[0].id : null));
    const [isPlaying, setIsPlaying] = useState(false);

    const timerMin = config.timerMin != null ? config.timerMin : DEFAULT_TIMER_MIN;
    const totalSeconds = Math.max(0, Math.round(timerMin * 60));
    const [remaining, setRemaining] = useState(totalSeconds);

    const [playMode, setPlayMode] = useState(config.playMode || 'loop');

    const audioRef = useRef(null);
    const intervalRef = useRef(null);
    const completedRef = useRef(false);

    const current = useMemo(
        () => tracks.find((t) => t.id === currentId) || null,
        [tracks, currentId]
    );

    const reduceMotion = prefersReducedMotion();

    const finish = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        const audio = audioRef.current;

        // Volume fade is a cosmetic side-effect — run it fire-and-forget so the
        // completion callback never depends on the fade timers resolving.
        // Skipped entirely under prefers-reduced-motion.
        if (audio && !reduceMotion) {
            const startVol = audio.volume;
            const steps = 15;
            let step = 0;
            const fade = setInterval(() => {
                step += 1;
                if (audio) audio.volume = Math.max(0, startVol * (1 - step / steps));
                if (step >= steps) {
                    clearInterval(fade);
                    if (audio) audio.pause();
                }
            }, FADE_MS / steps);
        } else if (audio) {
            audio.pause();
        }

        setIsPlaying(false);
        if (typeof onComplete === 'function') onComplete();
    }, [onComplete, reduceMotion]);

    // Countdown loop — only runs while playing. The updater stays pure; the
    // completion side-effect fires from the `remaining === 0` effect below.
    useEffect(() => {
        if (!isPlaying) return undefined;
        intervalRef.current = setInterval(() => {
            setRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [isPlaying]);

    // Fire completion once the countdown hits 0 while playing.
    useEffect(() => {
        if (isPlaying && remaining <= 0) {
            clearInterval(intervalRef.current);
            finish();
        }
    }, [isPlaying, remaining, finish]);

    const handleToggle = useCallback(() => {
        const audio = audioRef.current;
        if (!current || !current.audioUrl || !audio) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play();
            setIsPlaying(true);
        }
    }, [current, isPlaying]);

    const handleSelect = useCallback(
        (track) => {
            if (!track.audioUrl || track.id === currentId) return;
            const audio = audioRef.current;
            if (audio) audio.pause();
            setIsPlaying(false);
            setCurrentId(track.id);
        },
        [currentId]
    );

    const adjustTimer = useCallback(
        (deltaMin) => {
            setRemaining((prev) => {
                const next = prev + deltaMin * 60;
                return Math.max(60, next);
            });
        },
        []
    );

    const remainingMinutesLabel = Math.max(1, Math.round(remaining / 60));

    // Empty state — nothing playable in this selection.
    if (!current) {
        return (
            <div className="rounded-2xl bg-slate-900 p-6 text-center text-slate-300">
                <Music className="mx-auto mb-3 h-8 w-8 text-slate-500" aria-hidden="true" />
                <p className="text-sm">這個分類的曲目即將推出</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-slate-900 p-5 text-slate-100">
            <audio ref={audioRef} src={current.audioUrl || undefined} loop={playMode === 'loop'} />

            {/* Top — current track */}
            <div className="flex items-center gap-4">
                {current.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={current.imageUrl}
                        alt={current.title}
                        className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                    />
                ) : (
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800">
                        <Music className="h-6 w-6 text-slate-500" aria-hidden="true" />
                    </div>
                )}
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">{current.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{current.oneLiner}</p>
                </div>
            </div>

            {/* Middle — play control + countdown */}
            <div className="mt-5 flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleToggle}
                    aria-label={isPlaying ? '暫停' : '播放'}
                    className="group flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-white transition-all duration-200 hover:scale-105 hover:bg-teal-400 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
                >
                    {isPlaying ? (
                        <Pause className="h-6 w-6" aria-hidden="true" />
                    ) : (
                        <Play className="ml-0.5 h-6 w-6" aria-hidden="true" />
                    )}
                </button>

                <div className="flex items-center gap-2 text-right">
                    <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span
                        className="font-mono text-2xl tabular-nums"
                        aria-label="剩餘時間"
                        data-testid="music-countdown"
                    >
                        {formatRemaining(remaining)}
                    </span>
                </div>
            </div>

            {/* Controls — play mode + timer adjust */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex overflow-hidden rounded-full border border-slate-700">
                    <button
                        type="button"
                        onClick={() => setPlayMode('loop')}
                        aria-pressed={playMode === 'loop'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none ${
                            playMode === 'loop'
                                ? 'bg-teal-500 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                        循環
                    </button>
                    <button
                        type="button"
                        onClick={() => setPlayMode('similar')}
                        aria-pressed={playMode === 'similar'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none ${
                            playMode === 'similar'
                                ? 'bg-teal-500 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                        同類續播
                    </button>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-2 py-1">
                    <button
                        type="button"
                        onClick={() => adjustTimer(-5)}
                        aria-label="減少時間"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition-colors duration-150 hover:bg-slate-800 active:scale-95 motion-reduce:transition-none"
                    >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-slate-300">
                        {remainingMinutesLabel} 分鐘
                    </span>
                    <button
                        type="button"
                        onClick={() => adjustTimer(5)}
                        aria-label="增加時間"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition-colors duration-150 hover:bg-slate-800 active:scale-95 motion-reduce:transition-none"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Bottom — track list */}
            <ul className="mt-5 space-y-1.5">
                {tracks.map((track) => {
                    const isCurrent = track.id === currentId;
                    const isPlayable = Boolean(track.audioUrl);
                    return (
                        <li key={track.id}>
                            <button
                                type="button"
                                onClick={() => handleSelect(track)}
                                disabled={!isPlayable}
                                aria-current={isCurrent ? 'true' : undefined}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-150 motion-reduce:transition-none ${
                                    isCurrent
                                        ? 'bg-teal-500/15 ring-1 ring-teal-500/40'
                                        : isPlayable
                                        ? 'hover:bg-slate-800'
                                        : 'cursor-not-allowed opacity-50'
                                }`}
                            >
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-slate-400">
                                    {isCurrent && isPlaying ? (
                                        <Pause className="h-4 w-4 text-teal-400" aria-hidden="true" />
                                    ) : isPlayable ? (
                                        <Play className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                        <Music className="h-4 w-4" aria-hidden="true" />
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">
                                        {track.title}
                                    </span>
                                    <span className="block truncate text-xs text-slate-500">
                                        {track.oneLiner}
                                    </span>
                                </span>
                                {!isPlayable && (
                                    <span className="flex-shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                        即將推出
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
