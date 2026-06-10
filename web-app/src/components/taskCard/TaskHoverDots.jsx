'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { useT } from '@/lib/i18n';

// TaskHoverDots — desktop-only (hidden via `md:block`).
// A kebab (⋮) rendered inline in the card's top-right cluster, to the LEFT of
// the completion control (with a flex gap), so it never overlaps the check
// circle — an earlier absolute-centered version collided with it on short cards.
//
// Visibility is driven by the PARENT card's hover via Tailwind `group-hover`
// (the card carries `group`), so the button appears the moment the cursor is
// anywhere over the card — not only when it rests on the right edge. It's a
// solid white pill with a shadow so it reads as a real, tappable control.
//
// The popover is rendered through a portal to document.body with fixed
// coordinates measured from the button, so the card's `overflow-hidden` can't
// clip it. Closes on click outside, Esc, or after a successful action.
//
// Props:
//   children: the popover body (TaskActionMenu variant='popover')
const TaskHoverDots = ({ children }) => {
    const { t } = useT();
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState(null); // { top, right } in viewport px
    const wrapperRef = useRef(null);
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    const openMenu = () => {
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
        setOpen(true);
    };

    // Click-outside + Esc to close popover. The portal menu lives outside
    // wrapperRef, so check menuRef too before treating a click as "outside".
    useEffect(() => {
        if (!open) return;
        const onDocClick = (e) => {
            const inWrapper = wrapperRef.current && wrapperRef.current.contains(e.target);
            const inMenu = menuRef.current && menuRef.current.contains(e.target);
            if (!inWrapper && !inMenu) setOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div
            ref={wrapperRef}
            className="hidden md:block flex-shrink-0"
        >
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openMenu(); }}
                className={`w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-105 transition-all ${
                    open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                aria-label={t('taskCard.taskOptions')}
            >
                <MoreVertical size={18} />
            </button>
            {open && coords && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[60]"
                    style={{ top: coords.top, right: coords.right }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>,
                document.body,
            )}
        </div>
    );
};

export default TaskHoverDots;
