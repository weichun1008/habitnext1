const VARIANTS = [
  { roof: '#cbb18a', roofH: 8, bodyH: 16 },
  { roof: '#a3b5c9', roofH: 6, bodyH: 20 },
  { roof: '#c9a3a3', roofH: 10, bodyH: 14 },
  { roof: '#9cb8a3', roofH: 7, bodyH: 18 },
];

export default function GenericBuilding({ styleIndex = 0, color = '#9ccb8a', x = 0, y = 0, scale = 1 }) {
  const v = VARIANTS[styleIndex % VARIANTS.length];
  const w = 22;
  const bodyTop = -v.bodyH;
  const roofTop = bodyTop - v.roofH;
  return (
    <g data-kind="generic-building" data-style={String(styleIndex)} transform={`translate(${x},${y}) scale(${scale})`}>
      <rect x={-w / 2} y={bodyTop} width={w} height={v.bodyH} fill={color} stroke="#7a9c6a" strokeWidth="1.2" />
      <polygon points={`${-w / 2 - 2},${bodyTop} 0,${roofTop} ${w / 2 + 2},${bodyTop}`} fill={v.roof} />
      <rect x={-4} y={bodyTop + 4} width="8" height={Math.max(4, v.bodyH - 6)} fill="#fff" opacity="0.65" />
    </g>
  );
}
