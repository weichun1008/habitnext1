// 顯示層翻譯 helper — 處理「值存在 DB 但顯示要多語」的字串。
//
// 原則：DB 維持 zh-TW canonical（Task.cue 的錨點文字、Task.category 的領域名），
// 比對邏輯（CUE_ORDER、category === ...）不動；只在「顯示給使用者」那一刻翻譯。
// 反查不到（自訂錨點、未知領域）就原樣顯示。
//
// 純函式、不依賴 React context — t 由呼叫端的 useT() 傳入，
// 所以 server-safe 的 lib 也能用。

import { LIFE_MOMENTS } from '../anchors';

const ANCHOR_ID_BY_LABEL = new Map(LIFE_MOMENTS.map(m => [m.label, m.id]));

// Task.cue → 翻譯後的錨點文字。非內建錨點（使用者自訂）原樣返回。
export function translateCue(cue, t) {
    if (!cue) return cue;
    const id = ANCHOR_ID_BY_LABEL.get(cue);
    return id ? t(`data.anchors.${id}`) : cue;
}

// timeOfDay 分組 key（morning/noon/...）→ 翻譯後的分組標題。
export function translateTimeOfDay(key, t) {
    return t(`data.timeOfDay.${key}`);
}

// GENESIS+IO 的 9 個 canonical 領域名（HabitCategory.name，存在 DB）→ i18n key。
// 見 prisma/seed/genesis-io.json。
const DOMAIN_KEY_BY_NAME = {
    '基因與腸道': 'genesGut',
    '環境': 'environment',
    '飲食': 'diet',
    '運動': 'exercise',
    '壓力與睡眠': 'stressSleep',
    '社交互動': 'social',
    '心靈': 'mind',
    '認知與智慧': 'cognition',
    '職涯與平衡': 'career',
};

// DB 領域名 → 翻譯後名稱。未知（自訂分類）原樣返回。
export function translateDomain(name, t) {
    const k = DOMAIN_KEY_BY_NAME[name];
    return k ? t(`data.domains.${k}`) : (name || '');
}

// 常見計量單位（task.unit / config.unit 存 zh-TW canonical 字）→ i18n key。
// 不在表內的（使用者自訂或新單位）原樣顯示。
const UNIT_KEY_BY_LABEL = {
    '秒': 'second',
    '分': 'minute',
    '分鐘': 'minute',
    '小時': 'hour',
    '次': 'time',
    '回': 'time',
    '套': 'set',
    '組': 'set',
    '下': 'rep',
    '步': 'step',
    '頁': 'page',
    '個': 'item',
    '粒': 'pill',
    '顆': 'pill',
    '杯': 'cup',
    '碗': 'bowl',
    '份': 'serving',
    '克': 'gram',
    'g': 'gram',
    '公斤': 'kg',
    'kg': 'kg',
    'cc': 'cc',
    'ml': 'ml',
    '毫升': 'ml',
    '公升': 'liter',
    'l': 'liter',
    '公里': 'km',
    'km': 'km',
    '公尺': 'meter',
    'm': 'meter',
    '天': 'day',
};

// 單位翻譯：DB 維持中文 canonical，顯示時走這個。
export function translateUnit(unit, t) {
    if (!unit) return unit;
    const k = UNIT_KEY_BY_LABEL[unit];
    return k ? t(`data.units.${k}`) : unit;
}
