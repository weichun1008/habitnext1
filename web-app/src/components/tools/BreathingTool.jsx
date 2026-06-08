'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward } from 'lucide-react';
import { breathingPhases } from '@/lib/tools';

const PHASE_LABEL = {
    inhale: '吸氣',
    hold: '憋氣',
    exhale: '吐氣',
};

const PHASE_SCALE = {
    inhale: 1.4,
    hold: 1.4,
    exhale: 0.7,
};

function prefersReducedMotion() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function BreathingTool({ config, onComplete }) {
    const phases = breathingPhases(config);
    const cycles = config?.cycles || 0;
    const phasesPerCycle = cycles > 0 ? phases.length / cycles : phases.length;

    const [running, setRunning] = useState(false);
    const [index, setIndex] = useState(0);
    const [remaining, setRemaining] = useState(phases[0]?.seconds ?? 0);
    const [done, setDone] = useState(false);

    const intervalRef = useRef(null);
    const completedRef = useRef(false);
    const reduceMotion = prefersReducedMotion();

    const clearTick = useCallback(() => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const finish = useCallback(() => {
        clearTick();
        setRunning(false);
        setDone(true);
        if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
        }
    }, [clearTick, onComplete]);

    const advancePhase = useCallback(() => {
        setIndex((prev) => {
            const next = prev + 1;
            if (next >= phases.length) {
                finish();
                return prev;
            }
            setRemaining(phases[next].seconds);
            return next;
        });
    }, [phases, finish]);

    const tick = useCallback(() => {
        setRemaining((prev) => {
            if (prev <= 1) {
                advancePhase();
                return prev <= 1 ? 0 : prev - 1;
            }
            return prev - 1;
        });
    }, [advancePhase]);

    useEffect(() => {
        if (!running || done) {
            clearTick();
            return undefined;
        }
        intervalRef.current = setInterval(() => {
            tick();
        }, 1000);
        return clearTick;
    }, [running, done, tick, clearTick]);

    const handleStartPause = () => {
        if (done || phases.length === 0) return;
        setRunning((r) => !r);
    };

    const handleSkip = () => {
        if (done || phases.length === 0) return;
        advancePhase();
    };

    const current = phases[index];
    const phaseKey = current?.phase ?? 'inhale';
    const currentCycle = phasesPerCycle > 0 ? Math.floor(index / phasesPerCycle) + 1 : 1;
    const scale = reduceMotion ? 1 : (running ? PHASE_SCALE[phaseKey] : 1);

    return (
        <div className="breathing-tool" style={styles.root}>
            <div style={styles.cycle}>第 {currentCycle} / {cycles} 輪</div>

            <div style={styles.stage}>
                {!reduceMotion && (
                    <div
                        aria-hidden="true"
                        style={{
                            ...styles.circle,
                            transform: `scale(${scale})`,
                            transition: `transform ${current?.seconds ?? 1}s ease-in-out`,
                        }}
                    />
                )}
                <div style={styles.readout}>
                    <div style={styles.phaseLabel}>{done ? '完成' : PHASE_LABEL[phaseKey]}</div>
                    {!done && <div style={styles.seconds}>{remaining}</div>}
                </div>
            </div>

            <div style={styles.controls}>
                <button
                    type="button"
                    onClick={handleStartPause}
                    aria-label={running ? 'Pause' : 'Start'}
                    style={styles.btn}
                    className="breathing-tool__btn"
                    disabled={done}
                >
                    {running ? <Pause size={20} /> : <Play size={20} />}
                    <span>{running ? '暫停' : '開始'}</span>
                </button>
                <button
                    type="button"
                    onClick={handleSkip}
                    aria-label="Skip"
                    style={styles.btn}
                    className="breathing-tool__btn"
                    disabled={done}
                >
                    <SkipForward size={20} />
                    <span>跳過</span>
                </button>
            </div>

            <style>{`
                .breathing-tool__btn {
                    transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
                }
                .breathing-tool__btn:hover:not(:disabled) {
                    transform: scale(1.05);
                    opacity: 0.92;
                }
                .breathing-tool__btn:active:not(:disabled) {
                    transform: scale(0.97);
                }
                .breathing-tool__btn:disabled {
                    opacity: 0.4;
                    cursor: default;
                }
                @media (prefers-reduced-motion: reduce) {
                    .breathing-tool__btn { transition: none; }
                    .breathing-tool__btn:hover:not(:disabled) { transform: none; }
                }
            `}</style>
        </div>
    );
}

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: 24,
    },
    cycle: {
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: '#6b7280',
    },
    stage: {
        position: 'relative',
        width: 220,
        height: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #2DBBA6, #004F51)',
        boxShadow: '0 12px 40px rgba(0, 79, 81, 0.35)',
    },
    readout: {
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        color: '#fff',
    },
    phaseLabel: {
        fontSize: 22,
        fontWeight: 700,
    },
    seconds: {
        fontSize: 40,
        fontWeight: 800,
        lineHeight: 1.1,
    },
    controls: {
        display: 'flex',
        gap: 12,
    },
    btn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 999,
        border: 'none',
        background: '#004F51',
        color: '#fff',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
    },
};
