'use client';

import { useState } from 'react';
import CityScene from '@/components/journey/CityScene';
import CityInfoPanel from '@/components/journey/CityInfoPanel';
import WorldOverview from '@/components/journey/WorldOverview';
import JourneyEmptyState from '@/components/journey/JourneyEmptyState';

function CityDetail({ cityData }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="w-full md:flex-1">
        <CityScene cityData={cityData} />
      </div>
      <div className="w-full md:w-80 md:shrink-0">
        <CityInfoPanel cityData={cityData} />
      </div>
    </div>
  );
}

export default function JourneyView({ data, trackLocationOn, loading, onOpenSettings }) {
  const cities = data?.cities || [];
  const [selectedCity, setSelectedCity] = useState(data?.homeCity || cities[0]?.city);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-48 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (cities.length === 0) {
    return <JourneyEmptyState trackLocationOn={trackLocationOn} onOpenSettings={onOpenSettings} />;
  }

  if (cities.length === 1) {
    return (
      <div className="p-4">
        <CityDetail cityData={cities[0]} />
      </div>
    );
  }

  const active = cities.find((c) => c.city === selectedCity) || cities[0];

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => {
          const isActive = c.city === active.city;
          return (
            <button
              key={c.city}
              type="button"
              onClick={() => setSelectedCity(c.city)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {c.city}
            </button>
          );
        })}
      </div>

      <WorldOverview cities={cities} onSelectCity={setSelectedCity} />

      <CityDetail cityData={active} />
    </div>
  );
}
