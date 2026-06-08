'use client';

import { Package, ExternalLink } from 'lucide-react';

export default function PhysicalToolsList({ items }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="physical-tools rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                <Package size={16} className="text-emerald-500" />
                建議工具
            </h3>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={item.url || `${item.name}-${i}`}>
                        {item.url ? (
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="physical-tools__link inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600"
                            >
                                <span>{item.name}</span>
                                <ExternalLink size={14} />
                            </a>
                        ) : (
                            <span className="text-sm text-gray-600">{item.name}</span>
                        )}
                    </li>
                ))}
            </ul>

            <style>{`
                .physical-tools__link {
                    transition: transform 0.15s ease, color 0.15s ease;
                }
                .physical-tools__link:hover {
                    transform: translateX(2px);
                    color: #047857;
                }
                @media (prefers-reduced-motion: reduce) {
                    .physical-tools__link { transition: none; }
                    .physical-tools__link:hover { transform: none; }
                }
            `}</style>
        </div>
    );
}
