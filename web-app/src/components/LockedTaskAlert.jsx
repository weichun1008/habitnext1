"use client";

import React from 'react';
import { Lock, User, MessageCircle } from 'lucide-react';

const LockedTaskAlert = ({ expertName, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-fade-in-up">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-xl font-bold">專屬健康計畫</h3>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-gray-800 font-medium">
                                此任務由 <span className="text-emerald-600 font-bold">{expertName || '您的健康顧問'}</span> 專為您設計
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <p className="text-gray-600 text-sm leading-relaxed">
                            為確保健康計畫的完整性與效果，此任務的內容暫時無法修改。
                            這是根據您的健康目標量身打造的習慣，請持續執行以達到最佳效果！
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                        <MessageCircle size={14} />
                        <span>如有疑問，請聯繫您的專屬顧問</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        我知道了，繼續執行 💪
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LockedTaskAlert;
