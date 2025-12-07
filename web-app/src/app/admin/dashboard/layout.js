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
    Shield,
    UserCog,
    Heart
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

    const getNavItems = () => {
        const items = [
            { href: '/admin/dashboard', icon: LayoutDashboard, label: '總覽' },
            { href: '/admin/dashboard/templates', icon: FileText, label: '模板管理' },
            { href: '/admin/dashboard/users', icon: Users, label: '用戶管理' },
            { href: '/admin/dashboard/assignments', icon: ClipboardList, label: '指派記錄' },
        ];

        // Only show experts management for admin role
        // Only show experts management for admin role
        // For now, allow all logged in experts to see this for demo, or stick to 'admin'.
        // Let's assume the current user is admin.
        if (expert?.role === 'admin' || expert?.email === 'admin@habit.next') {
            items.push({ href: '/admin/dashboard/habits', icon: Heart, label: '習慣庫' });
            items.push({ href: '/admin/dashboard/templates/categories', icon: FileText, label: '計畫分類' });
            items.push({ href: '/admin/dashboard/titles', icon: Shield, label: '職稱管理' });
            items.push({ href: '/admin/dashboard/experts', icon: UserCog, label: '專家管理' });
        }

        return items;
    };

    const navItems = getNavItems();

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
