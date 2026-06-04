import { layoutCity, VIEW_W, VIEW_H, CX, CY } from '@/lib/journeyWorld';
import DomainLandmark, { LANDMARKS } from '@/components/journey/landmarks/DomainLandmark';
import GenericBuilding from '@/components/journey/landmarks/GenericBuilding';
import MemoryPin from '@/components/journey/landmarks/MemoryPin';
import PolaroidPin from '@/components/journey/landmarks/PolaroidPin';

// CX/CY single source of truth = journeyWorld (layoutCity centers on them); imported so
// the pin-fallback arc below can never drift from the layout center.
const RIVER_TIERS = new Set(['city', 'metropolis', 'megacity']);

export default function CityScene({ cityData, userId }) {
  const nodes = layoutCity(cityData);
  const sorted = [...nodes].sort((a, b) => a.y - b.y);

  const flagships = sorted.filter((n) => n.kind === 'flagship');
  const pins = (cityData && cityData.pins) || [];
  // Deterministic pin scatter: anchor near flagship tops, fall back to a fixed arc.
  const pinNodes = pins.slice(0, 5).map((pin, i) => {
    const anchor = flagships[i % Math.max(1, flagships.length)];
    if (anchor) {
      return { pin, x: anchor.x + (i % 2 === 0 ? -14 : 14), y: anchor.y - 30 };
    }
    return { pin, x: CX - 48 + i * 24, y: CY - 50 };
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${cityData.city} 的城市`}
    >
      <defs>
        <radialGradient id="cityscene-sky" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#eef7f4" />
          <stop offset="100%" stopColor="#cbe9e2" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#cityscene-sky)" />
      <ellipse cx={CX} cy={CY + 28} rx="148" ry="78" fill="#cfe8bf" stroke="#a9d49a" strokeWidth="2" />
      {cityData && RIVER_TIERS.has(cityData.tier) && (
        <path
          d={`M12 ${CY + 56} Q ${CX - 30} ${CY + 18} ${CX} ${CY + 38} T ${VIEW_W - 12} ${CY + 20}`}
          fill="none"
          stroke="#9bd6ea"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.8"
        />
      )}
      <ellipse cx={CX} cy={CY + 6} rx="40" ry="20" fill="#e7f0da" stroke="#bcdca8" strokeWidth="1.5" />

      {sorted.map((node, i) => {
        if (node.kind === 'flagship') {
          return (
            <g data-kind="flagship" key={`${node.kind}-${i}`}>
              <DomainLandmark domain={node.domain} level={node.level} x={node.x} y={node.y} scale={node.scale} />
            </g>
          );
        }
        if (node.kind === 'building') {
          return (
            <g data-kind="building" key={`${node.kind}-${i}`}>
              <GenericBuilding
                styleIndex={node.styleIndex}
                color={LANDMARKS[node.domain]?.color || '#9ccb8a'}
                x={node.x}
                y={node.y}
                scale={node.scale}
              />
            </g>
          );
        }
        return (
          <g data-kind="generic" key={`${node.kind}-${i}`}>
            <GenericBuilding styleIndex={node.styleIndex} color="#cdb89a" x={node.x} y={node.y} scale={node.scale} />
          </g>
        );
      })}

      {pinNodes.map(({ pin, x, y }, i) => (
        <g data-kind="pin-slot" key={`pin-${i}`}>
          {pin.hasPhoto ? (
            <PolaroidPin id={pin.id} userId={userId} x={x} y={y} scale={1} />
          ) : (
            <MemoryPin x={x} y={y} />
          )}
        </g>
      ))}
    </svg>
  );
}
