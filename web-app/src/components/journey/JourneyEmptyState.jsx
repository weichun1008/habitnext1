'use client';

import { MapPin, Sparkles } from 'lucide-react';
import { useT } from '@/lib/i18n';

function EmptyPlotSvg() {
  const { t } = useT();
  return (
    <svg
      viewBox="0 0 320 200"
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('journey.empty.plotAria')}
    >
      <ellipse cx="160" cy="120" rx="148" ry="68" fill="#cfe8bf" stroke="#a9d49a" strokeWidth="2" />

      {/* 未來的建地：虛線預留地塊 */}
      <rect
        x="70" y="96" width="48" height="36" rx="4"
        fill="none" stroke="#a9d49a" strokeWidth="2" strokeDasharray="6 5"
      />
      <rect
        x="138" y="108" width="56" height="40" rx="4"
        fill="none" stroke="#a9d49a" strokeWidth="2" strokeDasharray="6 5"
      />
      <rect
        x="212" y="92" width="40" height="34" rx="4"
        fill="none" stroke="#a9d49a" strokeWidth="2" strokeDasharray="6 5"
      />

      {/* 小路牌 */}
      <line x1="160" y1="62" x2="160" y2="98" stroke="#a9d49a" strokeWidth="3" strokeLinecap="round" />
      <rect x="132" y="50" width="56" height="20" rx="4" fill="#fdfbf7" stroke="#a9d49a" strokeWidth="2" />
      <line x1="142" y1="60" x2="178" y2="60" stroke="#a9d49a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function JourneyEmptyState({ trackLocationOn, onOpenSettings }) {
  const { t } = useT();
  const isOff = trackLocationOn === false;

  const heading = isOff ? t('journey.empty.startBuilding') : t('journey.empty.waiting');
  const body = isOff ? t('journey.empty.bodyOff') : t('journey.empty.bodyOn');

  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div className="w-full max-w-xs">
        <EmptyPlotSvg />
      </div>

      <h2 className="mt-4 flex items-center gap-2 text-lg font-semibold text-[#0d9488]">
        <Sparkles size={18} aria-hidden="true" />
        {heading}
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6b7280]">
        {body}
      </p>

      {isOff && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0d9488] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          <MapPin size={16} aria-hidden="true" />
          {t('journey.empty.goSettings')}
        </button>
      )}

      {!isOff && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#6b7280]">
          <MapPin size={14} aria-hidden="true" />
          {t('journey.empty.trackingOn')}
        </p>
      )}
    </div>
  );
}
