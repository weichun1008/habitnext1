"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Globe, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES = [
    { value: 'health', label: '健康', color: '#10b981' },
    { value: 'fitness', label: '運動', color: '#f59e0b' },
    { value: 'nutrition', label: '營養', color: '#3b82f6' },
    { value: 'mental', label: '心理', color: '#8b5cf6' },
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
                    {templates.map(template => (
                        <div key={template.id} className="admin-template-card" onClick={() => router.push(`/admin/dashboard/templates/${template.id}`)}>
                            <div className="admin-template-header">
                                <span className="admin-template-name">{template.name}</span>
                                <span className={`admin-badge ${template.isPublic ? 'admin-badge-success' : 'admin-badge-info'}`}>
                                    {template.isPublic ? <><Globe size={10} /> 公開</> : <><Lock size={10} /> 私人</>}
                                </span>
                            </div>
                            <p className="admin-template-desc">{template.description || '無描述'}</p>
                            <div className="admin-template-meta">
                                <span>{CATEGORIES.find(c => c.value === template.category)?.label || template.category}</span>
                                <span>•</span>
                                <span>{countTasks(template.tasks)} 個任務</span>
                                <span>•</span>
                                <span>{template._count?.assignments || 0} 次指派</span>
                                <span>•</span>
                                <span>by {template.expert?.name || '未知'}</span>
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
                    ))}
                </div>
            )}
        </div>
    );
}
