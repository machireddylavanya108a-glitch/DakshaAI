import { Component } from 'react';

export default class ThreeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryNonce: 0,
      fallbackMode: ''
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, info) {
    console.error('[3D] Visualization error boundary caught an error:', error, info);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryNonce: prev.retryNonce + 1,
      fallbackMode: ''
    }));
  };

  handleSwitch = (mode) => {
    this.setState({ fallbackMode: mode });
    this.props.onFallbackMode?.(mode);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
          <p className="text-base font-semibold">3D visualization could not be loaded.</p>
          <p className="mt-2 text-rose-200">You can retry, switch to a 2D diagram, or continue the lesson without 3D.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={this.handleRetry} className="rounded-xl border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-xs text-white">Retry visualization</button>
            <button type="button" onClick={() => this.handleSwitch('interactive-2d')} className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">Switch to 2D diagram</button>
            <button type="button" onClick={() => this.handleSwitch('text-lesson')} className="rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs text-slate-200">Continue lesson without 3D</button>
          </div>
        </div>
      );
    }

    return <div key={this.state.retryNonce}>{this.props.children}</div>;
  }
}
