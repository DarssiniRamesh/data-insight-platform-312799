import React from "react";

/**
 * Global error boundary for unexpected rendering crashes.
 * Expected API failures should be handled via per-request error UI (banners/panels).
 */
export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <h1 className="page__title">Something went wrong</h1>
          <p className="page__subtitle">
            A UI error occurred. This is a global fallback so the app remains usable.
          </p>
          <pre className="codeBlock" aria-label="Error details">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
