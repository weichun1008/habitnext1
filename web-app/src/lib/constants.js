import {
    Droplet, Footprints, Dumbbell, Moon, Sun, Pill, Aperture, Book, Star, Users, Briefcase
} from 'lucide-react';

export const CATEGORY_CONFIG = {
    // Lucide Icons
    droplet: { type: 'icon', value: Droplet, color: 'text-blue-500', bg: 'bg-blue-50', label: '飲水' },
    footprints: { type: 'icon', value: Footprints, color: 'text-pink-500', bg: 'bg-pink-50', label: '步數' },
    dumbbell: { type: 'icon', value: Dumbbell, color: 'text-orange-500', bg: 'bg-orange-50', label: '運動' },
    moon: { type: 'icon', value: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50', label: '睡眠' },
    sun: { type: 'icon', value: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50', label: '陽光' },
    pill: { type: 'icon', value: Pill, color: 'text-purple-500', bg: 'bg-purple-50', label: '保健' },
    aperture: { type: 'icon', value: Aperture, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50', label: '紀錄' },
    users: { type: 'icon', value: Users, color: 'text-rose-500', bg: 'bg-rose-50', label: '社交' },
    briefcase: { type: 'icon', value: Briefcase, color: 'text-slate-500', bg: 'bg-slate-50', label: '職涯' },

    // Emojis
    apple: { type: 'emoji', value: '🍎', color: 'text-red-500', bg: 'bg-red-50', label: '飲食' },
    zap: { type: 'emoji', value: '⚡️', color: 'text-yellow-500', bg: 'bg-yellow-50', label: '專注' },
    yoga: { type: 'emoji', value: '🧘', color: 'text-green-500', bg: 'bg-green-50', label: '冥想' },
    book: { type: 'icon', value: Book, color: 'text-amber-500', bg: 'bg-amber-50', label: '閱讀' },
    money: { type: 'emoji', value: '💰', color: 'text-lime-500', bg: 'bg-lime-50', label: '理財' },
    journal: { type: 'emoji', value: '✍️', color: 'text-sky-500', bg: 'bg-sky-50', label: '日記' },
    star: { type: 'icon', value: Star, color: 'text-gray-500', bg: 'bg-gray-50', label: '其他' },
};

// Map from the 9 GENESIS+IO HabitCategory names to a CATEGORY_CONFIG key.
// Used to give OfficialHabits a default visual icon in admin UI / pickers.
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
