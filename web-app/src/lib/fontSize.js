// 字體大小偏好：3 檔（標準/大/特大）。
// 透過改 html 根字體大小，配合 Tailwind 的 rem 單位讓 text-* / spacing 等比放大。
// 持久化在 localStorage（純前端偏好，不上 DB）。
//
// FOUC 防護：layout.js 內嵌一段同步 script 在 hydrate 前先套用，這個檔案是 React 端入口。

export const FONT_SIZE_OPTIONS = [
    { id: 'standard', label: '標準', px: 16 },
    { id: 'large', label: '大', px: 18 },
    { id: 'xlarge', label: '特大', px: 20 },
];

export const DEFAULT_FONT_SIZE = 'standard';
export const FONT_SIZE_STORAGE_KEY = 'habitnext.fontSize';

export function loadFontSize() {
    if (typeof window === 'undefined') return DEFAULT_FONT_SIZE;
    try {
        const v = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
        if (FONT_SIZE_OPTIONS.some(o => o.id === v)) return v;
    } catch (e) {
        // localStorage 被禁用（無痕模式 / 隱私設定）— 安靜 fallback
    }
    return DEFAULT_FONT_SIZE;
}

export function saveFontSize(id) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(FONT_SIZE_STORAGE_KEY, id);
    } catch (e) {
        // 同上
    }
}

export function applyFontSize(id) {
    if (typeof document === 'undefined') return;
    const opt = FONT_SIZE_OPTIONS.find(o => o.id === id) || FONT_SIZE_OPTIONS[0];
    document.documentElement.style.fontSize = `${opt.px}px`;
}
