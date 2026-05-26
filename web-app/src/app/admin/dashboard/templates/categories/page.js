"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Edit2, Trash2, Save, X, Lock } from 'lucide-react';
import { GENESIS_DOMAINS } from '@/lib/aspirations';

const COLOR_OPTIONS = [
    '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

// Empty form payload — extracted so add / edit / cancel reset to the same
// shape and so adding a new field is a single-line change.
const EMPTY_FORM = { name: '', color: '#10B981', icon: '', domain: '' };

export default function PlanCategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/plan-categories');
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

    const handleAdd = async () => {
        if (!formData.name.trim()) {
            alert('請輸入分類名稱');
            return;
        }

        try {
            const res = await fetch('/api/admin/plan-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                fetchCategories();
                setFormData(EMPTY_FORM);
                setIsAdding(false);
            } else {
                const error = await res.json();
                alert(error.error || '新增失敗');
            }
        } catch (error) {
            alert('新增失敗');
        }
    };

    const handleUpdate = async (id) => {
        try {
            const res = await fetch(`/api/admin/plan-categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                fetchCategories();
                setEditingId(null);
                setFormData(EMPTY_FORM);
            } else {
                const error = await res.json();
                alert(error.error || '更新失敗');
            }
        } catch (error) {
            alert('更新失敗');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('確定要刪除此分類嗎？')) return;

        try {
            const res = await fetch(`/api/admin/plan-categories/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchCategories();
            } else {
                const error = await res.json();
                alert(error.error || '刪除失敗');
            }
        } catch (error) {
            alert('刪除失敗');
        }
    };

    const startEdit = (category) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            color: category.color || '#10B981',
            icon: category.icon || '',
            domain: category.domain || '',
        });
        setIsAdding(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData(EMPTY_FORM);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/dashboard/templates" className="p-2 hover:bg-white/10 rounded-lg">
                    <ChevronLeft size={20} />
                </Link>
                <div>
                    <h1 className="admin-page-title">計畫分類管理</h1>
                    <p className="text-sm text-gray-500">管理計畫模板的分類標籤。系統分類（🔒）由程式碼定義，僅可調整顏色 / 圖示 / 排序。</p>
                </div>
            </div>

            {/* Add Button */}
            {!isAdding && (
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); }}
                    className="admin-btn admin-btn-primary"
                >
                    <Plus size={18} /> 新增分類
                </button>
            )}

            {/* Add Form */}
            {isAdding && (
                <div className="admin-card p-4 space-y-4">
                    <h3 className="text-white font-medium">新增分類</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="admin-label">名稱</label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="分類名稱"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="admin-label">圖示 (Emoji)</label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="🏃"
                                value={formData.icon}
                                onChange={e => setFormData({ ...formData, icon: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="admin-label">面向（嚮往推薦用）</label>
                            <select
                                className="admin-input"
                                value={formData.domain}
                                onChange={e => setFormData({ ...formData, domain: e.target.value })}
                            >
                                <option value="">（無 — 不參與嚮往推薦）</option>
                                {GENESIS_DOMAINS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="admin-label">顏色</label>
                            <div className="flex gap-2 flex-wrap">
                                {COLOR_OPTIONS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setFormData({ ...formData, color })}
                                        className={`w-8 h-8 rounded-lg transition-all ${formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} className="admin-btn admin-btn-primary">
                            <Save size={16} /> 儲存
                        </button>
                        <button onClick={cancelEdit} className="admin-btn admin-btn-secondary">
                            <X size={16} /> 取消
                        </button>
                    </div>
                </div>
            )}

            {/* Categories List */}
            <div className="admin-card">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">載入中...</div>
                ) : categories.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">尚無分類，請新增</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>圖示</th>
                                <th>名稱</th>
                                <th>Slug</th>
                                <th>面向</th>
                                <th>顏色</th>
                                <th>類型</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id}>
                                    {editingId === cat.id ? (
                                        <>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="admin-input w-16 text-center"
                                                    value={formData.icon}
                                                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                {cat.isSystem ? (
                                                    <span className="text-white font-medium flex items-center gap-2">
                                                        {cat.name}
                                                        <Lock size={12} className="text-gray-500" title="系統分類不可改名" />
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="admin-input"
                                                        value={formData.name}
                                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    />
                                                )}
                                            </td>
                                            <td className="text-gray-400 text-xs font-mono">{cat.slug || '—'}</td>
                                            <td>
                                                <select
                                                    className="admin-input text-xs"
                                                    value={formData.domain}
                                                    onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                                >
                                                    <option value="">—</option>
                                                    {GENESIS_DOMAINS.map(d => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <div className="flex gap-1 flex-wrap">
                                                    {COLOR_OPTIONS.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setFormData({ ...formData, color })}
                                                            className={`w-6 h-6 rounded transition-all ${formData.color === color ? 'ring-2 ring-white' : ''}`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                {cat.isSystem ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300">
                                                        <Lock size={10} /> 系統
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">使用者</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdate(cat.id)}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="p-2 text-gray-400 hover:bg-gray-400/10 rounded"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="text-2xl">{cat.icon || '📁'}</td>
                                            <td className="text-white font-medium">{cat.name}</td>
                                            <td className="text-gray-400 text-xs font-mono">{cat.slug || '—'}</td>
                                            <td className="text-gray-300 text-xs">
                                                {cat.domain || <span className="text-gray-600">—</span>}
                                            </td>
                                            <td>
                                                <div
                                                    className="w-6 h-6 rounded"
                                                    style={{ backgroundColor: cat.color || '#10B981' }}
                                                />
                                            </td>
                                            <td>
                                                {cat.isSystem ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300">
                                                        <Lock size={10} /> 系統
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">使用者</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => startEdit(cat)}
                                                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded"
                                                        title={cat.isSystem ? '系統分類：僅可調整圖示 / 顏色 / 排序' : '編輯'}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {!cat.isSystem && (
                                                        <button
                                                            onClick={() => handleDelete(cat.id)}
                                                            className="p-2 text-red-400 hover:bg-red-400/10 rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
