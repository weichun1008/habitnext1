"use client";

import React from 'react';
import { useT } from '@/lib/i18n';

// Functional fallback so the error UI can use the useT() hook — the boundary
// itself must stay a class component (componentDidCatch has no hook equivalent).
const ErrorFallback = ({ error, errorInfo }) => {
    const { t } = useT();
    return (
        <div className="p-4 bg-red-50 text-red-900 min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold mb-4">{t('errors.boundaryTitle')}</h1>
            <p className="mb-2">{t('errors.boundaryMessage')}</p>
            <pre className="bg-white p-4 rounded shadow text-xs overflow-auto max-w-full">
                {error && error.toString()}
                <br />
                {errorInfo && errorInfo.componentStack}
            </pre>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
                {t('errors.reload')}
            </button>
        </div>
    );
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} />;
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
