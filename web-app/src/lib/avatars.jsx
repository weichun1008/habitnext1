// Material 3 Expressive avatar set
//
// 12 hand-built inline SVG avatars designed in Google's Material 3
// Expressive vocabulary — bold organic shapes, asymmetric layouts, vivid
// 2-3 colour combos. Each avatar is a 64×64 SVG with a fully painted
// background so the parent's `rounded-full overflow-hidden` clips it
// cleanly into a circle.
//
// Adding a new one: append to AVATAR_DEFS with a unique id. The id is the
// value stored in User.avatar; never rename existing ids without a data
// migration.

import React from 'react';

const Sunrise = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#FFF0E0" />
        <circle cx="32" cy="42" r="14" fill="#FF7043" />
        <rect x="6" y="44" width="52" height="3.5" rx="1.75" fill="#FF7043" />
        <circle cx="49" cy="16" r="3" fill="#FFD43B" />
    </svg>
);

const Bloom = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#FFC4D1" />
        <circle cx="32" cy="20" r="11" fill="#FF7B9C" />
        <circle cx="20" cy="38" r="11" fill="#FF7B9C" />
        <circle cx="44" cy="38" r="11" fill="#FF7B9C" />
        <circle cx="32" cy="32" r="7" fill="#FFEB99" />
    </svg>
);

const Wave = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#DCEEFF" />
        <path d="M0 40 Q16 24 32 40 T64 40 L64 64 L0 64 Z" fill="#6FB6FF" />
        <circle cx="44" cy="20" r="4" fill="#FFFFFF" />
        <circle cx="14" cy="14" r="2.5" fill="#FFFFFF" />
    </svg>
);

const Sprout = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#D6F0DA" />
        <path d="M32 50 Q14 38 18 22 Q26 30 32 30 Q26 14 32 8 Q38 14 32 30 Q38 30 46 22 Q50 38 32 50 Z" fill="#2F8E55" />
        <circle cx="32" cy="50" r="3" fill="#6B7C2B" />
    </svg>
);

const Crystal = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#ECE5FF" />
        <polygon points="32,10 52,28 32,56 12,28" fill="#7C5BCC" />
        <polygon points="32,10 52,28 32,28" fill="#A993FF" />
        <circle cx="48" cy="14" r="3" fill="#FFD43B" />
    </svg>
);

const Star = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#1F2D5C" />
        <path d="M32 12 Q35 28 50 32 Q35 36 32 52 Q29 36 14 32 Q29 28 32 12 Z" fill="#FFD43B" />
        <circle cx="14" cy="48" r="2.5" fill="#FF7043" />
        <circle cx="50" cy="48" r="2" fill="#FFFFFF" />
    </svg>
);

const Citrus = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#FFF4C2" />
        <circle cx="32" cy="36" r="18" fill="#FF9F36" />
        <path d="M32 20 Q26 12 18 12 Q24 20 30 22 Z" fill="#2F8E55" />
        <circle cx="26" cy="32" r="2" fill="#FFE6A8" />
        <circle cx="38" cy="40" r="2" fill="#FFE6A8" />
    </svg>
);

const Moon = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#2A1F4D" />
        <path d="M40 14 Q22 14 22 32 Q22 50 40 50 Q28 42 28 32 Q28 22 40 14 Z" fill="#FFE9C2" />
        <circle cx="14" cy="20" r="1.5" fill="#FFFFFF" />
        <circle cx="52" cy="44" r="2" fill="#FFFFFF" />
        <circle cx="48" cy="14" r="1" fill="#FFFFFF" />
    </svg>
);

const Heart = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#FFEAE0" />
        <path d="M32 52 Q10 38 10 24 Q10 14 20 14 Q28 14 32 22 Q36 14 44 14 Q54 14 54 24 Q54 38 32 52 Z" fill="#FF5A6E" />
        <circle cx="24" cy="22" r="3" fill="#FFFFFF" opacity="0.7" />
    </svg>
);

const Mountain = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#FFE7A8" />
        <circle cx="48" cy="18" r="7" fill="#FFB347" />
        <path d="M0 56 L20 28 L34 44 L44 32 L64 56 Z" fill="#2F5C3F" />
        <path d="M20 28 L28 38 L24 38 L20 36 Z" fill="#FFFFFF" />
    </svg>
);

const Cloud = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#A6D8FF" />
        <ellipse cx="32" cy="38" rx="22" ry="11" fill="#FFFFFF" />
        <circle cx="22" cy="32" r="9" fill="#FFFFFF" />
        <circle cx="38" cy="28" r="11" fill="#FFFFFF" />
        <circle cx="14" cy="14" r="3" fill="#FFD43B" />
    </svg>
);

const Berry = () => (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" fill="#FAE1F0" />
        <circle cx="24" cy="40" r="10" fill="#A0317A" />
        <circle cx="40" cy="40" r="10" fill="#A0317A" />
        <circle cx="32" cy="28" r="10" fill="#A0317A" />
        <path d="M32 18 Q34 10 44 10 Q40 18 34 20 Z" fill="#2F8E55" />
    </svg>
);

export const AVATAR_DEFS = [
    { id: 'sunrise', label: '日出', Component: Sunrise },
    { id: 'bloom', label: '花苞', Component: Bloom },
    { id: 'wave', label: '海浪', Component: Wave },
    { id: 'sprout', label: '新芽', Component: Sprout },
    { id: 'crystal', label: '晶石', Component: Crystal },
    { id: 'star', label: '繁星', Component: Star },
    { id: 'citrus', label: '柑橘', Component: Citrus },
    { id: 'moon', label: '月夜', Component: Moon },
    { id: 'heart', label: '心動', Component: Heart },
    { id: 'mountain', label: '山林', Component: Mountain },
    { id: 'cloud', label: '雲朵', Component: Cloud },
    { id: 'berry', label: '莓果', Component: Berry },
];

const AVATAR_BY_ID = Object.fromEntries(AVATAR_DEFS.map(a => [a.id, a]));

export const getAvatarDef = (id) => AVATAR_BY_ID[id] || null;
export const DEFAULT_AVATAR_ID = 'sunrise';
