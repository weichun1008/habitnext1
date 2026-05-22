"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Globe, Lock, ListChecks, Users, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Friendly labels for every category slug actually in use.
// Falls back to the raw slug for anything unmapped (e.g. legacy values).
const CATEGORY_LABELS = {
    // Generic
    health: '健康',
    fitness: '運動',
    nutrition: '營養',
    mental: '心理',
    // Flower (women's course)
    daisy: '雛菊型',
    rose: '玫瑰型',
    orchid: '蘭花型',
    sunflower: '向日葵型',
    // Sleep
    sleep_stress: '睡眠 · 壓力',
    sleep_rhythm: '睡眠 · 節律',
    sleep_metabolic: '睡眠 · 代謝',
    sleep_hormone: '睡眠 · 荷爾蒙',
};

// Color tag per category family for the badge dot.
const CATEGORY_COLOR = (slug) => {
    if (!slug) return '#6b7280';
    if (slug.startsWith('sleep_')) return '#818cf8'; // indigo
    if (['daisy', 'rose', 'orchid', 'sunflower'].includes(slug)) return '#f472b6'; // pink
    return '#10b981'; // emerald
};

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

export default function TemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            // Show ALL templates in admin, including system-seeded ones
            // (花朵 / 睡眠 templates belong to system expert accounts but
            // still need to be visible and editable from this page).
            const res = await fetch('/api/admin/templates');
            const data = await res.json();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('確定要刪除此模板嗎？已指派的任務不會被刪除。')) return;

        try {
            const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTemplates();
            }
        } catch (error) {
            console.error('Delete template error:', error);
        }
    };

    return (
        <div className="admin-animate-in">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">模板管理</h1>
                    <p className="admin-subtitle">建立和管理您的專屬習慣模板</p>
                </div>
                <Link href="/admin/dashboard/templates/new" className="admin-btn admin-btn-primary no-underline">
                    <Plus size={18} /> 新增模板
                </Link>
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
                        const catLabel = CATEGORY_LABELS[template.category] || template.category;
                        const catColor = CATEGORY_COLOR(template.category);
                        const taskCount = countTasks(template.tasks);
                        const assignCount = template._count?.assignments || 0;
                        const expertName = template.expert?.name || '未知';

                        return (
                            <div key={template.id} className="admin-template-card" onClick={() => router.push(`/admin/dashboard/templates/${template.id}`)}>
                                {/* Top row: category chip + public/private */}
                                <div className="flex items-center justify-between mb-3">
                                    <span
                                        className="admin-template-category-chip"
                                        style={{ backgroundColor: `${catColor}1f`, color: catColor, borderColor: `${catColor}55` }}
                                    >
                                        <span className="admin-template-category-dot" style={{ backgroundColor: catColor }} />
                                        {catLabel}
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
