// src/components/explore/CategoryIcon.jsx
import React from 'react';
import { LUCIDE_ICON_MAP, FALLBACK_ICON } from './LUCIDE_ICONS';

export default function CategoryIcon({ name, size = 24, className = '', style }) {
  const Icon = (name && LUCIDE_ICON_MAP[name]) || FALLBACK_ICON;
  return <Icon size={size} className={className} style={style} />;
}
