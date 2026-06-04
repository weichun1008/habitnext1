"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Globe, Lock, ListChecks, Users, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Fetch templates + plan categories in parallel so the category
            // chip on each card can read live label/color/icon from the
            // admin-editable PlanCategory rows (edit color → reload → see change).
            const [tplRes, catRes] = await Promise.all([
                fetch('/api/admin/templates'),
                fetch('/api/admin/plan-categories'),
            ]);
            const tplData = await tplRes.json();
            const catData = await catRes.json();
            setTemplates(Array.isArray(tplData) ? tplData : []);
            setCategories(Array.isArray(catData) ? catData : []);
        } catch (error) {
            console.error('Failed to fetch templates / categories:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    <Link href="/admin/dashboard/templates/new" className="admin-btn admin-btn-primary no-underline">
                        <Plus size={18} /> 新增模板
                    </Link>
                </div>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="admin-empty">載入中...</div>
            ) : templates.length === 0 ? (
                <div className="admin-empty">
                    <div className="admin-empty-icon">📋</div>
                    <p className="admin-empty-text">尚無模板，點擊上方按鈕建立第一個模板</p>
                </div>
            ) : (
                <div className="admin-template-grid">
                    {templates.map(template => {
                        const cat = categoryMap[template.category] || fallbackForSlug(template.category);
                        const taskCount = countTasks(template.tasks);
                        const assignCount = template._count?.assignments || 0;
                        const expertName = template.expert?.name || '未知';

                        return (
                            <div key={template.id} className="admin-template-card" onClick={() => router.push(`/admin/dashboard/templates/${template.id}`)}>
                                {/* Top row: category chip + public/private */}
                                <div className="flex items-center justify-between mb-3">
                                    <span
                                        className="admin-template-category-chip"
                                        style={{ backgroundColor: `${cat.color}1f`, color: cat.color, borderColor: `${cat.color}55` }}
                                    >
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

                                {/* Title + description */}
                                <h3 className="admin-template-name">{template.name}</h3>
                                <p className="admin-template-desc">{template.description || '無描述'}</p>

                                {/* Stats row */}
                                <div className="admin-template-stats">
                                    <div className="admin-template-stat" title="任務數">
                                        <ListChecks size={14} />
                                        <span>{taskCount}</span>
                                        <span className="admin-template-stat-label">任務</span>
                                    </div>
                                    <div className="admin-template-stat" title="指派次數">
                                        <Users size={14} />
                                        <span>{assignCount}</span>
                                        <span className="admin-template-stat-label">指派</span>
                                    </div>
                                </div>

                                {/* Owner */}
                                <div className="admin-template-owner">
                                    <User size={12} />
                                    <span>{expertName}</span>
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
                    })}
                </div>
            )}
        </div>
    );
}
