"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Users, ClipboardList, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        templates: 0,
        users: 0,
        assignments: 0,
        activeAssignments: 0
    });
    const [loading, setLoading] = useState(true);
    const [expert, setExpert] = useState(null);

    useEffect(() => {
        const storedExpert = localStorage.getItem('admin_expert');
        if (storedExpert) {
            setExpert(JSON.parse(storedExpert));
        }
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');

            const [templatesRes, usersRes, assignmentsRes] = await Promise.all([
                fetch(`/api/admin/templates?expertId=${expertData.id}`),
                fetch('/api/admin/users?limit=1'),
                fetch(`/api/admin/assignments?expertId=${expertData.id}`)
            ]);

            const templates = await templatesRes.json();
            const usersData = await usersRes.json();
            const assignments = await assignmentsRes.json();

            setStats({
                templates: Array.isArray(templates) ? templates.length : 0,
                users: usersData?.pagination?.total || 0,
                assignments: Array.isArray(assignments) ? assignments.length : 0,
                activeAssignments: Array.isArray(assignments) ? assignments.filter(a => a.status === 'active').length : 0
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-animate-in">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">歡迎回來，{expert?.name || '專家'}</h1>
                    <p className="admin-subtitle">以下是您的管理總覽</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card primary">
                    <div className="admin-stat-label">我的模板</div>
                    <div className="admin-stat-value">{loading ? '...' : stats.templates}</div>
                    <FileText size={24} style={{ color: '#10b981', marginTop: '12px' }} />
                </div>

                <div className="admin-stat-card secondary">
                    <div className="admin-stat-label">用戶總數</div>
                    <div className="admin-stat-value">{loading ? '...' : stats.users}</div>
                    <Users size={24} style={{ color: '#3b82f6', marginTop: '12px' }} />
                </div>

                <div className="admin-stat-card warning">
                    <div className="admin-stat-label">活躍指派</div>
                    <div className="admin-stat-value">{loading ? '...' : stats.activeAssignments}</div>
                    <ClipboardList size={24} style={{ color: '#f59e0b', marginTop: '12px' }} />
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-label">總指派數</div>
                    <div className="admin-stat-value">{loading ? '...' : stats.assignments}</div>
                    <TrendingUp size={24} style={{ color: '#888', marginTop: '12px' }} />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="admin-card">
                <h2 className="admin-card-title">快速操作</h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a href="/admin/dashboard/templates" className="admin-btn admin-btn-primary">
                        <FileText size={18} /> 管理模板
                    </a>
                    <a href="/admin/dashboard/users" className="admin-btn admin-btn-secondary">
                        <Users size={18} /> 查看用戶
                    </a>
                    <a href="/admin/dashboard/assignments" className="admin-btn admin-btn-secondary">
                        <ClipboardList size={18} /> 指派記錄
                    </a>
                </div>
            </div>

            {/* Tips */}
            <div className="admin-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <h2 className="admin-card-title" style={{ color: '#10b981' }}>💡 操作提示</h2>
                <ul style={{ fontSize: '0.875rem', color: '#aaa', lineHeight: '1.8', paddingLeft: '20px' }}>
                    <li>在「模板管理」中建立您的專屬習慣模板</li>
                    <li>設定模板為「公開」可讓所有用戶自行選用</li>
                    <li>在「用戶管理」中搜尋用戶並直接指派模板</li>
                    <li>被指派的任務會自動鎖定，用戶無法自行修改</li>
                </ul>
            </div>
        </div>
    );
}
