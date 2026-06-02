export default function Tree({ x = 0, y = 0, scale = 1 }) {
  return (
    <g data-kind="tree" transform={`translate(${x},${y}) scale(${scale})`}>
      <line x1="0" y1="0" x2="0" y2="-16" stroke="#8a6b46" strokeWidth="3" />
      <circle cx="0" cy="-22" r="11" fill="#10B981" />
      <circle cx="-7" cy="-16" r="7" fill="#0ea271" />
      <circle cx="7" cy="-16" r="6" fill="#34d399" />
    </g>
  );
}
