'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter mb-2">OOPS! SOMETHING WENT WRONG</h1>
          <p className="text-gray-600 mb-8 max-w-xs mx-auto">
            We encountered a technical glitch. Try refreshing the page or head back to home.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors mx-auto"
          >
            <RefreshCw size={18} /> Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
