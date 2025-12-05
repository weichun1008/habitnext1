"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Shield, User, UserCheck } from 'lucide-react';

const ROLES = [
    { value: 'admin', label: '最高管理員', color: '#ef4444', icon: Shield },
    { value: 'expert', label: '習慣建立者', color: '#10b981', icon: UserCheck },
    { value: 'viewer', label: '檢視者', color: '#6b7280', icon: User },
];

export default function ExpertsPage() {
    const [experts, setExperts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentExpert, setCurrentExpert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingExpert, setEditingExpert] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        title: '',
        pin: '',
        role: 'expert'
    });

    useEffect(() => {
        const storedExpert = localStorage.getItem('admin_expert');
        if (storedExpert) {
            setCurrentExpert(JSON.parse(storedExpert));
        }
        fetchExperts();
    }, []);

    const fetchExperts = async () => {
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');
            const res = await fetch(`/api/admin/experts?requesterId=${expertData.id}`);
            if (res.ok) {
                const data = await res.json();
                setExperts(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch experts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');

            const url = editingExpert
                ? `/api/admin/experts/${editingExpert.id}`
                : '/api/admin/experts';

            const method = editingExpert ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    createdBy: expertData.id,
                    requesterId: expertData.id
                })
            });

            if (res.ok) {
                setShowModal(false);
                setEditingExpert(null);
                setFormData({ name: '', title: '', pin: '', role: 'expert' });
                fetchExperts();
            } else {
                const error = await res.json();
                alert(error.error || '操作失敗');
            }
        } catch (error) {
            console.error('Save expert error:', error);
            alert('儲存失敗');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('確定要刪除此專家帳號嗎？')) return;

        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');
            const res = await fetch(`/api/admin/experts/${id}?requesterId=${expertData.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchExperts();
            } else {
                const error = await res.json();
                alert(error.error || '刪除失敗');
            }
        } catch (error) {
            console.error('Delete expert error:', error);
        }
    };

    const openEditModal = (expert) => {
        setEditingExpert(expert);
        setFormData({
            name: expert.name,
            title: expert.title,
            pin: '',
            role: expert.role
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingExpert(null);
        setFormData({ name: '', title: '', pin: '', role: 'expert' });
        setShowModal(true);
    };

    const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[1];

    if (currentExpert?.role !== 'admin') {
        return (
            <div className="admin-animate-in">
                <div className="admin-empty">
                    <div className="admin-empty-icon">🔒</div>
                    <p className="admin-empty-text">您沒有權限訪問此頁面</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-animate-in">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">專家管理</h1>
                    <p className="admin-subtitle">建立和管理專家帳號</p>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={openCreateModal}>
                    <Plus size={18} /> 新增專家
                </button>
            </div>

            {loading ? (
                <div className="admin-empty">載入中...</div>
            ) : experts.length === 0 ? (
                <div className="admin-empty">
                    <div className="admin-empty-icon">👥</div>
                    <p className="admin-empty-text">尚無專家帳號</p>
                </div>
            ) : (
                <div className="admin-card">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>姓名</th>
                                <th>職稱</th>
                                <th>角色</th>
                                <th>狀態</th>
                                <th>模板數</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {experts.map(expert => {
                                const roleInfo = getRoleInfo(expert.role);
                                return (
                                    <tr key={expert.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    background: `linear-gradient(135deg, ${roleInfo.color}40, ${roleInfo.color}20)`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: roleInfo.color,
                                                    fontWeight: '600',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {expert.name.charAt(0)}
                                                </div>
                                                <span style={{ fontWeight: '500' }}>{expert.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#888' }}>{expert.title}</td>
                                        <td>
                                            <span className={`admin-badge`} style={{
                                                background: `${roleInfo.color}20`,
                                                color: roleInfo.color
                                            }}>
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${expert.isActive ? 'admin-badge-success' : 'admin-badge-secondary'}`}>
                                                {expert.isActive ? '啟用' : '停用'}
                                            </span>
                                        </td>
                                        <td style={{ color: '#888' }}>{expert._count?.templates || 0}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="admin-btn admin-btn-secondary"
                                                    style={{ padding: '6px 10px' }}
                                                    onClick={() => openEditModal(expert)}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                {expert.id !== currentExpert?.id && (
                                                    <button
                                                        className="admin-btn admin-btn-danger"
                                                        style={{ padding: '6px 10px' }}
                                                        onClick={() => handleDelete(expert.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">{editingExpert ? '編輯專家' : '新增專家'}</h3>
                            <button className="admin-modal-close" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <div className="admin-form-group">
                                <label className="admin-label">姓名</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    placeholder="輸入專家姓名"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-label">職稱</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    placeholder="例如：醫師、營養師"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-label">PIN 碼 {editingExpert && '(留空保持不變)'}</label>
                                <input
                                    type="password"
                                    className="admin-input"
                                    placeholder="輸入 4-6 位數 PIN 碼"
                                    value={formData.pin}
                                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                />
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-label">角色權限</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {ROLES.map(role => (
                                        <label
                                            key={role.value}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                background: formData.role === role.value ? `${role.color}15` : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${formData.role === role.value ? role.color : 'rgba(255,255,255,0.1)'}`,
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={role.value}
                                                checked={formData.role === role.value}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                style={{ width: '16px', height: '16px' }}
                                            />
                                            <role.icon size={20} style={{ color: role.color }} />
                                            <div>
                                                <div style={{ fontWeight: '500', color: 'white' }}>{role.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                                    {role.value === 'admin' && '可管理所有專家和功能'}
                                                    {role.value === 'expert' && '可建立模板和指派任務'}
                                                    {role.value === 'viewer' && '僅可查看資料'}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="admin-modal-footer">
                            <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                            <button className="admin-btn admin-btn-primary" onClick={handleCreateOrUpdate}>
                                <Save size={16} /> {editingExpert ? '儲存變更' : '建立專家'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
