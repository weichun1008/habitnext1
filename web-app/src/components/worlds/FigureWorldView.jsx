'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import FigureCreature from '@/components/worlds/FigureCreature';

const CORAL = '#f97362';

// 公仔世界 — your companion creature growing with your completion count.
// Read-only. data = { count, stage:{stage,name,min}, progress:{stage,name,
// nextName,remaining} }, may be null while loading / before any completion.
const FigureWorldView = ({ data, loading }) => {
    if (loading) {
        return (
            <div className="max-w-md mx-auto animate-pulse">
                <div className="rounded-3xl bg-gray-100 p-10 flex flex-col items-center gap-6">
                    <div className="h-44 w-44 rounded-full bg-gray-200" />
                    <div className="h-5 w-24 rounded bg-gray-200" />
                    <div className="h-3 w-40 rounded bg-gray-200" />
                    <div className="h-2 w-full rounded-full bg-gray-200" />
                </div>
            </div>
        );
    }

    if (!data || !data.stage) {
        return (
            <div className="max-w-md mx-auto animate-fade-in-up">
                <div
                    className="rounded-3xl p-10 flex flex-col items-center text-center"
                    style={{ background: `radial-gradient(circle at 50% 35%, #fff7f5, #ffe9e3)` }}
                >
                    <FigureCreature stage={1} size={160} />
                    <p className="mt-6 text-base font-medium text-gray-700">
                        完成習慣，你的夥伴會開始成長
                    </p>
                </div>
            </div>
        );
    }

    const { count, stage, progress } = data;
    const hasNext = !!progress?.nextName;

    // Fraction toward the next stage: completions accrued within the current
    // stage band over the band's width. Bounded [0,1]; safe when min == next.
    let fraction = 1;
    if (hasNext) {
        const next = progress.remaining;
        const span = next + (count - stage.min);
        fraction = span > 0 ? Math.max(0, Math.min(1, (count - stage.min) / span)) : 0;
    }

    return (
        <div className="max-w-md mx-auto animate-fade-in-up">
            <div
                className="rounded-3xl p-10 flex flex-col items-center text-center"
                style={{ background: `radial-gradient(circle at 50% 35%, #fff7f5, #ffe9e3)` }}
            >
                <FigureCreature stage={stage.stage} size={200} />

                <h1 className="mt-6 text-2xl font-bold text-gray-900">{stage.name}</h1>
                <p className="mt-1 text-sm text-gray-500">已完成 {count} 次</p>

                <div className="mt-7 w-full">
                    {hasNext ? (
                        <>
                            <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700">
                                <Sparkles size={15} style={{ color: CORAL }} />
                                再 {progress.remaining} 次完成，夥伴會進化到 {progress.nextName}
                            </p>
                            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/70">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.round(fraction * 100)}%`, backgroundColor: CORAL }}
                                />
                            </div>
                        </>
                    ) : (
                        <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700">
                            <Sparkles size={15} style={{ color: CORAL }} />
                            夥伴已經完全長大，謝謝你一路的陪伴
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FigureWorldView;
