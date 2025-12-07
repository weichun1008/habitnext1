"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Search, User, Mail, Calendar, Briefcase } from 'lucide-react';

export default function ExpertsPage() {
    const [experts, setExperts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [titles, setTitles] = useState([]);

    // Edit Modal State
    const [editingExpert, setEditingExpert] = useState(null);
    const [editFormData, setEditFormData] = useState({ titleId: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [expertsRes, titlesRes] = await Promise.all([
                fetch('/api/admin/experts'),
                fetch('/api/admin/titles')
            ]);

            if (expertsRes.ok) {
                const data = await expertsRes.json();
                setExperts(data);
            }
            if (titlesRes.ok) {
                const titleData = await titlesRes.json();
                setTitles(titleData.filter(t => t.isActive));
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleApproval = async (expert) => {
        const newStatus = !expert.isApproved;
        const confirmMsg = newStatus
            ? `確定要開通 ${expert.name} 的公開權限嗎？`
            : `確定要暫停 ${expert.name} 的公開權限嗎？`;

        if (!confirm(confirmMsg)) return;

        // Optimistic update
        setExperts(prev => prev.map(e => e.id === expert.id ? { ...e, isApproved: newStatus } : e));

        try {
            const res = await fetch('/api/admin/experts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: expert.id, isApproved: newStatus })
            });

            if (!res.ok) throw new Error('Update failed');
        } catch (error) {
            console.error(error);
            alert('操作失敗');
            fetchData(); // Revert
        }
    };

    const openEditModal = (expert) => {
        setEditingExpert(expert);
        setEditFormData({ titleId: expert.titleId || '' });
    };

    const handleUpdateExpert = async () => {
        if (!editingExpert) return;

        try {
            const res = await fetch('/api/admin/experts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingExpert.id,
                    titleId: editFormData.titleId
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setExperts(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
                setEditingExpert(null);
            } else {
                alert('更新失敗');
            }
        } catch (error) {
            console.error(error);
            alert('更新錯誤');
        }
    };

    const filteredExperts = experts.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="admin-animate-in max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="admin-title">專家管理</h1>
                    <p className="admin-subtitle">管理專家帳號與審核權限</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="admin-card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">總專家數</p>
                        <p className="text-2xl font-bold text-white">{experts.length}</p>
                    </div>
                </div>
                <div className="admin-card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Check size={24} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">已開通</p>
                        <p className="text-2xl font-bold text-white">{experts.filter(e => e.isApproved).length}</p>
                    </div>
                </div>
                <div className="admin-card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">待審核</p>
                        <p className="text-2xl font-bold text-white">{experts.filter(e => !e.isApproved).length}</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    className="admin-input pl-12"
                    placeholder="搜尋專家姓名或 Email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="admin-card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-sm uppercase">
                                <th className="p-4 font-medium pl-6">專家資訊</th>
                                <th className="p-4 font-medium">職稱</th>
                                <th className="p-4 font-medium">註冊日期</th>
                                <th className="p-4 font-medium">建立模板</th>
                                <th className="p-4 font-medium">狀態</th>
                                <th className="p-4 font-medium text-right pr-6">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">載入中...</td></tr>
                            ) : filteredExperts.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">沒有找到符合的專家</td></tr>
                            ) : (
                                filteredExperts.map(expert => (
                                    <tr key={expert.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                                                    {expert.name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{expert.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Mail size={12} /> {expert.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            <div className="flex items-center gap-2 cursor-pointer hover:text-white" onClick={() => openEditModal(expert)}>
                                                <Briefcase size={14} className="text-gray-500" />
                                                {expert.expertTitle?.name || expert.title || <span className="text-gray-600 italic">未設定</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {new Date(expert.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-gray-800 px-2.5 py-1 rounded-md text-xs font-mono text-gray-300">
                                                {expert._count.templates}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {expert.isApproved ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                    <Check size={12} /> 已開通
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    <X size={12} /> 未審核
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(expert)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                                                >
                                                    編輯
                                                </button>
                                                <button
                                                    onClick={() => handleToggleApproval(expert)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${expert.isApproved
                                                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                                                        : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                                        }`}
                                                >
                                                    {expert.isApproved ? '暫停' : '開通'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingExpert && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center p-4 border-b border-gray-800">
                            <h3 className="text-lg font-bold text-white">編輯專家資訊</h3>
                            <button onClick={() => setEditingExpert(null)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">專家姓名</label>
                                <div className="text-white font-medium bg-white/5 p-3 rounded-lg border border-white/10">
                                    {editingExpert.name}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">設定職稱</label>
                                <select
                                    className="admin-input w-full"
                                    value={editFormData.titleId}
                                    onChange={e => setEditFormData({ ...editFormData, titleId: e.target.value })}
                                >
                                    <option value="">-- 請選擇職稱 --</option>
                                    {titles.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    若列表中沒有需要的職稱，請先至「職稱管理」新增。
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setEditingExpert(null)}
                                    className="px-4 py-2 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-gray-700"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleUpdateExpert}
                                    className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-500"
                                >
                                    儲存變更
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
