'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';

// TaskHoverDots — desktop-only (hidden via `md:block` on parent).
// Shows a ⋮ button on the card's right edge, vertically centered (trailing
// kebab, like Gmail/Drive list rows) while the parent card is hovered —
// kept clear of the completion checkmark in the top-right corner. Clicking
// opens a popover with the shared action menu.
//
// Popover closes on: click outside, Esc key, or after a successful action.
//
// Props:
//   children: the popover body (TaskActionMenu variant='popover')
//   hoverDelayMs: how long the mouse must rest on the card before ⋮ fades in (default 100)
const TaskHoverDots = ({ children, hoverDelayMs = 100 }) => {
    const [hovered, setHovered] = useState(false);
    const [open, setOpen] = useState(false);
    const timerRef = useRef(null);
    const wrapperRef = useRef(null);

    // Hover delay
    const onEnter = () => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setHovered(true), hoverDelayMs);
    };
    const onLeave = () => {
        clearTimeout(timerRef.current);
        if (!open) setHovered(false);
    };

    // Click-outside + Esc to close popover
    useEffect(() => {
        if (!open) return;
        const onDocClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setHovered(false);
            }
        };
        const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setHovered(false); } };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <div
            ref={wrapperRef}
            className="hidden md:block absolute top-1/2 -translate-y-1/2 right-2 z-20"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
        >
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className={`w-6 h-6 rounded-full bg-gray-50/95 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-opacity ${
                    hovered || open ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                aria-label="任務選項"
            >
                <MoreVertical size={14} />
            </button>
            {open && (
                <div className="absolute top-7 right-0">
                    {children}
                </div>
            )}
        </div>
    );
};

export default TaskHoverDots;
