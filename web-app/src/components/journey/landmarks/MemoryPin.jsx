export default function MemoryPin({ x = 0, y = 0 }) {
  return (
    <g data-kind="pin" transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="2" rx="7" ry="2.5" fill="rgba(31,41,55,.18)" />
      <circle cx="0" cy="-8" r="8" fill="#f97362" stroke="#fff" strokeWidth="1.5" />
      <circle cx="0" cy="-8" r="3" fill="#fff" />
    </g>
  );
}
