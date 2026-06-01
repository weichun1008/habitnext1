"use client";

import React, { useState } from 'react';
import { X, User, Phone, Lock, Save, Loader, Eye, EyeOff, LogOut, Sparkles } from 'lucide-react';
import { AVATAR_DEFS, DEFAULT_AVATAR_ID, getAvatarDef } from '@/lib/avatars';
import MyAspirationsTab from './profile/MyAspirationsTab';

const ProfileModal = ({ isOpen, onClose, user, onUpdate, onLogout }) => {
    // Two tabs (Slice K Task 8): 'profile' (default — existing avatar/name/
    // phone/password form) and 'aspirations' (list + manage user's
    // 我的嚮往). Footer save button only renders on 'profile' tab — the
    // aspirations tab has no batch save, each row mutates inline.
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        nickname: user?.nickname || '',
        phone: user?.phone || '',
        avatar: user?.avatar || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [changePassword, setChangePassword] = useState(false);
    // Slice O — opt-in 記錄完成地點 (default off). Persists immediately on toggle.
    const [trackLocation, setTrackLocation] = useState(!!user?.trackLocation);

    const handleToggleTrackLocation = async () => {
        const next = !trackLocation;
        setTrackLocation(next);
        try {
            await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, trackLocation: next }),
            });
            onUpdate?.({ ...user, trackLocation: next });
            // First enable → trigger one permission prompt (best-effort, non-blocking)
            if (next && typeof navigator !== 'undefined' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: false, timeout: 8000 });
            }
        } catch (e) {
            console.error('toggle trackLocation failed', e);
            setTrackLocation(!next); // revert on error
        }
    };

    // Reset form when user changes
    React.useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                nickname: user.nickname || '',
                phone: user.phone || '',
                avatar: user.avatar || '',
            }));
            setTrackLocation(!!user.trackLocation);   // ★ Slice O
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
                avatar: formData.avatar,
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
                // Use the server's echoed user when available so the parent's
                // user state is the canonical, persisted version — not just an
                // optimistic merge of the form. Falls back to a merge if the
                // route didn't return a user (e.g. the "no changes" short
                // circuit).
                if (onUpdate) {
                    const merged = {
                        ...user,
                        nickname: formData.nickname,
                        phone: formData.phone,
                        avatar: formData.avatar,
                        ...(data?.user || {}),
                    };
                    onUpdate(merged);
                }
                // Reset password fields
                setFormData(prev => ({
                    ...prev,
                    oldPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                }));
                setChangePassword(false);

                // Close immediately on success — the brief "資料已更新" toast
                // was extra friction; the closed modal + updated avatar are
                // confirmation enough.
                onClose();
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
            {/* max-h-[calc(100dvh-2rem)] = viewport minus the p-4 padding above
                so the card never overshoots the screen. Switching to a flex
                column lets header / footer stay pinned while content scrolls.
                Using 100dvh (not 100vh) accounts for iOS Safari's URL bar. */}
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-fade-in-up flex flex-col max-h-[calc(100dvh-2rem)]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        {activeTab === 'profile' ? (
                            <><User size={20} className="text-indigo-500" /> 個人資料</>
                        ) : (
                            <><Sparkles size={20} className="text-emerald-500" /> 我的嚮往</>
                        )}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 -m-1">
                        <X size={24} />
                    </button>
                </div>

                {/* Tab switcher */}
                <div className="flex border-b border-gray-100 shrink-0 px-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        aria-pressed={activeTab === 'profile'}
                        className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'profile'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        個人資料
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('aspirations')}
                        aria-pressed={activeTab === 'aspirations'}
                        className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'aspirations'
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        我的嚮往
                    </button>
                </div>

                {/* Content (scrollable) — branches by activeTab. */}
                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                    {activeTab === 'aspirations' && (
                        <MyAspirationsTab userId={user?.id} />
                    )}
                    {activeTab === 'profile' && (<>
                    {/* Avatar Preview + Picker — Material 3 Expressive set */}
                    {(() => {
                        const previewId = formData.avatar || DEFAULT_AVATAR_ID;
                        const previewDef = getAvatarDef(previewId);
                        return (
                            <div>
                                <div className="flex justify-center mb-4">
                                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-200 shadow-lg bg-gray-100">
                                        {previewDef
                                            ? <previewDef.Component />
                                            : (
                                                <div className="w-full h-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold">
                                                    {formData.nickname?.[0] || user?.name?.[0] || 'U'}
                                                </div>
                                            )}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 text-center mb-2">選擇你的頭像</p>
                                <div className="grid grid-cols-6 gap-2">
                                    {AVATAR_DEFS.map(def => {
                                        const isSelected = formData.avatar === def.id;
                                        return (
                                            <button
                                                key={def.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, avatar: def.id }))}
                                                className={`relative aspect-square rounded-full overflow-hidden transition-all ${
                                                    isSelected
                                                        ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105'
                                                        : 'ring-1 ring-gray-200 hover:ring-indigo-300 hover:scale-105'
                                                }`}
                                                title={def.label}
                                                aria-label={def.label}
                                                aria-pressed={isSelected}
                                            >
                                                <def.Component />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

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

                    {/* Slice O — opt-in 記錄完成地點 */}
                    <div className="flex items-start justify-between gap-3 py-3 border-t border-gray-100">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-800">記錄完成地點 📍</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                僅在你完成習慣時記錄城市、只存座標數字、不會背景追蹤你的位置。可隨時關閉。
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleToggleTrackLocation}
                            aria-pressed={trackLocation}
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${trackLocation ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${trackLocation ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>

                    {/* Error / Success */}
                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
                    )}
                    {success && (
                        <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg">{success}</div>
                    )}
                    </>)}
                </div>

                {/* Footer (pinned) — Save / Cancel only on the profile tab;
                    aspirations rows mutate inline so there's nothing to save
                    in batch. Logout stays visible on both tabs. */}
                <div className="p-5 border-t border-gray-100 space-y-3 shrink-0">
                    {activeTab === 'profile' && (
                        <div className="flex gap-3">
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
                    )}
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="w-full py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <LogOut size={16} />
                            登出
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
