import React from 'react';

// 公仔世界的夥伴 — a small companion creature that grows with you.
// Pure SVG, no deps. Tonality: coral #f97362 (figure world accent) + a green
// sprout (echoes「隨著你的習慣一起長大」). Used in WorldPicker's figure card;
// the future figure world view (F2) can reuse it as the base creature.
const FigureCreature = ({ size = 64, className = '' }) => (
  <svg
    viewBox="0 0 80 80"
    width={size}
    height={size}
    className={className}
    role="img"
    aria-label="公仔夥伴"
    fill="none"
  >
    <defs>
      <linearGradient id="fc-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fb9183" />
        <stop offset="1" stopColor="#f97362" />
      </linearGradient>
    </defs>

    {/* ground shadow */}
    <ellipse cx="40" cy="71" rx="20" ry="4" fill="#000000" opacity="0.08" />

    {/* sprout — grows with you */}
    <line x1="40" y1="22" x2="40" y2="13" stroke="#7fc56b" strokeWidth="3" strokeLinecap="round" />
    <path d="M40 15 C40 8 45 5 50 6 C48 12 44 14 40 15 Z" fill="#7fc56b" />

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

    {/* cheeks */}
    <circle cx="27" cy="50" r="4" fill="#ff5a7a" opacity="0.45" />
    <circle cx="53" cy="50" r="4" fill="#ff5a7a" opacity="0.45" />

    {/* eyes */}
    <ellipse cx="32" cy="43" rx="5" ry="6" fill="#2b2b3a" />
    <ellipse cx="48" cy="43" rx="5" ry="6" fill="#2b2b3a" />
    <circle cx="33.7" cy="41" r="1.7" fill="#ffffff" />
    <circle cx="49.7" cy="41" r="1.7" fill="#ffffff" />

    {/* smile */}
    <path d="M35 53 Q40 57 45 53" stroke="#2b2b3a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
  </svg>
);

export default FigureCreature;
