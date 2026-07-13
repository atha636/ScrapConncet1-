import { Component } from "react";

/**
 * Error boundaries must be class components — there's no hook equivalent in
 * React as of this writing. Wraps the whole app in main.jsx so a crash
 * anywhere in the component tree shows a recoverable fallback instead of a
 * blank white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // In a real deployment this is where you'd forward to an error-tracking
    // service (Sentry, etc.) — logged here since none is wired up yet.
    console.error("Uncaught render error:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-bg">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-dashed border-danger/50 flex items-center justify-center text-danger rotate-[-4deg]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink mb-3">Something went wrong</h1>
          <p className="text-sm text-inkSoft leading-relaxed mb-8">
            This page hit an unexpected error. Reloading usually fixes it — if it keeps
            happening, let us know what you were doing when it broke.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Reload page
            </button>
            {/* Plain anchor, not a router Link — if the crash happened
                inside routing itself, Link's context may not be reliable. */}
            <a href="/" className="btn-secondary">
              Go to homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
}