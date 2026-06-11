'use client';

// 輕量自訂 i18n：context + JSON 字典 + t() hook。
// localStorage 持久化（key 'habitnext.locale'），不走 URL 前綴。
// 之後若需要 ICU 訊息格式 / pluralization 再升級到 next-intl。

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import de from './locales/de.json';
import es from './locales/es.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import id from './locales/id.json';

export const LOCALES = [
    { id: 'zh-TW', label: '繁體中文' },
    { id: 'zh-CN', label: '简体中文' },
    { id: 'en', label: 'English' },
    { id: 'ja', label: '日本語' },
    { id: 'ko', label: '한국어' },
    { id: 'de', label: 'Deutsch' },
    { id: 'es', label: 'Español' },
    { id: 'fr', label: 'Français' },
    { id: 'pt', label: 'Português' },
    { id: 'it', label: 'Italiano' },
    { id: 'id', label: 'Bahasa Indonesia' },
];

export const DEFAULT_LOCALE = 'zh-TW';
export const LOCALE_STORAGE_KEY = 'habitnext.locale';

const DICT = {
    'zh-TW': zhTW,
    'zh-CN': zhCN,
    en,
    ja,
    de,
    es,
    ko,
    fr,
    pt,
    it,
    id,
};

export function loadLocale() {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    try {
        const v = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (LOCALES.some(l => l.id === v)) return v;
    } catch (e) {
        // localStorage 被禁用 — 安靜 fallback
    }
    return DEFAULT_LOCALE;
}

export function saveLocale(id) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, id);
    } catch (e) {
        // 同上
    }
}

function getByPath(dict, path) {
    if (!dict) return undefined;
    const keys = path.split('.');
    let cur = dict;
    for (const k of keys) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[k];
    }
    return cur;
}

function interpolate(value, vars) {
    if (typeof value !== 'string' || !vars) return value;
    return value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

// Provider 外的 fallback t — 直接解析 zh-TW 字典（含插值）。
// 讓單元測試（沒包 LocaleProvider）與任何 provider 外的元件
// 顯示預設語言文字，而不是 raw key。
function defaultT(key, vars) {
    const v = getByPath(DICT[DEFAULT_LOCALE], key);
    if (v !== undefined) return typeof v === 'string' ? interpolate(v, vars) : v;
    return key;
}

const LocaleContext = createContext({
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: defaultT,
});

export function LocaleProvider({ children }) {
    const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

    // 首次掛載時讀 localStorage（client only），避免 SSR 與 client 不一致警告。
    useEffect(() => {
        setLocaleState(loadLocale());
    }, []);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            try { document.documentElement.lang = locale; } catch (e) {}
        }
    }, [locale]);

    const value = useMemo(() => {
        const dict = DICT[locale] || DICT[DEFAULT_LOCALE];
        const fallback = DICT[DEFAULT_LOCALE];

        function t(key, vars) {
            const v = getByPath(dict, key);
            if (v !== undefined) return typeof v === 'string' ? interpolate(v, vars) : v;
            const fv = getByPath(fallback, key);
            if (fv !== undefined) return typeof fv === 'string' ? interpolate(fv, vars) : fv;
            return key; // 找不到就 fallback 到 key，方便 debug
        }

        function setLocale(id) {
            setLocaleState(id);
            saveLocale(id);
        }

        return { locale, setLocale, t };
    }, [locale]);

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT() {
    return useContext(LocaleContext);
}
