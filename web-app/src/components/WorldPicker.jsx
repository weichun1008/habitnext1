'use client';

import React from 'react';
import { Map, Home, Sparkles, Check, ArrowRight } from 'lucide-react';
import { WORLDS } from '@/lib/worlds';

// Map the registry's icon string → the actual lucide component.
const ICONS = { Map, Home, Sparkles };

const WorldPicker = ({ activeWorld, onSelectWorld, onEnterJourney }) => {
    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">選擇你的世界</h1>
                <p className="text-gray-500 mt-2 text-sm md:text-base">
                    每天完成的習慣，會在你選定的世界裡慢慢長出成果。沒有對錯，隨時可以換。
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {WORLDS.map((w) => {
                    const Icon = ICONS[w.icon] || Map;
                    const isActive = w.key === activeWorld;
                    const isSoon = w.status === 'soon';
                    const isJourney = w.key === 'journey';

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
                                        目前所在
                                    </span>
                                )}
                                {isSoon && (
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                                        即將推出
                                    </span>
                                )}
                            </div>

                            {/* Icon in accent-tinted circle */}
                            <div
                                className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
                                style={{ backgroundColor: `${w.accent}1A`, color: w.accent }}
                            >
                                <Icon size={28} />
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-gray-900">{w.name}</h2>
                            <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-500">{w.tagline}</p>

                            {/* Primary action */}
                            <div className="mt-5" onClick={(e) => e.stopPropagation()}>
                                {isJourney ? (
                                    <button
                                        onClick={() => onEnterJourney()}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-700 hover:gap-3"
                                    >
                                        進入旅程世界
                                        <ArrowRight size={16} />
                                    </button>
                                ) : isActive ? (
                                    <button
                                        disabled
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700"
                                    >
                                        <Check size={16} />
                                        已選定
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onSelectWorld(w.key)}
                                        className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-700"
                                    >
                                        選為我的世界
                                    </button>
                                )}

                                {isSoon && (
                                    <p className="mt-2 text-center text-xs leading-relaxed text-gray-400">
                                        畫面即將推出，先選定後完成的習慣會記到這個世界
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
