export default function PolaroidPin({ id, userId, x = 0, y = 0, scale = 1 }) {
  const src = userId
    ? `/api/memory/${id}?userId=${encodeURIComponent(userId)}`
    : `/api/memory/${id}`;

  // Polaroid frame geometry (viewBox units). Card base sits near local origin.
  const w = 30;
  const h = 36;
  const pad = 3;
  const photoW = w - pad * 2;
  const photoH = w - pad * 2;
  const cardX = -w / 2;
  const cardTop = -h - 6;

  return (
    <g data-kind="polaroid-pin" transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="9" ry="2.5" fill="rgba(31,41,55,.18)" />
      <g transform="rotate(-6)">
        {/* depth shadow behind card */}
        <rect
          x={cardX + 1.5}
          y={cardTop + 1.5}
          width={w}
          height={h}
          rx="2"
          fill="rgba(31,41,55,.25)"
        />
        {/* white polaroid card */}
        <rect
          x={cardX}
          y={cardTop}
          width={w}
          height={h}
          rx="2"
          fill="#ffffff"
          stroke="#e2e0db"
          strokeWidth="0.8"
        />
        {/* photo thumbnail */}
        <image
          href={src}
          xlinkHref={src}
          x={cardX + pad}
          y={cardTop + pad}
          width={photoW}
          height={photoH}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
      {/* coral tack at top, echoing MemoryPin */}
      <circle cx="0" cy={cardTop - 1} r="3.5" fill="#f97362" stroke="#fff" strokeWidth="1.2" />
      <circle cx="0" cy={cardTop - 1} r="1.3" fill="#fff" />
    </g>
  );
}
