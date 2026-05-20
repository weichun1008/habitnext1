// src/components/explore/LUCIDE_ICONS.js
// Whitelist of Lucide icon names usable for HabitCategory.icon.
// Keep in sync with prisma/seed/genesis-io.json. Add more as needed.

import {
  Dna,
  Leaf,
  Utensils,
  Dumbbell,
  Moon,
  Users,
  Sparkles,
  BrainCircuit,
  Briefcase,
  Tag,
  // ★ Slice H additions for sleep types
  Brain,
  Sunrise,
  Apple,
  Thermometer,
} from 'lucide-react';

export const LUCIDE_ICON_MAP = {
  Dna,
  Leaf,
  Utensils,
  Dumbbell,
  Moon,
  Users,
  Sparkles,
  BrainCircuit,
  Briefcase,
  Tag,
  Brain,
  Sunrise,
  Apple,
  Thermometer,
};

export const FALLBACK_ICON = Tag;

export const SEEDED_ICON_NAMES = [
  'Dna', 'Leaf', 'Utensils', 'Dumbbell', 'Moon',
  'Users', 'Sparkles', 'BrainCircuit', 'Briefcase',
];
