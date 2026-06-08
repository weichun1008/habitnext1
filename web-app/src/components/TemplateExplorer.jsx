import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Check, Loader, Calendar, Sparkles, Hourglass, ChevronRight, ChevronLeft, Flower2, Moon, LayoutGrid } from 'lucide-react';
import {
    isRecommendedFor,
    groupTemplatesBySection,
    sectionIdFor,
} from '@/lib/templateRecommendation';

// Lucide 圖示名稱 → component 對照（家族卡用；查無則 LayoutGrid）
const FAMILY_ICONS = { Flower2, Moon, LayoutGrid };
function familyIcon(name) { return FAMILY_ICONS[name] || LayoutGrid; }

// 當 /api/plan-families 尚無資料時的 fallback。
const FALLBACK_FAMILIES = [
  { slug: 'flower', title: '花朵型小課程', intro: '依女性週期身體狀態分型，14 天分階段任務。', icon: 'Flower2', color: '#ec4899', quizPendingCopy: '花朵分型問卷功能開發中 — 先瀏覽全部，完成後自動推薦。', order: 0, isActive: true },
  { slug: 'sleep', title: '睡眠處方', intro: '依睡眠卡點分型，14 天 4 階段處方。', icon: 'Moon', color: '#6366f1', quizPendingCopy: '睡眠分型問卷功能開發中 — 先瀏覽全部，完成後自動推薦。', order: 1, isActive: true },
  { slug: 'other', title: '其他公開計畫', intro: '專家設計的各式主題計畫。', icon: 'LayoutGrid', color: '#10b981', quizPendingCopy: null, order: 2, isActive: true },
];
import TemplateDetailPanel from './TemplateDetailPanel';
import AuthorBadge from './templates/AuthorBadge';

// Fallback colors when a template.category slug isn't in PlanCategory yet
// (legacy data, or admin deleted a non-system row). Family-tinted so it
// still looks coherent.
const fallbackForSlug = (slug) => {
    if (!slug) return { name: '—', color: '#6b7280', icon: '' };
    if (slug.startsWith('sleep_')) return { name: slug, color: '#818cf8', icon: '' };
    if (['daisy', 'rose', 'orchid', 'sunflower'].includes(slug)) return { name: slug, color: '#f472b6', icon: '' };
    return { name: slug, color: '#10b981', icon: '' };
};

