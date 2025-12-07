import React, { useState } from 'react';
import { User, Phone, ArrowRight, Loader2, Lock, Globe, KeyRound } from 'lucide-react';

const LoginModal = ({ isOpen, onLogin }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [step, setStep] = useState(1); // For register: 1 = details, 2 = verify

    // Form Data
    const [nickname, setNickname] = useState(''); // Only for register? API creates default if missing in register route? Route uses phone last 4 digits.
    // Wait, Register API generates nickname. Login doesn't need nickname anymore.
    // Login: Phone + Password.
    // Register: Phone + Country + Password + Code.

    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+886');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const resetForm = () => {
        setMode('login');
        setStep(1);
        setPhone('');
        setPassword('');
        setVerificationCode('');
        setError('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });

            const data = await res.json();

            if (res.ok) {
                onLogin(data);
                resetForm();
            } else {
                setError(data.error || '登入失敗');
            }
        } catch (err) {
            setError('網路連線錯誤');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterStep1 = (e) => {
        e.preventDefault();
        if (!phone || !password) {
            setError('請填寫完整資料');
            return;
        }
        setStep(2);
        setError('');
    };

    const handleRegisterFinal = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    countryCode,
                    password,
                    verificationCode
                })
            });

            const data = await res.json();

            if (res.ok) {
                // Auto login after register
                // Or just separate login?
                // data contains { success: true, userId, nickname }
                // Let's call login or simulate login.
                // For simplicity, let's just call login API immediately with password.
                const loginRes = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, password })
                });

                if (loginRes.ok) {
                    const userData = await loginRes.json();
                    onLogin(userData);
                    resetForm();
                } else {
                    // Should not happen if register success
                    setMode('login');
                    setError('註冊成功，請登入');
                }
            } else {
                setError(data.error || '註冊失敗');
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
                <div className={`p-8 text-center transition-colors ${mode === 'login' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <User size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-1">
                        {mode === 'login' ? '歡迎回來' : '建立帳號'}
                    </h2>
                    <p className="text-white/80 text-sm">
                        {mode === 'login' ? '登入以同步您的習慣紀錄' : '加入 HabitNext 開始養成好習慣'}
                    </p>
                </div>

                <div className="p-8">
                    {mode === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
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
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">密碼</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="password"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        placeholder="輸入密碼"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
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
                                className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <>登入 <ArrowRight size={18} /></>}
                            </button>

                            <div className="text-center pt-2">
                                <button type="button" onClick={() => { setMode('register'); setError(''); }} className="text-sm text-gray-500 hover:text-emerald-600 font-bold">
                                    還沒有帳號？立即註冊
                                </button>
                            </div>
                        </form>
                    ) : (
                        // REGISTER FORM
                        <form onSubmit={step === 1 ? handleRegisterStep1 : handleRegisterFinal} className="space-y-4">
                            {step === 1 ? (
                                <>
                                    <div className="flex gap-2">
                                        <div className="w-1/3">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">國碼</label>
                                            <div className="relative">
                                                <Globe size={18} className="absolute left-2 top-3 text-gray-400" />
                                                <select
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-2 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                                    value={countryCode}
                                                    onChange={e => setCountryCode(e.target.value)}
                                                >
                                                    <option value="+886">TW +886</option>
                                                    <option value="+86">CN +86</option>
                                                    <option value="+1">US +1</option>
                                                    <option value="+81">JP +81</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">手機號碼</label>
                                            <div className="relative">
                                                <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                    placeholder="0912345678"
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">設定密碼</label>
                                        <div className="relative">
                                            <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                type="password"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                                placeholder="6 位數以上密碼"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        下一步 <ArrowRight size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="text-center mb-4">
                                        <p className="text-sm text-gray-600">驗證碼已發送至</p>
                                        <p className="font-bold text-lg text-gray-800">{countryCode} {phone}</p>
                                        <p className="text-xs text-indigo-500 mt-1">(Demo: 請輸入 8888)</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">驗證碼</label>
                                        <div className="relative">
                                            <KeyRound size={18} className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                type="text"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all tracking-widest text-center font-mono text-lg"
                                                placeholder="####"
                                                value={verificationCode}
                                                onChange={e => setVerificationCode(e.target.value)}
                                                required
                                                maxLength={4}
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg">
                                            {error}
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="w-1/3 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all"
                                        >
                                            返回
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                        >
                                            {loading ? <Loader2 size={20} className="animate-spin" /> : '驗證並註冊'}
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="text-center pt-2">
                                <button type="button" onClick={() => { setMode('login'); setStep(1); setError(''); }} className="text-sm text-gray-500 hover:text-indigo-600 font-bold">
                                    已有帳號？返回登入
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
