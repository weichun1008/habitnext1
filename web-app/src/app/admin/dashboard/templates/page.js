"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Globe, Lock, ListChecks, Users, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sectionIdFor } from '@/lib/templateRecommendation';

// 第一層家族分區的 fallback 顯示（/api/admin/plan-families 無資料時）。
const FAMILY_FALLBACK = [
    { slug: 'flower', title: '花朵計畫', color: '#ec4899', order: 0 },
    { slug: 'sleep', title: '睡眠處方', color: '#6366f1', order: 1 },
    { slug: 'other', title: '其他公開計畫', color: '#10b981', order: 2 },
];

// Templates use two shapes: legacy v1.0 stores tasks as a flat array,
// v2.0 stores { version, phases: [{ tasks: [...] }] }. Sum across phases
// so the admin card shows the correct count for both.
const countTasks = (tasks) => {
    if (!tasks) return 0;
    if (Array.isArray(tasks)) return tasks.length;
    if (Array.isArray(tasks.phases)) {
        return tasks.phases.reduce((sum, ph) => sum + (Array.isArray(ph.tasks) ? ph.tasks.length : 0), 0);
    }
    return 0;
};

// Fallback when a Template.category slug isn't found in PlanCategory.
// Color is still family-themed so legacy / orphan slugs aren't grey/ugly.
const fallbackForSlug = (slug) => {
    if (!slug) return { name: '—', color: '#6b7280', icon: '' };
    if (slug.startsWith('sleep_')) return { name: slug, color: '#818cf8', icon: '' };
    if (['daisy', 'rose', 'orchid', 'sunflower'].includes(slug)) return { name: slug, color: '#f472b6', icon: '' };
    return { name: slug, color: '#10b981', icon: '' };
};

