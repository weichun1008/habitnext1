"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Lock, Mail, Briefcase, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminRegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        title: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSuccess(true);
                // Delay redirect
                setTimeout(() => {
                    router.push('/admin/login');
                }, 2000);
            } else {
                const data = await res.json();
                setError(data.error || '註冊失敗');
            }
        } catch (err) {
            setError('網路錯誤，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="admin-login-container">
                <div className="admin-login-box admin-animate-in text-center p-8">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">註冊成功！</h2>
                    <p className="text-gray-500 mb-6">您的帳號已建立，請等待管理員開通權限。<br />即將跳轉至登入頁面...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-login-container">
            <div className="admin-login-box admin-animate-in">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 className="admin-login-title">申請專家帳號</h1>
                    <p className="admin-login-subtitle">加入 HabitNext 專家團隊</p>
                </div>

                <form onSubmit={handleRegister}>
                    <div className="space-y-4">
                        <div className="admin-form-group">
                            <label className="admin-label">真實姓名</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    className="admin-input pl-11 w-full"
                                    placeholder="例如：王小明"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">專業職稱</label>
                            <div className="relative">
                                <Briefcase size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    className="admin-input pl-11 w-full"
                                    placeholder="例如：各人健身教練、營養師"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">Email (登入帳號)</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    className="admin-input pl-11 w-full"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">設定密碼</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    className="admin-input pl-11 w-full"
                                    placeholder="6 位數以上密碼"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-500 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="admin-btn admin-btn-primary w-full justify-center mt-6 py-3.5"
                        disabled={loading}
                    >
                        {loading ? '提交中...' : '提交申請'}
                    </button>
                </form>

                <div className="text-center mt-6 pt-6 border-t border-gray-100">
                    <Link href="/admin/login" className="text-sm text-gray-500 hover:text-emerald-600 font-medium transition-colors">
                        已有帳號？返回登入
                    </Link>
                </div>
            </div>
        </div>
    );
}
