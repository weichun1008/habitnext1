import React, { useState } from 'react';
import { User, Phone, ArrowRight, Loader2 } from 'lucide-react';

const LoginModal = ({ isOpen, onLogin }) => {
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nickname || !phone) {
            setError('請填寫暱稱和手機號碼');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, phone })
            });

            const data = await res.json();

            if (res.ok) {
                onLogin(data);
            } else {
                setError(data.error || '登入失敗，請稍後再試');
            }
        } catch (err) {
            setError('網路連線錯誤');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                <div className="bg-emerald-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <User size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-1">歡迎回來</h2>
                    <p className="text-emerald-100 text-sm">登入以同步您的習慣紀錄</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">暱稱</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    placeholder="怎麼稱呼您？"
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">手機號碼</label>
                            <div className="relative">
                                <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="tel"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    placeholder="0912345678"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 ml-1">* 僅用於識別帳號，免驗證碼</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <>開始使用 <ArrowRight size={18} /></>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
