"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, ArrowLeft, GripVertical } from 'lucide-react';
import Link from 'next/link';

const COLORS = [
    { value: '#10B981', label: '翠綠' },
    { value: '#3B82F6', label: '藍色' },
    { value: '#F59E0B', label: '橙色' },
    { value: '#EF4444', label: '紅色' },
    { value: '#8B5CF6', label: '紫色' },
    { value: '#EC4899', label: '粉紅' },
    { value: '#6B7280', label: '灰色' },
];

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', color: '#10B981' });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingCategory(null);
        setFormData({ name: '', color: '#10B981' });
        setIsModalOpen(true);
    };

    const openEditModal = (cat) => {
        setEditingCategory(cat);
        setFormData({ name: cat.name, color: cat.color || '#10B981' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('請輸入分類名稱');
            return;
        }

        try {
            const url = editingCategory
                ? `/api/admin/categories/${editingCategory.id}`
                : '/api/admin/categories';

            const res = await fetch(url, {
                method: editingCategory ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchCategories();
            } else {
                const error = await res.json();
                alert(error.error || '儲存失敗');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('儲存失敗');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('確定要刪除這個分類嗎？')) return;

        try {
            const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCategories();
            } else {
                const error = await res.json();
                alert(error.error || '刪除失敗');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/dashboard/habits"
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">分類管理</h1>
                        <p className="text-gray-400 text-sm">管理習慣庫的分類</p>
                    </div>
                </div>
                <button onClick={openAddModal} className="admin-button-primary flex items-center gap-2">
                    <Plus size={16} /> 新增分類
                </button>
            </div>

            {/* Categories List */}
            <div className="admin-card">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">載入中...</div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        還沒有分類，點擊「新增分類」建立第一個
                    </div>
                ) : (
                    <div className="space-y-2">
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-500/30 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-8 h-8 rounded-lg"
                                        style={{ backgroundColor: cat.color || '#10B981' }}
                                    />
                                    <span className="font-medium text-white">{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(cat)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {editingCategory ? '編輯分類' : '新增分類'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="admin-label">分類名稱</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    placeholder="例如：健康、運動、心理..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="admin-label">顏色</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setFormData({ ...formData, color: c.value })}
                                            className={`w-10 h-10 rounded-lg transition-all ${formData.color === c.value
                                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110'
                                                    : 'hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="admin-button-secondary"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                className="admin-button-primary flex items-center gap-2"
                            >
                                <Save size={16} /> 儲存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
