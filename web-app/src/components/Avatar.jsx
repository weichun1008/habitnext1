"use client";

import React from 'react';
import { getAvatarDef } from '@/lib/avatars';

// Renders the user's chosen Material 3 Expressive avatar inside a rounded
// container. Falls back to the nickname/name initial when the user hasn't
// picked one yet (or chose an id we no longer ship).
//
// Pass `size` as a Tailwind size class pair, e.g. "w-8 h-8" (header) or
// "w-20 h-20" (profile modal preview).
const Avatar = ({ user, size = 'w-8 h-8', className = '' }) => {
    const def = user?.avatar ? getAvatarDef(user.avatar) : null;
    const initial = user?.nickname?.[0] || user?.name?.[0] || 'U';

    return (
        <div
            className={`${size} rounded-full overflow-hidden border border-gray-100 flex items-center justify-center bg-gray-100 ${className}`}
            aria-label={def ? `${def.label} 頭像` : '預設頭像'}
        >
            {def
                ? <def.Component />
                : <span className="text-xs text-gray-500 font-bold">{initial}</span>}
        </div>
    );
};

export default Avatar;