// initialTemplate (Slice K wiring): when set, the explorer auto-opens that
// template's detail panel as soon as the templates list finishes loading.
// Used by the aspiration recommendation flow so picking a template card in
// the recommendation panel lands the user directly on that template's
// detail view here, instead of forcing them to scroll-find it again.
const TemplateExplorer = ({ isOpen, onClose, userId, onJoin, userTypeKey = null, userSleepTypeKey = null, initialTemplate = null }) => {
    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState(null);

    // Detail panel state (Slice J)
    const [detailTemplate, setDetailTemplate] = useState(null);

    const [families, setFamilies] = useState([]);
    const [activeFamily, setActiveFamily] = useState(null); // null=第一層；slug=第二層

    // Start date selection state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [startDateOption, setStartDateOption] = useState('today');
    const [customDate, setCustomDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchAll();
        }
    }, [isOpen]);

    // After templates load (or are reloaded), honour the initialTemplate prop
    // by opening that template's detail panel automatically. We match by id
    // against the freshly-fetched list so the panel reads the canonical
    // server row (the one the recommendation API gave us is a subset).
    useEffect(() => {
        if (!isOpen || !initialTemplate?.id) return;
        if (loading) return;
        const match = templates.find(t => t.id === initialTemplate.id) || initialTemplate;
        setActiveFamily(sectionIdFor(match));
        setDetailTemplate(match);
    }, [isOpen, initialTemplate, loading, templates]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Fetch templates + categories in parallel so each card chip can
            // render the admin-editable color / icon / display name directly.
            const timestamp = Date.now();
            const [tplRes, catRes, famRes] = await Promise.all([
                fetch(`/api/templates/public?t=${timestamp}`, { cache: 'no-store' }),
                fetch('/api/plan-categories', { cache: 'no-store' }),
                fetch('/api/plan-families', { cache: 'no-store' }),
            ]);
            if (tplRes.ok) {
                const data = await tplRes.json();
                setTemplates(data);
            } else {
                console.error('[Client] Templates fetch failed:', tplRes.status);
            }
            if (catRes.ok) {
                const data = await catRes.json();
                setCategories(Array.isArray(data) ? data : []);
            }
            if (famRes.ok) {
                const fam = await famRes.json();
                setFamilies(Array.isArray(fam) && fam.length ? fam : FALLBACK_FAMILIES);
            } else {
                setFamilies(FALLBACK_FAMILIES);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // slug → { name, color, icon } lookup
    const categoryMap = useMemo(() => {
        const map = {};
        for (const c of categories) {
            if (c.slug) map[c.slug] = { name: c.name, color: c.color || '#10b981', icon: c.icon || '' };
        }
        return map;
    }, [categories]);

    const getStartDate = () => {
        const today = new Date();
        if (startDateOption === 'today') {
            return today.toISOString().split('T')[0];
        } else if (startDateOption === 'tomorrow') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        } else if (startDateOption === 'custom' && customDate) {
            return customDate;
        }
        return today.toISOString().split('T')[0];
    };

    const handleJoinClick = (template) => {
        // If template uses user_choice, show date picker
        if (template.startDateType === 'user_choice' || !template.startDateType) {
            setSelectedTemplate(template);
            setStartDateOption('today');
            setCustomDate('');
            setShowDatePicker(true);
        } else {
            // Fixed date - join directly
            confirmJoin(template, template.fixedStartDate);
        }
    };

    const confirmJoin = async (template, startDate) => {
        setJoiningId(template.id);
        setShowDatePicker(false);
        try {
            const res = await fetch('/api/user/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    templateId: template.id,
                    startDate: startDate
                })
            });

            if (res.ok) {
                // Pass the newly-created assignment back so the parent can
                // tag it with AspirationHabit rows when an aspiration is the
                // entry point (Slice K wiring). Existing callers that ignore
                // the arg keep their behavior because JS is permissive.
                const assignment = await res.json().catch(() => null);
                onJoin(assignment);
                onClose();
            } else {
                alert('加入失敗，請稍後再試');
            }
        } catch (error) {
            console.error('Join template error:', error);
            alert('發生錯誤');
        } finally {
            setJoiningId(null);
            setSelectedTemplate(null);
        }
    };

    // Show ALL public templates, grouped into 3 sections (花朵 / 睡眠 / 其他).
    // Within each section, the template matching the user's quiz result floats
    // to the top with a 「為你推薦」 badge.
    const grouped = groupTemplatesBySection(templates, userTypeKey, userSleepTypeKey);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl h-[80dvh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                        {activeFamily && (
                            <button
                                onClick={() => setActiveFamily(null)}
                                aria-label="返回計畫家族"
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                            >
                                <ChevronLeft size={22} className="text-gray-600" />
                            </button>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-gray-800 truncate">
                                {activeFamily ? (families.find(f => f.slug === activeFamily)?.title || '計畫') : '探索習慣計畫'}
                            </h2>
                            <p className="text-sm text-gray-500 truncate">
                                {activeFamily ? '選一個課程開始' : '選一個計畫家族開始'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader className="animate-spin text-emerald-500" />
                        </div>
                    ) : activeFamily === null ? (
                        /* ===== 第一層：計畫家族大橫幅卡 ===== */
                        <div className="space-y-3">
                            {(families.length ? families : FALLBACK_FAMILIES).map(fam => {
                                const list = grouped[fam.slug] || [];
                                if (fam.slug === 'other' && list.length === 0) return null;
                                const Icon = familyIcon(fam.icon);
                                const hasRec = list.some(t => isRecommendedFor(t, userTypeKey, userSleepTypeKey));
                                const color = fam.color || '#10b981';
                                return (
                                    <button
                                        key={fam.slug}
                                        onClick={() => setActiveFamily(fam.slug)}
                                        className="w-full text-left bg-white rounded-2xl border p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-all relative"
                                        style={{ borderColor: `${color}55` }}
                                    >
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1f`, color }}>
                                            <Icon size={22} />
                                        </div>
                                        <div className="min-w-0 flex-1 pr-5">
                                            <h3 className="font-bold text-gray-800 text-base">{fam.title}</h3>
                                            <p className="text-xs text-gray-500 leading-relaxed mt-1">{fam.intro}</p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="text-[11px] text-gray-400">{list.length} 個課程</span>
                                                {hasRec && (
                                                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                        <Sparkles size={10} /> 有為你推薦
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* ===== 第二層：該家族的子課程選單 ===== */
                        (() => {
                            const items = grouped[activeFamily] || [];
                            const famObj = families.find(f => f.slug === activeFamily);
                            const showQuizPending = (activeFamily === 'flower' && !userTypeKey) || (activeFamily === 'sleep' && !userSleepTypeKey);
                            const quizCopy = famObj?.quizPendingCopy;
                            return (
                                <div>
                                    {showQuizPending && quizCopy && (
                                        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-4 mb-4 flex items-start gap-3">
                                            <Hourglass size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs text-gray-600 leading-relaxed">{quizCopy}</div>
                                        </div>
                                    )}
                                    {items.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500 text-sm">這個家族目前還沒有公開課程</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {items.map(template => {
                                                const recommended = isRecommendedFor(template, userTypeKey, userSleepTypeKey);
                                                const cat = categoryMap[template.category] || fallbackForSlug(template.category);
                                                return (
                                                    <div
                                                        key={template.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => setDetailTemplate(template)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailTemplate(template); } }}
                                                        className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col ${recommended ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-100'}`}
                                                        style={!recommended ? { borderTopColor: cat.color, borderTopWidth: 3 } : undefined}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                                                style={{ backgroundColor: `${cat.color}1f`, color: cat.color, borderColor: `${cat.color}55` }}>
                                                                {cat.icon && <span className="text-xs leading-none">{cat.icon}</span>}
                                                                <span className="truncate max-w-[90px]">{cat.name}</span>
                                                            </span>
                                                            {recommended && (
                                                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0">
                                                                    <Sparkles size={10} /> 為你推薦
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2 mb-1">{template.name}</h3>
                                                        <div className="mb-2">
                                                            <AuthorBadge template={template} />
                                                        </div>
                                                        {template.authorType !== 'user' && (
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{template.expert?.title || '專家'}</span>
                                                            <span className="truncate">by {template.expert?.name}</span>
                                                        </div>
                                                        )}
                                                        <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-3 flex-1">
                                                            {template.description || '這個計畫可以幫助你建立良好的生活習慣。'}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-[11px] text-gray-400 border-t border-gray-100 pt-2 mb-3">
                                                            <div className="flex items-center gap-1"><User size={12} /><span>{template._count?.assignments || 0}</span></div>
                                                            <div className="flex items-center gap-1"><Check size={12} /><span>{template._count?.tasks || 0}</span></div>
                                                            <div className="ml-auto flex items-center gap-0.5 text-emerald-600"><span>詳情</span><ChevronRight size={12} /></div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleJoinClick(template); }}
                                                            disabled={joiningId === template.id}
                                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                                        >
                                                            {joiningId === template.id ? '加入中...' : '加入計畫'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    )}
                </div>

                {/* Detail panel slides in from the right when a card is tapped */}
                {detailTemplate && (
                    <TemplateDetailPanel
                        template={detailTemplate}
                        isRecommended={isRecommendedFor(detailTemplate, userTypeKey, userSleepTypeKey)}
                        joining={joiningId === detailTemplate.id}
                        category={categoryMap[detailTemplate.category] || fallbackForSlug(detailTemplate.category)}
                        onBack={() => setDetailTemplate(null)}
                        onJoin={(t) => handleJoinClick(t)}
                    />
                )}
            </div>

            {/* Start Date Selection Modal */}
            {showDatePicker && selectedTemplate && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Calendar size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">選擇開始日期</h3>
                                <p className="text-xs text-gray-500">{selectedTemplate.name}</p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="radio"
                                    name="startDate"
                                    value="today"
                                    checked={startDateOption === 'today'}
                                    onChange={() => setStartDateOption('today')}
                                    className="w-4 h-4 text-emerald-500"
                                />
                                <span className="text-sm font-medium text-gray-700">今天開始</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="radio"
                                    name="startDate"
                                    value="tomorrow"
                                    checked={startDateOption === 'tomorrow'}
                                    onChange={() => setStartDateOption('tomorrow')}
                                    className="w-4 h-4 text-emerald-500"
                                />
                                <span className="text-sm font-medium text-gray-700">明天開始</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="radio"
                                    name="startDate"
                                    value="custom"
                                    checked={startDateOption === 'custom'}
                                    onChange={() => setStartDateOption('custom')}
                                    className="w-4 h-4 text-emerald-500"
                                />
                                <span className="text-sm font-medium text-gray-700">指定日期</span>
                            </label>

                            {startDateOption === 'custom' && (
                                <input
                                    type="date"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm mt-2"
                                    value={customDate}
                                    onChange={e => setCustomDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDatePicker(false);
                                    setSelectedTemplate(null);
                                }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => confirmJoin(selectedTemplate, getStartDate())}
                                disabled={startDateOption === 'custom' && !customDate}
                                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            >
                                確認加入
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateExplorer;
