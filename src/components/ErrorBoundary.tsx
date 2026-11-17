import React from 'react';
import { ASSETS } from '../data/demoSeed';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090909] text-white flex items-center justify-center px-6">
          <div className="max-w-lg w-full bg-[#121212] border border-[#C9A45C]/30 p-8 text-center">
            <img
              src={ASSETS.logo}
              alt="ZEXUNA Logo"
              className="w-16 h-16 mx-auto mb-6 object-contain"
            />
            <h1 className="font-display text-2xl text-[#E6CC91] mb-3">
              Something needs attention
            </h1>
            <p className="text-sm text-[#B8B8B8] mb-6 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#C9A45C] text-[#090909] text-sm font-semibold tracking-wide hover:bg-[#E6CC91] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
