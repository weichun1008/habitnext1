"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Archive, RotateCcw, Save, X } from 'lucide-react';

export default function TitlesPage() {
    const [titles, setTitles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        fetchTitles();
    }, []);

    const fetchTitles = async () => {
        try {
            const res = await fetch('/api/admin/titles');
            if (res.ok) {
                const data = await res.json();
                setTitles(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        try {
            const res = await fetch('/api/admin/titles', {
                method: 'POST',
                body: JSON.stringify({ name: newTitle.trim() }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                setNewTitle('');
                fetchTitles();
                setError('');
            } else {
                const data = await res.json();
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to create title');
        }
    };

    const handleUpdate = async (id, data) => {
        try {
            const res = await fetch(`/api/admin/titles/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setEditingId(null);
                fetchTitles();
            }
        } catch (err) {
            console.error('Update failed', err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this title? If it is used, it cannot be deleted.')) return;
        try {
            const res = await fetch(`/api/admin/titles/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchTitles();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (err) {
            alert('Delete failed');
        }
    };

    const startEdit = (title) => {
        setEditingId(title.id);
        setEditName(title.name);
    }

    return (
        <div className="max-w-4xl mx-auto admin-animate-in">
            <h1 className="admin-title mb-6">職稱管理</h1>

            {/* Add Title Form */}
            <div className="admin-card mb-8">
                <h3 className="admin-card-title">新增職稱</h3>
                <form onSubmit={handleAdd} className="flex gap-4 items-start">
                    <div className="flex-1">
                        <input
                            type="text"
                            className="admin-input"
                            placeholder="例如：物理治療師、營養師..."
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary whitespace-nowrap">
                        <Plus size={18} /> 新增
                    </button>
                </form>
            </div>

            {/* Titles List */}
            <div className="admin-card">
                <h3 className="admin-card-title mb-4">現有職稱列表</h3>
                {loading ? (
                    <p className="text-gray-400">載入中...</p>
                ) : (
                    <div className="space-y-2">
                        {titles.map(title => (
                            <div key={title.id} className={`flex items-center justify-between p-4 rounded-lg border ${title.isActive ? 'bg-white/5 border-white/10' : 'bg-red-500/5 border-red-500/10'}`}>
                                {editingId === title.id ? (
                                    <div className="flex items-center gap-2 flex-1 mr-4">
                                        <input
                                            className="admin-input py-1"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={() => handleUpdate(title.id, { name: editName })} className="text-emerald-500 p-1 hover:bg-emerald-500/10 rounded">
                                            <Save size={18} />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="text-gray-400 p-1 hover:bg-white/10 rounded">
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className={`font-medium ${title.isActive ? 'text-white' : 'text-gray-500 line-through'}`}>
                                            {title.name}
                                        </span>
                                        {!title.isActive && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">已封存</span>}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    {title.isActive ? (
                                        <>
                                            <button onClick={() => startEdit(title)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="編輯">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleUpdate(title.id, { isActive: false })} className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors" title="封存">
                                                <Archive size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleUpdate(title.id, { isActive: true })} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors" title="恢復">
                                            <RotateCcw size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(title.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="刪除">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
