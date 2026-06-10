'use client';

import React from 'react';
import { MapPin, Camera } from 'lucide-react';
import IconRenderer from '@/components/IconRenderer';
import { nextTierProgress } from '@/lib/journeyWorld';
import { useT } from '@/lib/i18n';
import { translateDomain } from '@/lib/i18n/dataLabels';

const CityInfoPanel = ({ cityData, userId }) => {
  const { t } = useT();
  if (!cityData) return null;
  const { city, total, tier, domains = [], pins = [] } = cityData;
  const { nextTier, remaining } = nextTierProgress(total);
  const photoCount = pins.filter((p) => p.hasPhoto).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900">{city}</h3>
        <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-medium text-white">
          {t(`journey.tiers.${tier}`)}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-gray-700">
          {t('journey.panel.totalPrefix')} <span className="font-semibold text-gray-900">{total}</span> {t('journey.panel.totalSuffix')}
        </p>
        <p className="text-xs text-gray-500">
          {nextTier
            ? t('journey.panel.toNextTier', { n: remaining, tier: t(`journey.tiers.${nextTier}`) })
            : t('journey.panel.maxTier')}
        </p>
        {photoCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Camera size={14} className="shrink-0 text-teal-600" />
            <span>{t('journey.panel.foodMemories', { city, n: photoCount })}</span>
          </div>
        )}
      </div>

      {domains.length > 0 && (
        <ul className="space-y-2">
          {domains.map((d) => (
            <li key={d.domain} className="flex items-center gap-2 text-sm">
              <IconRenderer category={d.domain} size={18} />
              <span className="font-medium text-gray-800">{translateDomain(d.domain, t)}</span>
              <span className="ml-auto text-xs text-gray-500">
                {t('journey.panel.flagshipInfo', { level: d.flagshipLevel, count: d.buildingCount })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pins.length > 0 && (
        <div className="space-y-1.5 border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-500">{t('journey.panel.recent')}</p>
          <ul className="space-y-1.5">
            {pins.map((p, i) => (
              <li key={`${p.date}-${i}`} className="flex items-center gap-2 text-xs text-gray-600">
                {p.hasPhoto ? (
                  <img
                    src={userId ? `/api/memory/${p.id}?userId=${encodeURIComponent(userId)}` : `/api/memory/${p.id}`}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <MapPin size={14} className="shrink-0 text-teal-600" />
                )}
                <span className="text-gray-400">{p.date}</span>
                <span className="truncate text-gray-800">{p.title}</span>
                <span className="ml-auto shrink-0 text-gray-400">{translateDomain(p.domain, t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CityInfoPanel;
