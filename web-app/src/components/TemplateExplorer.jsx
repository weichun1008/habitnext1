import React, { useState, useEffect } from 'react';
import { X, Search, User, Check, Loader } from 'lucide-react';

const TemplateExplorer = ({ isOpen, onClose, userId, onJoin }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            console.log('[Client] Fetching templates with timestamp:', timestamp);
            const res = await fetch(`/api/templates/public?t=${timestamp}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                console.log('[Client] Received templates:', data);
                setTemplates(data);
            } else {
                console.error('[Client] Fetch failed:', res.status);
            }
        } catch (error) {
            console.error('Fetch templates error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (template) => {
        setJoiningId(template.id);
        try {
            const res = await fetch('/api/user/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    templateId: template.id
                })
            });

            if (res.ok) {
                onJoin(); // Refresh tasks
                onClose();
            } else {
                alert('加入失敗，請稍後再試');
            }
        } catch (error) {
            console.error('Join template error:', error);
            alert('發生錯誤');
        } finally {
            setJoiningId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">探索習慣計畫</h2>
                        <p className="text-sm text-gray-500">加入專家設計的習慣模板，開始你的健康旅程</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader className="animate-spin text-emerald-500" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            目前沒有公開的習慣計畫
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {templates.map(template => (
                                <div key={template.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg mb-1">{template.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                                    {template.expert?.title || '專家'}
                                                </span>
                                                <span>by {template.expert?.name}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleJoin(template)}
                                            disabled={joiningId === template.id}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {joiningId === template.id ? (
                                                <>加入中...</>
                                            ) : (
                                                <>加入計畫</>
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                        {template.description || '這個計畫可以幫助你建立良好的生活習慣。'}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
                                        <div className="flex items-center gap-1">
                                            <User size={14} />
                                            <span>{template._count?.assignments || 0} 人已加入</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Check size={14} />
                                            <span>{template._count?.tasks || 0} 個任務</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplateExplorer;
