// src/lib/constants.js
//
// CATEGORY_CONFIG: visual style metadata for habit task icons.
//
// As of 2026-05-22 (PR D, Material Symbols migration) every entry is rendered
// via Material Symbols Rounded — no more emoji / Lucide mix. Each key here
// is referenced from OfficialHabit.icon (admin) and Task.category (visual
// style) via IconRenderer. The Material symbol names below come from
// Google's Material Symbols set: https://fonts.google.com/icons
//
// To add a new key:
//   1. Pick a name from the Material Symbols catalog.
//   2. Pair it with a tailwind color (text-X-500) + bg (bg-X-50).
//   3. Add a short label (used in admin pickers).

export const CATEGORY_CONFIG = {
    droplet:    { type: 'material', name: 'water_drop',       color: 'text-blue-500',    bg: 'bg-blue-50',    label: '飲水' },
    footprints: { type: 'material', name: 'directions_walk',  color: 'text-pink-500',    bg: 'bg-pink-50',    label: '步數' },
    dumbbell:   { type: 'material', name: 'fitness_center',   color: 'text-orange-500',  bg: 'bg-orange-50',  label: '運動' },
    moon:       { type: 'material', name: 'bedtime',          color: 'text-indigo-500',  bg: 'bg-indigo-50',  label: '睡眠' },
    sun:        { type: 'material', name: 'wb_sunny',         color: 'text-yellow-500',  bg: 'bg-yellow-50',  label: '陽光' },
    pill:       { type: 'material', name: 'medication',       color: 'text-purple-500',  bg: 'bg-purple-50',  label: '保健' },
    aperture:   { type: 'material', name: 'monitoring',       color: 'text-fuchsia-500', bg: 'bg-fuchsia-50', label: '紀錄' },
    users:      { type: 'material', name: 'groups',           color: 'text-rose-500',    bg: 'bg-rose-50',    label: '社交' },
    briefcase:  { type: 'material', name: 'work',             color: 'text-slate-500',   bg: 'bg-slate-50',   label: '職涯' },
    apple:      { type: 'material', name: 'restaurant',       color: 'text-red-500',     bg: 'bg-red-50',     label: '飲食' },
    zap:        { type: 'material', name: 'bolt',             color: 'text-yellow-600',  bg: 'bg-yellow-50',  label: '專注' },
    yoga:       { type: 'material', name: 'self_improvement', color: 'text-green-500',   bg: 'bg-green-50',   label: '冥想' },
    book:       { type: 'material', name: 'menu_book',        color: 'text-amber-600',   bg: 'bg-amber-50',   label: '閱讀' },
    money:      { type: 'material', name: 'payments',         color: 'text-lime-600',    bg: 'bg-lime-50',    label: '理財' },
    journal:    { type: 'material', name: 'edit_note',        color: 'text-sky-500',     bg: 'bg-sky-50',     label: '日記' },
    star:       { type: 'material', name: 'star',             color: 'text-gray-400',    bg: 'bg-gray-50',    label: '其他' },
};

// Map from the 9 GENESIS+IO HabitCategory names to a CATEGORY_CONFIG key.
// Templates seed tasks with Task.category = '飲食' / '運動' / ... so IconRenderer
// has to translate those domain names back to a CATEGORY_CONFIG key.
// See: prisma/seed/genesis-io.json for the canonical 9 domain names.
export const DOMAIN_TO_ICON_KEY = {
    '基因與腸道':  'pill',
    '環境':       'sun',
    '飲食':       'apple',
    '運動':       'dumbbell',
    '壓力與睡眠': 'moon',
    '社交互動':   'users',
    '心靈':       'yoga',
    '認知與智慧': 'book',
    '職涯與平衡': 'briefcase',
};

export function domainToIconKey(domainName) {
    return DOMAIN_TO_ICON_KEY[domainName] || 'star';
}

// resolveIconKey — single source of truth for "give me the CATEGORY_CONFIG
// key for this value". Accepts either:
//   - a CATEGORY_CONFIG key directly (e.g. 'apple', 'moon') — returned as-is
//   - a HabitCategory name (e.g. '飲食', '運動') — translated via DOMAIN_TO_ICON_KEY
//   - falsy / unknown — returns 'star' as fallback
//
// Use this before any direct CATEGORY_CONFIG[...] lookup that reads .bg / .color
// outside of IconRenderer (which does the same fallback internally for icons).
// Prevents the "config = CATEGORY_CONFIG['飲食']" footgun where the lookup
// silently fails because '飲食' isn't a config key, leaving everything gray.
export function resolveIconKey(value) {
    if (!value) return 'star';
    if (CATEGORY_CONFIG[value]) return value;
    return DOMAIN_TO_ICON_KEY[value] || 'star';
}

export const OFFICIAL_TASKS = [
    {
        id: 'template_water', type: 'quantitative', category: 'droplet',
        title: '飲水 2000 cc', dailyTarget: 2000, unit: 'cc', stepValue: 200, frequency: 'daily',
        recurrence: { type: 'daily', interval: 1, endType: 'never', weekDays: [], monthType: 'date', periodTarget: 1, dailyLimit: true },
        details: '科學建議每日飲水 2000cc，有助於新陳代謝。',
        science: '飲水不足會影響腎臟功能及消化系統。',
        tool: '定時提醒 App (可選)', recommend: '200 cc / 次'
    },
    {
        id: 'template_steps', type: 'quantitative', category: 'footprints',
        title: '健走 8000 步', dailyTarget: 8000, unit: '步', stepValue: 1000, frequency: 'daily',
        recurrence: { type: 'daily', interval: 1, endType: 'never', weekDays: [], monthType: 'date', periodTarget: 1, dailyLimit: true },
        details: '世界衛生組織建議，每日達 8000 步可維持基本活動量。',
        science: '規律步行能降低心血管疾病風險。',
        tool: '手機計步器', recommend: '飯後散步 20 分鐘'
    },
    {
        id: 'template_weekly_review', type: 'binary', category: 'journal',
        title: '每週健康回顧', frequency: 'weekly',
        recurrence: { type: 'weekly', mode: 'specific_days', interval: 1, weekDays: [0], endType: 'never', monthType: 'date', periodTarget: 1, dailyLimit: true },
        details: '檢視本週的飲食與運動狀況，調整下週計畫。',
        science: '定期回顧能提升目標達成率 40%。',
        tool: '筆記本', recommend: '週日晚上'
    },
];
