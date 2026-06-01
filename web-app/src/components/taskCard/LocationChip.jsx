'use client';

import React, { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { searchCities } from '@/lib/cities';

// LocationChip — Slice O. Shows a MapPin + city on a completed card / in TaskDetailModal.
// Tapping opens a small popover to correct the city (recent cities + offline
// search). When the task has no city yet (completed without location), it
// renders a subtle "加地點" affordance instead.
//
// Props:
//   city: string | null          — current city for this date
//   recentCities: string[]       — quick-pick chips (caller supplies)
//   onPick(cityName): void       — persist the chosen/changed city
const LocationChip = ({ city, recentCities = [], onPick }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');

    const results = q.trim() ? searchCities(q) : [];

    const pick = (name) => {
        onPick?.(name);
        setOpen(false);
        setQ('');
    };

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
            >
                <MapPin size={11} />
                {city || '加地點'}
            </button>

            {open && (
                <div
                    className="absolute z-30 mt-1 left-0 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    {recentCities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {recentCities.map(rc => (
                                <button
                                    key={rc}
                                    type="button"
                                    onClick={() => pick(rc)}
                                    className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                >
                                    {rc}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1">
                        <Search size={12} className="text-gray-400" />
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="搜尋城市"
                            className="flex-1 text-[12px] outline-none"
                        />
                    </div>
                    {results.length > 0 && (
                        <div className="mt-1 max-h-40 overflow-y-auto">
                            {results.map(c => (
                                <button
                                    key={`${c.name}-${c.country}`}
                                    type="button"
                                    onClick={() => pick(c.name)}
                                    className="w-full text-left text-[12px] px-2 py-1.5 rounded-lg hover:bg-gray-50"
                                >
                                    {c.name} <span className="text-gray-400">· {c.country}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocationChip;
