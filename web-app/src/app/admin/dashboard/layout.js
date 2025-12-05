"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    FileText,
    Users,
    ClipboardList,
    LogOut,
    Shield
} from 'lucide-react';

export default function AdminDashboardLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [expert, setExpert] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedExpert = localStorage.getItem('admin_expert');
        if (storedExpert) {
            setExpert(JSON.parse(storedExpert));
        } else {
            router.push('/admin/login');
        }
        setLoading(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('admin_expert');
        router.push('/admin/login');
    };

    const navItems = [
        { href: '/admin/dashboard', icon: LayoutDashboard, label: '總覽' },
        { href: '/admin/dashboard/templates', icon: FileText, label: '模板管理' },
        { href: '/admin/dashboard/users', icon: Users, label: '用戶管理' },
        { href: '/admin/dashboard/assignments', icon: ClipboardList, label: '指派記錄' },
    ];

    if (loading) {
        return (
            <div className="admin-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <p style={{ color: '#888' }}>載入中...</p>
            </div>
        );
    }

    if (!expert) {
        return null;
    }

    return (
        <div className="admin-container">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-logo">
                    <Shield size={24} />
                    專家後台
                </div>
                <p className="admin-sidebar-subtitle">習慣模板管理系統</p>

                <nav className="admin-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`admin-nav-item ${pathname === item.href ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <div className="admin-expert-info">
                        <div className="admin-expert-avatar">
                            {expert.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                            <div className="admin-expert-name">{expert.name}</div>
                            <div className="admin-expert-title">{expert.title}</div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="admin-nav-item"
                        style={{ width: '100%', marginTop: '12px', border: 'none', background: 'none' }}
                    >
                        <LogOut size={20} />
                        登出
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}
