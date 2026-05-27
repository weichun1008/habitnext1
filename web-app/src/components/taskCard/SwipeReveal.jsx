'use client';

import React, { useRef, useState } from 'react';

// SwipeReveal — wraps a child card and adds mobile-only swipe gestures.
// Left swipe (≥ 80px) reveals `rightActions` slot pinned to the right of the
// card; tapping outside or the card itself closes it. Right swipe (≥ 80px)
// fires `onSwipeRight` immediately (used for mark-complete shortcut).
//
// On desktop (no touch events), the component is a passthrough — `children`
// renders as-is and `rightActions` is hidden. Desktop uses TaskHoverDots
// instead for the same action menu.
//
// Props:
//   children: the card body
//   rightActions: ReactNode rendered when revealed (TaskActionMenu variant=swipe)
//   onSwipeRight(): optional, called after a ≥80px rightward swipe
//   threshold (default 80)
const SwipeReveal = ({ children, rightActions, onSwipeRight, threshold = 80 }) => {
    const [revealed, setRevealed] = useState(false);
    const startX = useRef(null);
    const startY = useRef(null);
    const currentDx = useRef(0);
    const [translateX, setTranslateX] = useState(0);

    const handleTouchStart = (e) => {
        const t = e.touches[0];
        startX.current = t.clientX;
        startY.current = t.clientY;
        currentDx.current = 0;
    };

    const handleTouchMove = (e) => {
        if (startX.current === null) return;
        const t = e.touches[0];
        const dx = t.clientX - startX.current;
        const dy = t.clientY - startY.current;
        // If vertical scroll dominates, bail (let the page scroll)
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
            startX.current = null;
            setTranslateX(0);
            return;
        }
        currentDx.current = dx;
        // Allow left swipe to reveal (negative tx), cap at action width
        // Right swipe shows visual hint (positive tx, capped at 60)
        if (dx < 0) {
            setTranslateX(Math.max(dx, -140));
        } else {
            setTranslateX(Math.min(dx, 60));
        }
    };

    const handleTouchEnd = () => {
        const dx = currentDx.current;
        startX.current = null;
        startY.current = null;
        currentDx.current = 0;
        if (dx <= -threshold) {
            setRevealed(true);
            setTranslateX(-140);
        } else if (dx >= threshold) {
            // Spring back, fire mark-complete
            setRevealed(false);
            setTranslateX(0);
            onSwipeRight?.();
        } else {
            // Snap back
            setRevealed(false);
            setTranslateX(0);
        }
    };

    const handleTapToClose = () => {
        if (revealed) {
            setRevealed(false);
            setTranslateX(0);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Right actions slot — sits behind the card, revealed by left swipe */}
            <div className="absolute inset-y-0 right-0 flex items-stretch" aria-hidden={!revealed}>
                {rightActions}
            </div>
            {/* Card content — translates horizontally on swipe */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleTapToClose}
                style={{ transform: `translateX(${translateX}px)`, transition: startX.current === null ? 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none' }}
                className="relative bg-transparent"
            >
                {children}
            </div>
        </div>
    );
};

export default SwipeReveal;
