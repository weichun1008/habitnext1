"use client";

import React, { useState } from 'react';
import { X, User, Phone, Lock, Save, Loader, Eye, EyeOff } from 'lucide-react';

const ProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [formData, setFormData] = useState({
        nickname: user?.nickname || '',
        phone: user?.phone || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [changePassword, setChangePassword] = useState(false);

    // Reset form when user changes
    React.useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                nickname: user.nickname || '',
                phone: user.phone || '',
            }));
        }
    }, [user]);

    const handleSave = async () => {
        setError('');
        setSuccess('');

        // Validate password if changing
        if (changePassword) {
            if (!formData.oldPassword) {
                setError('請輸入舊密碼');
                return;
            }
            if (!formData.newPassword) {
                setError('請輸入新密碼');
                return;
            }
            if (formData.newPassword.length < 6) {
                setError('新密碼至少需要 6 個字元');
                return;
            }
            if (formData.newPassword !== formData.confirmPassword) {
                setError('新密碼與確認密碼不一致');
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                userId: user.id,
                nickname: formData.nickname,
                phone: formData.phone,
            };

            if (changePassword) {
                payload.oldPassword = formData.oldPassword;
                payload.newPassword = formData.newPassword;
            }

            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('資料已更新');
                // Update parent
                if (onUpdate) {
                    onUpdate({
                        ...user,
                        nickname: formData.nickname,
                        phone: formData.phone,
                    });
                }
                // Reset password fields
                setFormData(prev => ({
                    ...prev,
                    oldPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                }));
                setChangePassword(false);

                // Auto close after delay
                setTimeout(() => {
                    setSuccess('');
                    onClose();
                }, 1500);
            } else {
                setError(data.error || '更新失敗');
            }
        } catch (err) {
            console.error('Profile update error:', err);
            setError('網路錯誤，請稍後再試');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <User size={20} className="text-indigo-500" />
                        個人資料
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {/* Avatar Preview */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            {formData.nickname?.[0] || user?.name?.[0] || 'U'}
                        </div>
                    </div>

                    {/* Nickname */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">暱稱</label>
                        <div className="relative">
                            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={formData.nickname}
                                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="輸入你的暱稱"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">手機號碼</label>
                        <div className="relative">
                            <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="輸入手機號碼"
                            />
                        </div>
                    </div>

                    {/* Password Change Toggle */}
                    <div className="pt-2">
                        <button
                            onClick={() => setChangePassword(!changePassword)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        >
                            <Lock size={14} />
                            {changePassword ? '取消修改密碼' : '修改密碼'}
                        </button>
                    </div>

                    {/* Password Fields */}
                    {changePassword && (
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">舊密碼</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={formData.oldPassword}
                                        onChange={(e) => setFormData(prev => ({ ...prev, oldPassword: e.target.value }))}
                                        className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="輸入舊密碼"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={formData.newPassword}
                                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="輸入新密碼（至少 6 字元）"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="再次輸入新密碼"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error / Success */}
                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
                    )}
                    {success && (
                        <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg">{success}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                        儲存
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
