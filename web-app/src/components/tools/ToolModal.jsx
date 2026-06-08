'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { describeTool } from '@/lib/tools';
import { describeMusic } from '@/lib/musicTool';
import BreathingTool from './BreathingTool';
import TimerTool from './TimerTool';
import MusicTool from './MusicTool';

const TOOL_COMPONENTS = {
    breathing: BreathingTool,
    timer: TimerTool,
    music: MusicTool,
};

export default function ToolModal({ task, onClose, onComplete }) {
    const toolType = task?.toolType;
    const ToolComponent = toolType ? TOOL_COMPONENTS[toolType] : undefined;

    useEffect(() => {
        if (!ToolComponent) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [ToolComponent, onClose]);

    if (!task || !ToolComponent) return null;

    const config = task.toolConfig;
    const title =
        toolType === 'music' ? describeMusic(config) : describeTool(toolType, config);

    const handleComplete = () => {
        onComplete?.(task);
    };

    return (
        <div
            data-testid="tool-modal-backdrop"
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up max-h-[90dvh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
                    <h2 className="font-bold text-gray-800 text-base truncate pr-2">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="關閉"
                        className="tool-modal__close p-2 -mr-2 hover:bg-gray-100 rounded-full text-gray-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    <ToolComponent config={config} onComplete={handleComplete} />
                </div>
            </div>

            <style>{`
                .tool-modal__close {
                    transition: transform 0.15s ease, background 0.15s ease;
                }
                .tool-modal__close:hover {
                    transform: scale(1.08);
                }
                .tool-modal__close:active {
                    transform: scale(0.94);
                }
                @media (prefers-reduced-motion: reduce) {
                    .tool-modal__close { transition: none; }
                    .tool-modal__close:hover { transform: none; }
                }
            `}</style>
        </div>
    );
}
