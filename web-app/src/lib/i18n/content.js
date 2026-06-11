// 內容字典 — 「中文 canonical 字串 → 該語言翻譯」的扁平查表。
// 涵蓋官方習慣 name/description、template name/description/phase/task、子任務 label。
// 由 scripts/build-content-i18n.js 從 seed + 翻譯檔編譯產生（committed）。
//
// 設計：DB / 任務快照一律存 zh-TW canonical 字串；顯示時用 localizeContent(text, locale)
// 查表。查不到就回原字 —— 這讓使用者自訂、admin 後台新建、尚未翻譯的內容安全 fallback，
// 也不需要任何 DB 欄位或 relation join（Task 與 Template/OfficialHabit 之間沒有可靠關聯）。

import en from './content/en.json';
import zhCN from './content/zh-CN.json';
import ja from './content/ja.json';
import ko from './content/ko.json';
import de from './content/de.json';
import es from './content/es.json';
import fr from './content/fr.json';
import pt from './content/pt.json';
import it from './content/it.json';
import id from './content/id.json';

const CONTENT = { en, 'zh-CN': zhCN, ja, ko, de, es, fr, pt, it, id };

// text：canonical 中文字串。locale：目標語言。zh-TW（或缺字典）回原字。
export function localizeContent(text, locale) {
    if (!text || !locale || locale === 'zh-TW') return text;
    const dict = CONTENT[locale];
    if (!dict) return text;
    const hit = dict[text];
    return hit != null ? hit : text;
}
