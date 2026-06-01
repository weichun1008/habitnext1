// Building SVG archetypes per health domain, lifted from the committed mockup
// docs/.../2026-06-01-sliceP-domain-landmarks.html (ground ellipse + labels dropped;
// the CityScene draws the ground). Each stage is a <g> drawn in the mockup's
// 120x104 local space (building sits around x=60, baseline y≈80).

const LANDMARKS = {
  基因與腸道: {
    color: '#6366F1',
    stages: [
      // Lv1 一株幼苗
      <g>
        <rect x="54" y="64" width="5" height="14" fill="#8a6b46" />
        <circle cx="56" cy="60" r="7" fill="#7fc56b" />
      </g>,
      // Lv2 開滿花的花圃
      <g>
        <circle cx="46" cy="64" r="9" fill="#7fc56b" />
        <circle cx="62" cy="58" r="11" fill="#6366F1" opacity="0.85" />
        <circle cx="76" cy="66" r="8" fill="#7fc56b" />
      </g>,
      // Lv3 玻璃溫室果園
      <g>
        <polygon points="40,72 60,46 80,72" fill="#c7d2fe" />
        <rect x="40" y="72" width="40" height="12" fill="#6366F1" opacity="0.25" />
        <rect x="40" y="72" width="40" height="12" fill="none" stroke="#6366F1" strokeWidth="1.5" />
        <circle cx="48" cy="68" r="5" fill="#7fc56b" />
        <circle cx="72" cy="68" r="5" fill="#7fc56b" />
      </g>,
    ],
  },
  環境: {
    color: '#10B981',
    stages: [
      // Lv1 一棵樹
      <g>
        <line x1="60" y1="80" x2="60" y2="64" stroke="#8a6b46" strokeWidth="3" />
        <circle cx="60" cy="58" r="11" fill="#10B981" />
      </g>,
      // Lv2 小樹林
      <g>
        <circle cx="42" cy="60" r="10" fill="#10B981" />
        <circle cx="60" cy="54" r="13" fill="#0ea271" />
        <circle cx="80" cy="62" r="9" fill="#10B981" />
      </g>,
      // Lv3 森林公園＋湖
      <g>
        <path d="M30 80 Q60 70 90 80" fill="none" stroke="#9bd6ea" strokeWidth="5" strokeLinecap="round" />
        <circle cx="38" cy="58" r="11" fill="#10B981" />
        <circle cx="58" cy="50" r="14" fill="#0ea271" />
        <circle cx="82" cy="60" r="10" fill="#10B981" />
      </g>,
    ],
  },
  飲食: {
    color: '#F97316',
    stages: [
      // Lv1 一個攤位
      <g>
        <rect x="48" y="66" width="24" height="12" fill="#fff" stroke="#e0b483" strokeWidth="1.4" />
        <polygon points="46,66 60,58 74,66" fill="#F97316" />
      </g>,
      // Lv2 熱鬧市集
      <g>
        <rect x="38" y="64" width="20" height="14" fill="#fff" stroke="#e0b483" strokeWidth="1.3" />
        <polygon points="36,64 48,56 60,64" fill="#F97316" />
        <rect x="64" y="62" width="20" height="16" fill="#fff" stroke="#e0b483" strokeWidth="1.3" />
        <polygon points="62,62 74,54 86,62" fill="#fb923c" />
      </g>,
      // Lv3 美食廣場
      <g>
        <rect x="34" y="58" width="52" height="22" fill="#fff" stroke="#e0b483" strokeWidth="1.4" />
        <rect x="34" y="58" width="52" height="6" fill="#F97316" />
        <rect x="40" y="68" width="9" height="12" fill="#fb923c" />
        <rect x="56" y="68" width="9" height="12" fill="#fb923c" />
        <rect x="72" y="68" width="9" height="12" fill="#fb923c" />
      </g>,
    ],
  },
  運動: {
    color: '#EF4444',
    stages: [
      // Lv1 一圈跑道
      <g>
        <ellipse cx="60" cy="74" rx="22" ry="9" fill="none" stroke="#EF4444" strokeWidth="3" />
      </g>,
      // Lv2 球場＋看台
      <g>
        <ellipse cx="60" cy="74" rx="26" ry="11" fill="#fca5a5" opacity="0.4" />
        <ellipse cx="60" cy="74" rx="26" ry="11" fill="none" stroke="#EF4444" strokeWidth="3" />
        <rect x="40" y="58" width="40" height="6" fill="#EF4444" rx="2" />
      </g>,
      // Lv3 巨蛋體育館
      <g>
        <path d="M30 78 Q60 44 90 78 Z" fill="#fca5a5" opacity="0.5" />
        <path d="M30 78 Q60 44 90 78" fill="none" stroke="#EF4444" strokeWidth="3" />
        <ellipse cx="60" cy="78" rx="30" ry="6" fill="#EF4444" opacity="0.25" />
      </g>,
    ],
  },
  壓力與睡眠: {
    color: '#8B5CF6',
    stages: [
      // Lv1 暗著的小塔
      <g>
        <rect x="54" y="58" width="12" height="22" fill="#ede9fe" stroke="#8B5CF6" strokeWidth="1.4" />
        <polygon points="52,58 60,50 68,58" fill="#8B5CF6" />
      </g>,
      // Lv2 點亮的燈塔
      <g>
        <rect x="53" y="50" width="14" height="30" fill="#ede9fe" stroke="#8B5CF6" strokeWidth="1.4" />
        <rect x="53" y="60" width="14" height="5" fill="#8B5CF6" />
        <polygon points="51,50 60,42 69,50" fill="#8B5CF6" />
        <circle cx="60" cy="47" r="3" fill="#fde68a" />
      </g>,
      // Lv3 射出光束
      <g>
        <rect x="52" y="44" width="16" height="38" fill="#ede9fe" stroke="#8B5CF6" strokeWidth="1.5" />
        <rect x="52" y="56" width="16" height="6" fill="#8B5CF6" />
        <polygon points="50,44 60,35 70,44" fill="#8B5CF6" />
        <circle cx="60" cy="41" r="3.5" fill="#fde68a" />
        <path d="M60 41 L92 30 M60 41 L92 52" stroke="#fde68a" strokeWidth="2.5" opacity="0.7" />
      </g>,
    ],
  },
  社交互動: {
    color: '#F43F5E',
    stages: [
      // Lv1 一張長椅
      <g>
        <rect x="48" y="70" width="24" height="6" rx="3" fill="#F43F5E" />
        <line x1="52" y1="76" x2="52" y2="80" stroke="#9a6b46" strokeWidth="2" />
        <line x1="68" y1="76" x2="68" y2="80" stroke="#9a6b46" strokeWidth="2" />
      </g>,
      // Lv2 小咖啡館＋陽傘
      <g>
        <rect x="44" y="60" width="32" height="18" fill="#fff" stroke="#e0b483" strokeWidth="1.4" />
        <rect x="44" y="56" width="32" height="6" fill="#F43F5E" />
        <circle cx="52" cy="52" r="3" fill="#fda4af" />
        <circle cx="68" cy="52" r="3" fill="#fda4af" />
      </g>,
      // Lv3 熱鬧廣場
      <g>
        <ellipse cx="60" cy="80" rx="30" ry="8" fill="#fecdd3" opacity="0.6" />
        <rect x="40" y="58" width="40" height="22" fill="#fff" stroke="#e0b483" strokeWidth="1.4" />
        <rect x="40" y="54" width="40" height="6" fill="#F43F5E" />
        <circle cx="30" cy="74" r="3" fill="#F43F5E" />
        <circle cx="90" cy="74" r="3" fill="#F43F5E" />
      </g>,
    ],
  },
  心靈: {
    color: '#0EA5E9',
    stages: [
      // Lv1 一盞石燈
      <g>
        <rect x="56" y="62" width="8" height="16" fill="#bae6fd" stroke="#0EA5E9" strokeWidth="1.3" />
        <circle cx="60" cy="60" r="4" fill="#0EA5E9" />
      </g>,
      // Lv2 枯山水禪園
      <g>
        <ellipse cx="60" cy="76" rx="24" ry="8" fill="#e0f2fe" />
        <circle cx="48" cy="74" r="3" fill="#bae6fd" />
        <circle cx="72" cy="74" r="4" fill="#bae6fd" />
        <rect x="57" y="58" width="6" height="16" fill="#0EA5E9" />
        <circle cx="60" cy="56" r="4" fill="#7dd3fc" />
      </g>,
      // Lv3 冥想塔（散發光暈）
      <g>
        <polygon points="48,80 60,40 72,80" fill="#bae6fd" stroke="#0EA5E9" strokeWidth="1.5" />
        <line x1="48" y1="66" x2="72" y2="66" stroke="#0EA5E9" strokeWidth="1.5" />
        <line x1="51" y1="54" x2="69" y2="54" stroke="#0EA5E9" strokeWidth="1.5" />
        <circle cx="60" cy="34" r="4" fill="#7dd3fc" />
      </g>,
    ],
  },
  認知與智慧: {
    color: '#3B82F6',
    stages: [
      // Lv1 小書攤
      <g>
        <rect x="50" y="64" width="20" height="14" fill="#dbeafe" stroke="#3B82F6" strokeWidth="1.3" />
        <line x1="56" y1="64" x2="56" y2="78" stroke="#3B82F6" strokeWidth="1" />
        <line x1="64" y1="64" x2="64" y2="78" stroke="#3B82F6" strokeWidth="1" />
      </g>,
      // Lv2 圖書館（列柱）
      <g>
        <rect x="44" y="56" width="32" height="22" fill="#dbeafe" stroke="#3B82F6" strokeWidth="1.4" />
        <polygon points="42,56 60,46 78,56" fill="#3B82F6" />
        <rect x="50" y="64" width="5" height="14" fill="#3B82F6" />
        <rect x="65" y="64" width="5" height="14" fill="#3B82F6" />
      </g>,
      // Lv3 天文台（望遠鏡）
      <g>
        <rect x="48" y="58" width="24" height="22" fill="#dbeafe" stroke="#3B82F6" strokeWidth="1.4" />
        <path d="M48 58 A12 12 0 0 1 72 58 Z" fill="#3B82F6" />
        <line x1="60" y1="46" x2="78" y2="38" stroke="#93c5fd" strokeWidth="3" />
      </g>,
    ],
  },
  職涯與平衡: {
    color: '#64748B',
    stages: [
      // Lv1 小工坊
      <g>
        <rect x="50" y="64" width="20" height="14" fill="#e2e8f0" stroke="#64748B" strokeWidth="1.3" />
        <polygon points="48,64 60,56 72,64" fill="#64748B" />
      </g>,
      // Lv2 辦公樓
      <g>
        <rect x="48" y="52" width="24" height="26" fill="#e2e8f0" stroke="#64748B" strokeWidth="1.4" />
        <rect x="54" y="58" width="5" height="5" fill="#64748B" />
        <rect x="62" y="58" width="5" height="5" fill="#64748B" />
        <rect x="54" y="67" width="5" height="5" fill="#64748B" />
        <rect x="62" y="67" width="5" height="5" fill="#64748B" />
      </g>,
      // Lv3 鐘樓（平衡的時間）
      <g>
        <rect x="52" y="44" width="16" height="38" fill="#e2e8f0" stroke="#64748B" strokeWidth="1.5" />
        <polygon points="50,44 60,34 70,44" fill="#64748B" />
        <circle cx="60" cy="54" r="6" fill="#fff" stroke="#64748B" strokeWidth="1.3" />
        <line x1="60" y1="54" x2="60" y2="50" stroke="#64748B" strokeWidth="1.3" />
        <line x1="60" y1="54" x2="63" y2="55" stroke="#64748B" strokeWidth="1.3" />
      </g>,
    ],
  },
};

function Fallback() {
  return (
    <g>
      <rect x="50" y="62" width="20" height="16" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.4" />
      <polygon points="48,62 60,54 72,62" fill="#9ca3af" />
    </g>
  );
}

export default function DomainLandmark({ domain, level, x = 0, y = 0, scale = 1 }) {
  const entry = LANDMARKS[domain];
  const stage = entry && entry.stages[level - 1];
  return (
    <g
      data-domain={domain}
      data-level={String(level)}
      transform={`translate(${x},${y}) scale(${scale})`}
    >
      {stage || <Fallback />}
    </g>
  );
}

export { LANDMARKS };
