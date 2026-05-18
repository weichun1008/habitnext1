"use client";

import React from 'react';
import CategoryIcon from './CategoryIcon';

function hexToTintBg(hex) {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return '#F3F4F6';
  return hex + '1A';
}

export default function DomainGrid({ categories, onSelect }) {
  const sorted = [...categories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {sorted.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat)}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-white active:scale-95"
          style={{ minHeight: 110 }}
        >
          <div
            className="p-3 rounded-full flex items-center justify-center"
            style={{ backgroundColor: hexToTintBg(cat.color) }}
          >
            <CategoryIcon name={cat.icon} size={24} style={{ color: cat.color || '#374151' }} />
          </div>
          <span className="text-sm font-bold text-gray-800 text-center leading-tight">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
