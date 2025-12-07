"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const expert = await res.json();
                localStorage.setItem('admin_expert', JSON.stringify(expert));
                router.push('/admin/dashboard');
            } else {
                const data = await res.json();
                setError(data.error || '登入失敗');
            }
        } catch (err) {
            setError('網路錯誤，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-box admin-animate-in">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <Shield size={32} color="white" />
                    </div>
                </div>

                <h1 className="admin-login-title">專家後台登入</h1>
                <p className="admin-login-subtitle">請輸入 Email 與密碼</p>

                <form onSubmit={handleLogin}>
                    <div className="admin-form-group">
                        <label className="admin-label">Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                            <input
                                type="email"
                                className="admin-input"
                                style={{ paddingLeft: '44px' }}
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="admin-form-group">
                        <label className="admin-label">密碼</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                            <input
                                type="password"
                                className="admin-input"
                                style={{ paddingLeft: '44px' }}
                                placeholder="輸入密碼"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            marginBottom: '20px',
                            color: '#ef4444',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="admin-btn admin-btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                        disabled={loading}
                    >
                        {loading ? '登入中...' : '登入後台'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                        <Link href="/admin/register" style={{ fontSize: '0.9rem', color: '#666', textDecoration: 'none' }}>
                            還沒有帳號？ <span style={{ color: '#10b981', fontWeight: 'bold' }}>立即申請</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
