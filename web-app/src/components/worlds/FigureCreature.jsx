'use client';

import React from 'react';
import { useT } from '@/lib/i18n';

// 公仔世界的夥伴 — a small companion creature that grows with you.
// Pure SVG, no deps. Tonality: coral #f97362 (figure world accent) + a green
// sprout (echoes「隨著你的習慣一起長大」).
//
// - Animated (idle): gentle bob + squash-stretch, sprout sway, periodic blink.
//   CSS keyframes live in an inline <style> block; transform-box: fill-box so
//   per-element transform-origin behaves. Respects prefers-reduced-motion.
// - Stage-aware (1..6): the same creature, growing — body scales up, sprout
//   sprouts and grows, accessories (leaf crown / belly star / sparkle) accrue.
const FigureCreature = ({ size = 64, stage = 1, className = '' }) => {
  const { t } = useT();
  const s = Math.max(1, Math.min(6, Math.round(stage) || 1));

  // Progressive growth: body scale + sprout presence/size keyed to stage.
  const bodyScale = 0.82 + (s - 1) * 0.036; // 0.82 → ~1.0
  const sproutSeed = s === 1;               // stage 1 = bud/seed only
  const sproutLen = s <= 2 ? 6 : 6 + (s - 2) * 2.5; // grows from stage 3
  const leafCrown = s >= 4;                 // little leaf crown
  const bellyStar = s >= 4;                 // star on belly
  const sparkle = s >= 6;                   // subtle sparkle at fullest

  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={t('figure.creatureAria')}
      fill="none"
    >
      <style>{`
        .fc-bob, .fc-sprout, .fc-eye { transform-box: fill-box; }
        .fc-bob {
          transform-origin: center bottom;
          animation: fc-bob-kf 3s ease-in-out infinite;
        }
        .fc-sprout {
          transform-origin: center bottom;
          animation: fc-sprout-kf 4.5s ease-in-out infinite;
        }
        .fc-eye {
          transform-origin: center center;
          animation: fc-blink-kf 5s ease-in-out infinite;
        }
        @keyframes fc-bob-kf {
          0%, 100% { transform: translateY(0) scale(1, 1); }
          50%      { transform: translateY(-2.4px) scale(1.015, 0.985); }
          75%      { transform: translateY(0) scale(0.99, 1.01); }
        }
        @keyframes fc-sprout-kf {
          0%, 100% { transform: rotate(-6deg); }
          50%      { transform: rotate(6deg); }
        }
        @keyframes fc-blink-kf {
          0%, 90%, 100% { transform: scaleY(1); }
          95%           { transform: scaleY(0.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fc-bob, .fc-sprout, .fc-eye { animation: none; }
        }
      `}</style>

      <defs>
        <linearGradient id="fc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb9183" />
          <stop offset="1" stopColor="#f97362" />
        </linearGradient>
      </defs>

      {/* ground shadow — static, anchors the bob */}
      <ellipse cx="40" cy="71" rx="20" ry="4" fill="#000000" opacity="0.08" />

      {/* whole creature bobs as one group; transform-origin center bottom */}
      <g className="fc-bob" transform={`translate(40 68) scale(${bodyScale}) translate(-40 -68)`}>
        {/* sprout — sways, nested inside bob so it stays attached */}
        <g className="fc-sprout">
          {sproutSeed ? (
            // stage 1: just a seed/bud poking out
            <>
              <line x1="40" y1="22" x2="40" y2="18" stroke="#7fc56b" strokeWidth="3" strokeLinecap="round" />
              <circle cx="40" cy="16" r="3.4" fill="#7fc56b" />
            </>
          ) : (
            <>
              <line
                x1="40" y1="22" x2="40" y2={22 - sproutLen}
                stroke="#7fc56b" strokeWidth="3" strokeLinecap="round"
              />
              <path
                d={`M40 ${24 - sproutLen} C40 ${17 - sproutLen} 45 ${14 - sproutLen} 50 ${15 - sproutLen} C48 ${21 - sproutLen} 44 ${23 - sproutLen} 40 ${24 - sproutLen} Z`}
                fill="#7fc56b"
              />
              {s >= 5 && (
                // a second little leaf on the other side for fuller stages
                <path
                  d={`M40 ${24 - sproutLen} C40 ${18 - sproutLen} 35 ${15 - sproutLen} 30 ${16 - sproutLen} C32 ${22 - sproutLen} 36 ${24 - sproutLen} 40 ${24 - sproutLen} Z`}
                  fill="#6fb95c"
                />
              )}
            </>
          )}
        </g>

        {/* feet */}
        <ellipse cx="31" cy="67" rx="6" ry="4.5" fill="#e85d4c" />
        <ellipse cx="49" cy="67" rx="6" ry="4.5" fill="#e85d4c" />

        {/* body */}
        <path
          d="M40 18 C56 18 64 32 64 46 C64 60 54 68 40 68 C26 68 16 60 16 46 C16 32 24 18 40 18 Z"
          fill="url(#fc-body)"
        />
        {/* belly highlight */}
        <ellipse cx="40" cy="50" rx="13" ry="11" fill="#ffffff" opacity="0.18" />

        {/* leaf crown — accessory from stage 4 */}
        {leafCrown && (
          <g fill="#7fc56b">
            <path d="M28 22 C25 17 26 13 30 12 C31 16 31 19 30 22 Z" />
            <path d="M52 22 C55 17 54 13 50 12 C49 16 49 19 50 22 Z" />
          </g>
        )}

        {/* belly star — accessory from stage 4 */}
        {bellyStar && (
          <path
            d="M40 44 L41.5 48 L45.6 48 L42.3 50.6 L43.6 54.6 L40 52.1 L36.4 54.6 L37.7 50.6 L34.4 48 L38.5 48 Z"
            fill="#ffd86b"
            opacity="0.9"
          />
        )}

        {/* cheeks */}
        <circle cx="27" cy="50" r="4" fill="#ff5a7a" opacity="0.45" />
        <circle cx="53" cy="50" r="4" fill="#ff5a7a" opacity="0.45" />

        {/* eyes — each blinks */}
        <g className="fc-eye">
          <ellipse cx="32" cy="43" rx="5" ry="6" fill="#2b2b3a" />
          <circle cx="33.7" cy="41" r="1.7" fill="#ffffff" />
        </g>
        <g className="fc-eye">
          <ellipse cx="48" cy="43" rx="5" ry="6" fill="#2b2b3a" />
          <circle cx="49.7" cy="41" r="1.7" fill="#ffffff" />
        </g>

        {/* smile */}
        <path d="M35 53 Q40 57 45 53" stroke="#2b2b3a" strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* sparkle — fullest stage flourish */}
        {sparkle && (
          <g fill="#ffe9a3">
            <path d="M61 30 L62 33 L65 34 L62 35 L61 38 L60 35 L57 34 L60 33 Z" />
            <circle cx="20" cy="34" r="1.6" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default FigureCreature;
