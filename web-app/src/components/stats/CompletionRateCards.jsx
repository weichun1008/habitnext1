import React from 'react';

// CompletionRateCards — Slice I §6.2 widget
// Two side-by-side cards: last 7 days and last 30 days completion rate.
const Card = ({ label, rate }) => {
    const pct = Math.round((rate || 0) * 100);
    return (
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-800">
                {pct}<span className="text-lg text-gray-400 ml-1">%</span>
            </p>
        </div>
    );
};

const CompletionRateCards = ({ rate }) => (
    <div className="flex gap-3">
        <Card label="最近 7 天完成率" rate={rate?.last7} />
        <Card label="最近 30 天完成率" rate={rate?.last30} />
    </div>
);

export default CompletionRateCards;
