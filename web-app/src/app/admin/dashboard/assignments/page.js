"use client";

import React, { useState, useEffect } from 'react';
import { Eye, Trash2, PauseCircle, PlayCircle, X } from 'lucide-react';

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expert, setExpert] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        const storedExpert = localStorage.getItem('admin_expert');
        if (storedExpert) {
            setExpert(JSON.parse(storedExpert));
        }
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');
            const res = await fetch(`/api/admin/assignments?expertId=${expertData.id}`);
            const data = await res.json();
            setAssignments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const res = await fetch(`/api/admin/assignments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                fetchAssignments();
            }
        } catch (error) {
            console.error('Update status error:', error);
        }
    };

    const deleteAssignment = async (id, deleteTasks = false) => {
        const message = deleteTasks
            ? '這將刪除指派記錄並移除用戶的相關任務。確定嗎？'
            : '這將取消指派，但保留用戶的任務（解除鎖定）。確定嗎？';

        if (!confirm(message)) return;

        try {
            const res = await fetch(`/api/admin/assignments/${id}?deleteTasks=${deleteTasks}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchAssignments();
                setShowDetailModal(false);
            }
        } catch (error) {
            console.error('Delete assignment error:', error);
        }
    };

    const viewDetail = async (assignment) => {
        try {
            const res = await fetch(`/api/admin/assignments/${assignment.id}`);
            const data = await res.json();
            setSelectedAssignment(data);
            setShowDetailModal(true);
        } catch (error) {
            console.error('Fetch assignment detail error:', error);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="admin-badge admin-badge-success">進行中</span>;
            case 'paused':
                return <span className="admin-badge admin-badge-warning">已暫停</span>;
            case 'completed':
                return <span className="admin-badge admin-badge-info">已完成</span>;
            default:
                return <span className="admin-badge">{status}</span>;
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="admin-animate-in">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">指派記錄</h1>
                    <p className="admin-subtitle">追蹤您的模板指派狀態</p>
                </div>
            </div>

            <div className="admin-card">
                {loading ? (
                    <div className="admin-empty">載入中...</div>
                ) : assignments.length === 0 ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">📋</div>
                        <p className="admin-empty-text">尚無指派記錄</p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>用戶</th>
                                <th>模板</th>
                                <th>狀態</th>
                                <th>開始日期</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.map(assignment => (
                                <tr key={assignment.id}>
                                    <td>
                                        <span style={{ color: 'white', fontWeight: '500' }}>
                                            {assignment.user?.nickname || '未知用戶'}
                                        </span>
                                        <br />
                                        <span style={{ color: '#666', fontSize: '0.75rem' }}>
                                            {assignment.user?.phone}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ color: '#10b981' }}>{assignment.template?.name}</span>
                                    </td>
                                    <td>{getStatusBadge(assignment.status)}</td>
                                    <td style={{ color: '#888' }}>{formatDate(assignment.startDate)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="admin-btn admin-btn-secondary"
                                                style={{ padding: '6px 10px' }}
                                                onClick={() => viewDetail(assignment)}
                                            >
                                                <Eye size={14} />
                                            </button>
                                            {assignment.status === 'active' ? (
                                                <button
                                                    className="admin-btn admin-btn-secondary"
                                                    style={{ padding: '6px 10px' }}
                                                    onClick={() => updateStatus(assignment.id, 'paused')}
                                                    title="暫停"
                                                >
                                                    <PauseCircle size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    className="admin-btn admin-btn-secondary"
                                                    style={{ padding: '6px 10px' }}
                                                    onClick={() => updateStatus(assignment.id, 'active')}
                                                    title="恢復"
                                                >
                                                    <PlayCircle size={14} />
                                                </button>
                                            )}
                                            <button
                                                className="admin-btn admin-btn-danger"
                                                style={{ padding: '6px 10px' }}
                                                onClick={() => deleteAssignment(assignment.id, false)}
                                                title="取消指派"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedAssignment && (
                <div className="admin-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">指派詳情</h3>
                            <button className="admin-modal-close" onClick={() => setShowDetailModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>用戶</div>
                                <div style={{ color: 'white', fontWeight: '600' }}>
                                    {selectedAssignment.user?.nickname} ({selectedAssignment.user?.phone})
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>模板</div>
                                <div style={{ color: '#10b981', fontWeight: '600' }}>
                                    {selectedAssignment.template?.name}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>狀態</div>
                                {getStatusBadge(selectedAssignment.status)}
                            </div>

                            {selectedAssignment.notes && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>備註</div>
                                    <div style={{ color: '#aaa', fontSize: '0.875rem' }}>
                                        {selectedAssignment.notes}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px' }}>
                                    已建立的任務 ({selectedAssignment.tasks?.length || 0})
                                </div>
                                {selectedAssignment.tasks?.map((task, index) => (
                                    <div key={task.id || index} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        marginBottom: '6px'
                                    }}>
                                        <span style={{ color: 'white', fontSize: '0.875rem' }}>{task.title}</span>
                                        <span style={{ color: '#666', fontSize: '0.75rem' }}>
                                            完成 {task.history?.length || 0} 次
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="admin-modal-footer">
                            <button
                                className="admin-btn admin-btn-danger"
                                onClick={() => deleteAssignment(selectedAssignment.id, true)}
                            >
                                <Trash2 size={16} /> 刪除並移除任務
                            </button>
                            <button className="admin-btn admin-btn-secondary" onClick={() => setShowDetailModal(false)}>
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
