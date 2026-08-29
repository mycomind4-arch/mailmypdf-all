import { Component, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════
   ERROR BOUNDARY — graceful failure for the entire app.
   Never let one failed dependency destroy user's work.
   ═══════════════════════════════════════════════════════════ */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log safely — no sensitive content in error messages
    console.error("ErrorBoundary caught:", error.message);
    // Do NOT log errorInfo.componentStack to external services
    // as it may contain sensitive paths
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">📭</div>
            <h1 className="font-serif text-2xl mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              An unexpected error occurred. Your work has been preserved.
            </p>
            <p className="text-xs text-muted-foreground/60 mb-6">
              {this.state.error?.message || "Unknown error"}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
              >
                Try Again
              </button>
              <a
                href="/"
                className="rounded-full border border-rule px-6 py-2 text-sm font-medium hover:bg-muted"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
