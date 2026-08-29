import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 rounded-2xl bg-surface-50 border border-rose-500/30 text-slate-200 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-bold text-white">
              {this.props.fallbackTitle || 'Component Encountered an Unexpected Error'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {this.state.error?.message || 'A render exception occurred in this view.'}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-glow-primary"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Rendering</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
