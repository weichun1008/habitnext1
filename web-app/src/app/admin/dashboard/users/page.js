"use client";

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, ClipboardList, X, Send } from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expert, setExpert] = useState(null);
    const [templates, setTemplates] = useState([]);

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [assignNotes, setAssignNotes] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        const storedExpert = localStorage.getItem('admin_expert');
        if (storedExpert) {
            setExpert(JSON.parse(storedExpert));
        }
        fetchUsers();
        fetchTemplates();
    }, []);

    const fetchUsers = async (searchTerm = '', page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '20' });
            if (searchTerm) params.set('search', searchTerm);

            const res = await fetch(`/api/admin/users?${params}`);
            const data = await res.json();
            setUsers(data.users || []);
            setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');
            const res = await fetch(`/api/admin/templates?expertId=${expertData.id}`);
            const data = await res.json();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(search);
    };

    const openAssignModal = (user) => {
        setSelectedUser(user);
        setSelectedTemplate('');
        setAssignNotes('');
        setShowAssignModal(true);
    };

    const handleAssign = async () => {
        if (!selectedTemplate || !selectedUser) return;

        setAssigning(true);
        try {
            const res = await fetch('/api/admin/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    templateId: selectedTemplate,
                    expertId: expert.id,
                    notes: assignNotes
                })
            });

            if (res.ok) {
                alert('指派成功！用戶現在可以看到新任務了。');
                setShowAssignModal(false);
                fetchUsers(search);
            } else {
                const error = await res.json();
                alert(error.error || '指派失敗');
            }
        } catch (error) {
            console.error('Assign error:', error);
            alert('指派失敗');
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="admin-animate-in">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">用戶管理</h1>
                    <p className="admin-subtitle">搜尋用戶並指派模板</p>
                </div>
            </div>

            {/* Search */}
            <div className="admin-card" style={{ marginBottom: '24px' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
                    <div className="admin-search" style={{ flex: 1 }}>
                        <Search size={18} className="admin-search-icon" />
                        <input
                            type="text"
                            className="admin-input admin-search-input"
                            placeholder="搜尋用戶（暱稱或電話）"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary">
                        <Search size={16} /> 搜尋
                    </button>
                </form>
            </div>

            {/* Users Table */}
            <div className="admin-card">
                {loading ? (
                    <div className="admin-empty">載入中...</div>
                ) : users.length === 0 ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">👥</div>
                        <p className="admin-empty-text">無符合的用戶</p>
                    </div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>用戶</th>
                                    <th>電話</th>
                                    <th>任務數</th>
                                    <th>已指派</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontWeight: '600',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {user.nickname?.charAt(0) || '?'}
                                                </div>
                                                <span style={{ color: 'white', fontWeight: '500' }}>{user.nickname}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#888' }}>{user.phone}</td>
                                        <td>{user._count?.tasks || 0}</td>
                                        <td>
                                            {user.assignments?.length > 0 ? (
                                                <div>
                                                    {user.assignments.slice(0, 2).map((a, i) => (
                                                        <span key={i} className="admin-badge admin-badge-success" style={{ marginRight: '4px', marginBottom: '4px' }}>
                                                            {a.template?.name}
                                                        </span>
                                                    ))}
                                                    {user.assignments.length > 2 && (
                                                        <span style={{ color: '#666', fontSize: '0.75rem' }}>+{user.assignments.length - 2}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#666' }}>無</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="admin-btn admin-btn-primary"
                                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                                onClick={() => openAssignModal(user)}
                                            >
                                                <UserPlus size={14} /> 指派
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination Info */}
                        <div style={{ marginTop: '16px', textAlign: 'center', color: '#666', fontSize: '0.875rem' }}>
                            共 {pagination.total} 位用戶，第 {pagination.page} / {pagination.pages} 頁
                        </div>
                    </>
                )}
            </div>

            {/* Assign Modal */}
            {showAssignModal && selectedUser && (
                <div className="admin-modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">指派模板給 {selectedUser.nickname}</h3>
                            <button className="admin-modal-close" onClick={() => setShowAssignModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <div className="admin-form-group">
                                <label className="admin-label">選擇模板</label>
                                <select
                                    className="admin-input admin-select"
                                    value={selectedTemplate}
                                    onChange={e => setSelectedTemplate(e.target.value)}
                                >
                                    <option value="">請選擇模板...</option>
                                    {templates.map(template => (
                                        <option key={template.id} value={template.id}>
                                            {template.name} ({template.tasks?.length || 0} 個任務)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-label">備註給用戶（選填）</label>
                                <textarea
                                    className="admin-input admin-textarea"
                                    placeholder="例如：這是為您客製化的健康計畫，請每日確實執行..."
                                    value={assignNotes}
                                    onChange={e => setAssignNotes(e.target.value)}
                                />
                            </div>

                            {templates.length === 0 && (
                                <div style={{
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    color: '#f59e0b',
                                    fontSize: '0.875rem'
                                }}>
                                    ⚠️ 您尚未建立任何模板。請先前往「模板管理」建立模板。
                                </div>
                            )}
                        </div>
                        <div className="admin-modal-footer">
                            <button className="admin-btn admin-btn-secondary" onClick={() => setShowAssignModal(false)}>取消</button>
                            <button
                                className="admin-btn admin-btn-primary"
                                onClick={handleAssign}
                                disabled={!selectedTemplate || assigning}
                            >
                                <Send size={16} /> {assigning ? '指派中...' : '確認指派'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
