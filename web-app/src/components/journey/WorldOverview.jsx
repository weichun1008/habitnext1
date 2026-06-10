'use client';

import { useT } from '@/lib/i18n';

const CX = 180;
const CY = 140;

function cityRadius(total) {
  const r = 10 + Math.sqrt(Math.max(0, total)) * 3;
  return Math.min(r, 34);
}

// Deterministic placement: first (largest) city at center, the rest on a ring.
function cityPosition(index, count) {
  if (index === 0) return { x: CX, y: CY };
  const ringCount = count - 1;
  const angle = (index - 1) / ringCount * Math.PI * 2 - Math.PI / 2;
  const ringR = 92;
  return {
    x: CX + Math.cos(angle) * ringR,
    y: CY + Math.sin(angle) * (ringR * 0.62),
  };
}

export default function WorldOverview({ cities, onSelectCity }) {
  const { t } = useT();
  if (!cities || cities.length === 0) return null;

  return (
    <svg
      viewBox="0 0 360 280"
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('journey.overviewAria')}
    >
      <ellipse cx={CX} cy={CY} rx="172" ry="128" fill="#dff1ea" stroke="#bfe3d9" strokeWidth="2" />

      {cities.map((c, i) => {
        const { x, y } = cityPosition(i, cities.length);
        const r = cityRadius(c.total);
        const isHome = i === 0;
        const fill = isHome ? '#0d9488' : '#34b3a6';
        const handleSelect = () => onSelectCity(c.city);
        return (
          <g
            key={c.city}
            data-city={c.city}
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSelect();
            }}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={x} cy={y} r={r} fill={fill} stroke="#bfe3d9" strokeWidth="1.5" />
            <circle cx={x} cy={y} r={Math.max(3, r * 0.22)} fill="#ffffff" opacity="0.9" />
            <text
              x={x}
              y={y + r + 14}
              textAnchor="middle"
              fill="#1f2937"
              fontWeight="700"
              fontSize="11"
            >
              {c.city}
            </text>
            <text
              x={x}
              y={y + r + 26}
              textAnchor="middle"
              fill="#6b7280"
              fontSize="9"
            >
              {c.tier ? t(`journey.tiers.${c.tier}`) : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
