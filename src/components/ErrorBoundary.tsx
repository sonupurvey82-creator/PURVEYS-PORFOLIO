import React from 'react';

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

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#06110A] px-6 text-center text-[#FAF6F0]">
          <div className="max-w-md rounded-2xl border border-[#F97316]/30 bg-[#140F0C] p-6 shadow-2xl">
            <h1 className="font-display text-xl font-semibold text-[#FAF6F0]">
              Something went wrong
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#B6A99A]">
              Unable to load portfolio data right now. Please refresh and try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#EA580C] px-5 text-xs font-semibold text-[#FFF7ED] transition-colors hover:bg-[#F97316] cursor-pointer"
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