export default function TemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Templates + plan categories + plan families in parallel.
            // 第一層依「計畫家族」分組（成員由計畫分類經 sectionIdFor 判定），
            // 家族標題/顏色/排序讀 admin 可編輯的 PlanFamily。
            const [tplRes, catRes, famRes] = await Promise.all([
                fetch('/api/admin/templates'),
                fetch('/api/admin/plan-categories'),
                fetch('/api/admin/plan-families'),
            ]);
            const tplData = await tplRes.json();
            const catData = await catRes.json();
            const famData = await famRes.json();
            setTemplates(Array.isArray(tplData) ? tplData : []);
            setCategories(Array.isArray(catData) ? catData : []);
            setFamilies(Array.isArray(famData) && famData.length ? famData : FAMILY_FALLBACK);
        } catch (error) {
            console.error('Failed to fetch templates / categories / families:', error);
            setFamilies(FAMILY_FALLBACK);
        } finally {
            setLoading(false);
        }
    };

    // 依 sectionIdFor 把計畫分到家族（與探索計畫一致的歸屬邏輯）。
    const byFamily = useMemo(() => {
        const map = {};
        for (const t of templates) {
            const fid = sectionIdFor(t);
            (map[fid] || (map[fid] = [])).push(t);
        }
        return map;
    }, [templates]);

    // 家族顯示順序（依 order）；任何有計畫卻不在 families 清單的家族也補上。
    const orderedFamilies = useMemo(() => {
        const list = [...families].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const known = new Set(list.map(f => f.slug));
        for (const slug of Object.keys(byFamily)) {
            if (!known.has(slug)) list.push({ slug, title: slug, color: '#10b981', order: 99 });
        }
        return list;
    }, [families, byFamily]);

    // slug → { name, color, icon } lookup, rebuilt only when categories change.
    const categoryMap = useMemo(() => {
        const map = {};
        for (const c of categories) {
            if (c.slug) map[c.slug] = { name: c.name, color: c.color || '#10b981', icon: c.icon || '' };
        }
        return map;
    }, [categories]);

    const handleDelete = async (id) => {
        if (!confirm('確定要刪除此模板嗎？已指派的任務不會被刪除。')) return;

        try {
            const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAll();
            }
        } catch (error) {
            console.error('Delete template error:', error);
        }
    };

    // 單張計畫卡（家族分區內共用）。
    const renderCard = (template) => {
        const cat = categoryMap[template.category] || fallbackForSlug(template.category);
        const taskCount = countTasks(template.tasks);
        const assignCount = template._count?.assignments || 0;
        const expertName = template.expert?.name || '未知';
        return (
            <div key={template.id} className="admin-template-card" onClick={() => router.push(`/admin/dashboard/templates/${template.id}`)}>
                <div className="flex items-center justify-between mb-3">
                    <span className="admin-template-category-chip"
                        style={{ backgroundColor: `${cat.color}1f`, color: cat.color, borderColor: `${cat.color}55` }}>
                        {cat.icon ? (
                            <span className="admin-template-category-icon">{cat.icon}</span>
                        ) : (
                            <span className="admin-template-category-dot" style={{ backgroundColor: cat.color }} />
                        )}
                        {cat.name}
                    </span>
                    <span className={`admin-badge ${template.isPublic ? 'admin-badge-success' : 'admin-badge-info'}`}>
                        {template.isPublic ? <><Globe size={10} /> 公開</> : <><Lock size={10} /> 私人</>}
                    </span>
                </div>
                <h3 className="admin-template-name">{template.name}</h3>
                <p className="admin-template-desc">{template.description || '無描述'}</p>
                <div className="admin-template-stats">
                    <div className="admin-template-stat" title="任務數">
                        <ListChecks size={14} /><span>{taskCount}</span><span className="admin-template-stat-label">任務</span>
                    </div>
                    <div className="admin-template-stat" title="指派次數">
                        <Users size={14} /><span>{assignCount}</span><span className="admin-template-stat-label">指派</span>
                    </div>
                </div>
                <div className="admin-template-owner">
                    <User size={12} /><span>{expertName}</span>
                </div>
                <div className="mt-4 flex gap-2" onClick={e => e.stopPropagation()}>
                    <Link href={`/admin/dashboard/templates/${template.id}`} className="admin-btn admin-btn-secondary flex-1 justify-center no-underline">
                        <Edit2 size={14} /> 編輯
                    </Link>
                    <button className="admin-btn admin-btn-danger px-3 py-2" onClick={() => handleDelete(template.id)}>
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-animate-in">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">計畫模板管理</h1>
                    <p className="admin-subtitle">建立和管理使用者可訂閱的計畫模板</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/dashboard/templates/families" className="admin-btn admin-btn-secondary no-underline">
                        計畫家族
                    </Link>
                    <Link href="/admin/dashboard/templates/review" className="admin-btn admin-btn-secondary no-underline">
                        社群計畫審核
                    </Link>
                    <Link href="/admin/dashboard/templates/new" className="admin-btn admin-btn-primary no-underline">
                        <Plus size={18} /> 新增模板
                    </Link>
                </div>
            </div>

            {/* 第一層：依計畫家族分組 */}
            {loading ? (
                <div className="admin-empty">載入中...</div>
            ) : templates.length === 0 ? (
                <div className="admin-empty">
                    <div className="admin-empty-icon">📋</div>
                    <p className="admin-empty-text">尚無模板，點擊上方按鈕建立第一個模板</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {orderedFamilies.map(fam => {
                        const plans = byFamily[fam.slug] || [];
                        return (
                            <section key={fam.slug}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: fam.color || '#10b981' }} />
                                    <h2 className="text-lg font-bold text-white">{fam.title}</h2>
                                    <span className="text-sm text-gray-400">{plans.length}</span>
                                </div>
                                {plans.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic pl-5">尚無計畫（建立計畫時選對應分類即會歸入此家族）</p>
                                ) : (
                                    <div className="admin-template-grid">
                                        {plans.map(renderCard)}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
