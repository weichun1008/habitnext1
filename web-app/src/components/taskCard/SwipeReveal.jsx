'use client';

import React, { useRef, useState } from 'react';

// SwipeReveal — wraps a child card and adds mobile-only swipe gestures.
//
// Left swipe (≥ `threshold`, default 80px) reveals `rightActions` pinned to
// the right edge of the card (used for 暫停 / 刪除 menus). If `rightActions`
// is null / undefined, left-swipe is disabled — the card won't shift left
// at all and no reveal bg is rendered. This is how we suppress the
// pause / delete affordance on past or already-completed cards.
//
// Right swipe (≥ threshold) fires `onSwipeRight` immediately (typically a
// mark-complete or un-toggle shortcut). During the swipe a small icon hint
// (`rightHintIcon`) fades in on the LEFT edge so the user sees what's
// about to happen — without that hint the gesture is invisible/unguessable.
//
// On desktop (no touch events) the component is a passthrough — children
// render as-is. Desktop uses TaskHoverDots for the same action menu.
//
// Props:
//   children       — the card body (always rendered)
//   rightActions   — ReactNode shown when left-swipe reveals; null disables it
//   onSwipeRight() — optional, called after a right swipe past `threshold`
//   rightHintIcon  — ReactNode shown on the LEFT edge during right swipe,
//                    opacity scales with translateX. Pass an emerald/amber
//                    icon so users see the intent at ~30px swipe.
//   threshold      — swipe distance to commit (default 80)
const SwipeReveal = ({ children, rightActions, onSwipeRight, rightHintIcon, threshold = 80 }) => {
    const [revealed, setRevealed] = useState(false);
    const startX = useRef(null);
    const startY = useRef(null);
    const currentDx = useRef(0);
    const [translateX, setTranslateX] = useState(0);

    const hasLeftReveal = !!rightActions;
    const hasRightAction = !!onSwipeRight;

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
        if (dx < 0) {
            // Left swipe — only if there are actions to reveal.
            if (!hasLeftReveal) return;
            setTranslateX(Math.max(dx, -140));
        } else {
            // Right swipe — only if there's a handler (otherwise no visual cue).
            if (!hasRightAction) return;
            setTranslateX(Math.min(dx, 60));
        }
    };

    const handleTouchEnd = () => {
        const dx = currentDx.current;
        startX.current = null;
        startY.current = null;
        currentDx.current = 0;
        if (dx <= -threshold && hasLeftReveal) {
            setRevealed(true);
            setTranslateX(-140);
        } else if (dx >= threshold && hasRightAction) {
            setRevealed(false);
            setTranslateX(0);
            onSwipeRight?.();
        } else {
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

    // Right-swipe hint opacity scales linearly with translateX, full at 40px
    // (well before the 80px commit threshold so user sees intent early).
    const hintOpacity = translateX > 0 ? Math.min(translateX / 40, 1) : 0;

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Right-swipe hint slot — sits on the LEFT side, peeks out when
                the card shifts right. Pointer-events-none so it never blocks
                tap targets on the card. */}
            {rightHintIcon && hintOpacity > 0 && (
                <div
                    className="absolute inset-y-0 left-0 flex items-center justify-start pl-5 pointer-events-none"
                    style={{ opacity: hintOpacity, width: 80 }}
                    aria-hidden
                >
                    {rightHintIcon}
                </div>
            )}

            {/* Left-swipe action slot — sits on the RIGHT side, revealed by
                left swipe. Only mounted when rightActions is provided. */}
            {rightActions && (
                <div className="absolute inset-y-0 right-0 flex items-stretch" aria-hidden={!revealed}>
                    {rightActions}
                </div>
            )}

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
