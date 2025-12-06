"use client";

import React, { useState, useEffect } from 'react';
import TemplateForm from '../components/TemplateForm';

export default function EditTemplatePage({ params }) {
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplate();
    }, [params.id]);

    const fetchTemplate = async () => {
        try {
            const res = await fetch(`/api/admin/templates/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setTemplate(data);
            } else {
                alert('找不到此模板');
            }
        } catch (error) {
            console.error('Fetch template error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-400">載入中...</div>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-400">找不到資料</div>
            </div>
        );
    }

    return <TemplateForm initialData={template} mode="edit" />;
}
