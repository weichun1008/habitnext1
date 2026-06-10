'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useT } from '@/lib/i18n';

const BREAK_SECONDS = 300;
const RING_SIZE = 220;
const STROKE = 12;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function fmt(total) {
  const s = Math.max(0, Math.floor(total));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export default function TimerTool({ config, onComplete }) {
  const { t } = useT();
  const { seconds = 0, mode = 'count', rounds = 1 } = config || {};
  const breakSeconds = config?.breakSeconds ?? BREAK_SECONDS;
  const reducedMotion = usePrefersReducedMotion();

  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('work'); // 'work' | 'break'
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);

  const intervalRef = useRef(null);
  const completedRef = useRef(false);

  const phaseTotal = phase === 'break' ? breakSeconds : seconds;

  const reset = useCallback(() => {
    setRunning(false);
    setFinished(false);
    setPhase('work');
    setRound(1);
    setRemaining(seconds);
    completedRef.current = false;
  }, [seconds]);

  // Re-sync when config changes
  useEffect(() => {
    reset();
  }, [reset, mode, rounds]);

  const fireComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setFinished(true);
    setRunning(false);
    onComplete?.();
  }, [onComplete]);

  // The tick updater stays pure: it only decrements toward 0. All phase/round
  // transitions are driven by the `remaining === 0` effect below — a single
  // source of truth — so the break phase is never skipped.
  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev > 1) return prev - 1;
      if (mode === 'count') {
        fireComplete();
      }
      return 0;
    });
  }, [mode, fireComplete]);

  // Pomodoro phase transition driven by remaining hitting 0
  useEffect(() => {
    if (mode !== 'pomodoro' || !running) return;
    if (remaining !== 0) return;

    if (phase === 'break') {
      // a break just ended
      if (round >= rounds) {
        fireComplete();
      } else {
        setRound((r) => r + 1);
        setPhase('work');
        setRemaining(seconds);
      }
    } else {
      // work just ended → start break
      setPhase('break');
      setRemaining(breakSeconds);
    }
  }, [remaining, phase, round, rounds, running, mode, seconds, breakSeconds, fireComplete]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, tick]);

  const toggle = () => {
    if (finished) return;
    setRunning((r) => !r);
  };

  const offset =
    phaseTotal > 0
      ? CIRCUMFERENCE * (1 - remaining / phaseTotal)
      : CIRCUMFERENCE;

  const phaseLabel = phase === 'break' ? t('tools.timer.break') : t('tools.timer.focus');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {mode === 'pomodoro' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              background: phase === 'break' ? '#E0F2F1' : '#E8F8E8',
              color: phase === 'break' ? '#004F51' : '#00750C',
            }}
          >
            {phaseLabel}
          </span>
          <span style={{ color: '#6B7280' }}>
            {t('tools.cycle', { current: round, total: rounds })}
          </span>
        </div>
      )}

      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-label={t('tools.timer.ringAria')}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#ECECEC"
            strokeWidth={STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={phase === 'break' ? '#004F51' : '#00C300'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={
              reducedMotion
                ? undefined
                : { transition: 'stroke-dashoffset 1s linear' }
            }
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            color: '#1A1A1A',
          }}
        >
          {fmt(remaining)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={toggle}
          disabled={finished}
          aria-label={running ? t('tools.pause') : t('tools.start')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 22px',
            borderRadius: 999,
            border: 'none',
            background: '#004F51',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: finished ? 'not-allowed' : 'pointer',
            opacity: finished ? 0.5 : 1,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (finished) return;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,79,81,0.28)';
            e.currentTarget.style.filter = 'brightness(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.filter = 'none';
          }}
        >
          {running ? <Pause size={18} /> : <Play size={18} />}
          {running ? t('tools.pause') : t('tools.start')}
        </button>

        <button
          type="button"
          onClick={reset}
          aria-label={t('tools.reset')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            borderRadius: 999,
            border: '1px solid #D1D5DB',
            background: '#fff',
            color: '#374151',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#9CA3AF';
            e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.color = '#374151';
          }}
        >
          <RotateCcw size={18} />
          {t('tools.reset')}
        </button>
      </div>
    </div>
  );
}
