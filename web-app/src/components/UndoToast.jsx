'use client';

import React, { useEffect } from 'react';
import { Check, RotateCcw } from 'lucide-react';

// UndoToast — bottom snackbar shown immediately after a task is marked
// complete. Lingers for `durationMs` (default 5000) then auto-dismisses.
// Clicking 還原 calls onUndo() — the parent is responsible for cancelling
// the exit animation and toggling the task back to incomplete.
//
// Inspired by Google Tasks' 完成「X」/ Undo snackbar.
//
// Props:
//   visible   — boolean; toast renders only when true
//   message   — string, e.g. '完成「服用今日保健品」'
//   onUndo    — callback when user taps 還原
//   onDismiss — callback when timer expires or user taps × (optional)
//   durationMs — how long to linger before auto-dismiss (default 5000)
const UndoToast = ({ visible, message, onUndo, onDismiss, durationMs = 5000 }) => {
    // Auto-dismiss timer; reset whenever `message` changes (so consecutive
    // completions each get their own full 5s window).
    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => {
            onDismiss?.();
        }, durationMs);
        return () => clearTimeout(t);
    }, [visible, message, durationMs, onDismiss]);

    if (!visible) return null;

    return (
        <div
            // Pinned bottom-center, above the bottom nav padding (pb-24 in
            // MainApp's main scroller). animate-toast-up plays once on mount.
            className="fixed bottom-6 left-1/2 z-[10100] animate-toast-up"
            style={{ transform: 'translate(-50%, 0)' }}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-full shadow-lg shadow-black/30 min-w-[260px] max-w-[90vw]">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{message}</span>
                <button
                    type="button"
                    onClick={onUndo}
                    className="flex items-center gap-1 text-emerald-300 hover:text-emerald-200 text-sm font-bold flex-shrink-0"
                >
                    <RotateCcw size={14} /> 還原
                </button>
            </div>
        </div>
    );
};

export default UndoToast;
