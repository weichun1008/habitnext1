'use client';

import React from 'react';
import { Map, Home, Sparkles, Check, ArrowRight } from 'lucide-react';
import { WORLDS } from '@/lib/worlds';
import FigureCreature from '@/components/worlds/FigureCreature';
import { useT } from '@/lib/i18n';

// Map the registry's icon string → the actual lucide component.
const ICONS = { Map, Home, Sparkles };
// Worlds with a bespoke illustration instead of a flat lucide icon.
const CUSTOM_ART = { figure: FigureCreature };

const WorldPicker = ({ activeWorld, onSelectWorld, onEnterWorld }) => {
    const { t } = useT();
    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('worldPicker.title')}</h1>
                <p className="text-gray-500 mt-2 text-sm md:text-base">
                    {t('worldPicker.subtitle')}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {WORLDS.map((w) => {
                    const Icon = ICONS[w.icon] || Map;
                    const Art = CUSTOM_ART[w.key];
                    const isActive = w.key === activeWorld;
                    const isSoon = w.status === 'soon';
                    const isAvailable = w.status === 'available';

                    const handleCardSelect = () => onSelectWorld(w.key);

                    return (
                        <div
                            key={w.key}
                            data-world={w.key}
                            onClick={handleCardSelect}
                            className={`group relative flex flex-col rounded-2xl bg-white p-6 text-left shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg ${
                                isActive ? 'ring-2 ring-teal-500 shadow-md' : 'ring-1 ring-gray-100'
                            }`}
                        >
                            {/* Badges */}
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                                {isActive && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                                        <Check size={12} />
                                        {t('worldPicker.current')}
                                    </span>
                                )}
                                {isSoon && (
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                                        {t('worldPicker.comingSoon')}
                                    </span>
                                )}
                            </div>

                            {/* Bespoke illustration (figure creature) or accent-tinted lucide icon */}
                            <div
                                className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
                                style={{ backgroundColor: `${w.accent}1A`, color: w.accent }}
                            >
                                {Art ? <Art size={46} /> : <Icon size={28} />}
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-gray-900">{t(w.nameKey)}</h2>
                            <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-500">{t(w.taglineKey)}</p>

                            {/* Primary action */}
                            <div className="mt-5" onClick={(e) => e.stopPropagation()}>
                                {isAvailable ? (
                                    <button
                                        onClick={() => onEnterWorld(w.key)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:gap-3 hover:brightness-95"
                                        style={{ backgroundColor: w.accent }}
                                    >
                                        {t('worldPicker.enterWorld', { name: t(w.nameKey) })}
                                        <ArrowRight size={16} />
                                    </button>
                                ) : isActive ? (
                                    <button
                                        disabled
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700"
                                    >
                                        <Check size={16} />
                                        {t('worldPicker.selected')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onSelectWorld(w.key)}
                                        className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-700"
                                    >
                                        {t('worldPicker.chooseAsMyWorld')}
                                    </button>
                                )}

                                {isSoon && (
                                    <p className="mt-2 text-center text-xs leading-relaxed text-gray-400">
                                        {t('worldPicker.soonNote')}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WorldPicker;
