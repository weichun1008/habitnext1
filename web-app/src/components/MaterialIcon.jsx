import React from 'react';

// MaterialIcon — thin wrapper around Material Symbols Rounded.
//
// Renders Google's variable icon font as a styled <span>. The font is
// loaded globally from src/app/layout.js, so any name from the Material
// Symbols set (https://fonts.google.com/icons) just works:
//
//   <MaterialIcon name="restaurant" size={24} className="text-emerald-500" />
//
// Props:
//   - name (required): the Material Symbol identifier, e.g. "restaurant"
//   - size: rendered pixel size (default 24). Maps to font-size AND opsz axis.
//   - filled: switch to the filled variant (default false → outlined)
//   - weight: 300 / 400 / 500 / 600 (default 400)
//   - className: extra Tailwind classes (color, alignment, etc.)
//
const MaterialIcon = ({
    name,
    size = 24,
    filled = false,
    weight = 400,
    className = '',
}) => {
    if (!name) return null;
    return (
        <span
            aria-hidden="true"
            className={`material-symbols-rounded ${className}`}
            style={{
                fontSize: `${size}px`,
                fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
            }}
        >
            {name}
        </span>
    );
};

export default MaterialIcon;
