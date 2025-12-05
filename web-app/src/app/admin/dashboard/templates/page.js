"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Globe, Lock, X, Save } from 'lucide-react';

const CATEGORIES = [
    { value: 'health', label: '健康', color: '#10b981' },
    { value: 'fitness', label: '運動', color: '#f59e0b' },
    { value: 'nutrition', label: '營養', color: '#3b82f6' },
    { value: 'mental', label: '心理', color: '#8b5cf6' },
];

const TASK_TYPES = [
    { value: 'binary', label: '一般 (達成/未達成)' },
    { value: 'quantitative', label: '計量 (步數/cc)' },
    { value: 'checklist', label: '清單 (子任務)' },
];

export default function TemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expert, setExpert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'health',
        isPublic: false,
        tasks: []
    });

    const [newTask, setNewTask] = useState({
        title: '',
        type: 'binary',
        category: 'star',
        frequency: 'daily',
        dailyTarget: 1,
        unit: '次',
        stepValue: 1
    });

    useEffect(() => {
        const storedExpert = localStorage.getItem('admin_expert');
        if (storedExpert) {
            setExpert(JSON.parse(storedExpert));
        }
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');
            const res = await fetch(`/api/admin/templates?expertId=${expertData.id}`);
            const data = await res.json();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');

            const url = editingTemplate
                ? `/api/admin/templates/${editingTemplate.id}`
                : '/api/admin/templates';

            const method = editingTemplate ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    expertId: expertData.id
                })
            });

            if (res.ok) {
                setShowModal(false);
                setEditingTemplate(null);
                setFormData({ name: '', description: '', category: 'health', isPublic: false, tasks: [] });
                fetchTemplates();
            } else {
                const error = await res.json();
                alert(error.error || '操作失敗');
            }
        } catch (error) {
            console.error('Save template error:', error);
            alert('儲存失敗');
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

    const openEditModal = (template) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            description: template.description || '',
            category: template.category,
            isPublic: template.isPublic,
            tasks: template.tasks || []
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormData({ name: '', description: '', category: 'health', isPublic: false, tasks: [] });
        setShowModal(true);
    };

    const addTaskToTemplate = () => {
        if (!newTask.title.trim()) return;
        setFormData({
            ...formData,
            tasks: [...formData.tasks, { ...newTask, id: Date.now().toString() }]
        });
        setNewTask({ title: '', type: 'binary', category: 'star', frequency: 'daily', dailyTarget: 1, unit: '次', stepValue: 1 });
    };

    const removeTaskFromTemplate = (index) => {
        setFormData({
            ...formData,
            tasks: formData.tasks.filter((_, i) => i !== index)
        });
    };

    return (
        <div className="admin-animate-in">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">模板管理</h1>
                    <p className="admin-subtitle">建立和管理您的專屬習慣模板</p>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={openCreateModal}>
                    <Plus size={18} /> 新增模板
                </button>
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
                        <div key={template.id} className="admin-template-card">
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
                                <span>{template.tasks?.length || 0} 個任務</span>
                                <span>•</span>
                                <span>{template._count?.assignments || 0} 次指派</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                <button className="admin-btn admin-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEditModal(template)}>
                                    <Edit2 size={14} /> 編輯
                                </button>
                                <button className="admin-btn admin-btn-danger" style={{ padding: '10px' }} onClick={() => handleDelete(template.id)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">{editingTemplate ? '編輯模板' : '新增模板'}</h3>
                            <button className="admin-modal-close" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <div className="admin-form-group">
                                <label className="admin-label">模板名稱</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    placeholder="例如：減重 30 天計畫"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-label">描述</label>
                                <textarea
                                    className="admin-input admin-textarea"
                                    placeholder="模板的詳細說明..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="admin-form-group">
                                    <label className="admin-label">分類</label>
                                    <select
                                        className="admin-input admin-select"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">公開設定</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.isPublic}
                                            onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <span style={{ color: '#aaa', fontSize: '0.875rem' }}>允許所有用戶選用</span>
                                    </label>
                                </div>
                            </div>

                            {/* Tasks in Template */}
                            <div className="admin-form-group" style={{ marginTop: '24px' }}>
                                <label className="admin-label">模板內的任務 ({formData.tasks.length})</label>

                                {formData.tasks.length > 0 && (
                                    <div style={{ marginBottom: '16px' }}>
                                        {formData.tasks.map((task, index) => (
                                            <div key={task.id || index} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '8px',
                                                marginBottom: '8px'
                                            }}>
                                                <div>
                                                    <span style={{ color: 'white', fontWeight: '500' }}>{task.title}</span>
                                                    <span style={{ color: '#666', fontSize: '0.75rem', marginLeft: '8px' }}>
                                                        {TASK_TYPES.find(t => t.value === task.type)?.label}
                                                    </span>
                                                </div>
                                                <button onClick={() => removeTaskFromTemplate(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add New Task */}
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            placeholder="任務名稱"
                                            value={newTask.title}
                                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                        />
                                        <select
                                            className="admin-input admin-select"
                                            value={newTask.type}
                                            onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                                        >
                                            {TASK_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {newTask.type === 'quantitative' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                            <input
                                                type="number"
                                                className="admin-input"
                                                placeholder="目標數值"
                                                value={newTask.dailyTarget}
                                                onChange={e => setNewTask({ ...newTask, dailyTarget: parseInt(e.target.value) || 0 })}
                                            />
                                            <input
                                                type="text"
                                                className="admin-input"
                                                placeholder="單位"
                                                value={newTask.unit}
                                                onChange={e => setNewTask({ ...newTask, unit: e.target.value })}
                                            />
                                            <input
                                                type="number"
                                                className="admin-input"
                                                placeholder="增量"
                                                value={newTask.stepValue}
                                                onChange={e => setNewTask({ ...newTask, stepValue: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                    )}
                                    <button className="admin-btn admin-btn-primary" onClick={addTaskToTemplate} style={{ width: '100%', justifyContent: 'center' }}>
                                        <Plus size={16} /> 加入任務
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="admin-modal-footer">
                            <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                            <button className="admin-btn admin-btn-primary" onClick={handleCreateOrUpdate}>
                                <Save size={16} /> {editingTemplate ? '儲存變更' : '建立模板'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
