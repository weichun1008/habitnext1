"use client";

import React from 'react';
import TemplateForm from '../components/TemplateForm';

import ErrorBoundary from '@/components/ErrorBoundary';

export default function NewTemplatePage() {
    return (
        <ErrorBoundary>
            <TemplateForm mode="create" />
        </ErrorBoundary>
    );
}
