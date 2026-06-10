"use client";

import React from 'react';
import { Lock, User, MessageCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';

const LockedTaskAlert = ({ expertName, onClose }) => {
    const { t } = useT();
    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-fade-in-up">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-xl font-bold">{t('manage.lockedTitle')}</h3>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-gray-800 font-medium">
                                {t('manage.lockedByPrefix')}<span className="text-emerald-600 font-bold">{expertName || t('manage.advisorFallback')}</span>{t('manage.lockedBySuffix')}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {t('manage.lockedBody')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                        <MessageCircle size={14} />
                        <span>{t('manage.lockedContact')}</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        {t('manage.lockedConfirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LockedTaskAlert;
