import React from 'react';
import { MdErrorOutline, MdRefresh, MdExitToApp } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';

// ------------------------------------------------------------------
// 1. THE FUNCTIONAL UI COMPONENT (Where we can safely use Hooks!)
// ------------------------------------------------------------------
const ErrorFallbackUI = ({ error, errorInfo, resetBoundary }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    resetBoundary()

    //logout
    logout()
    navigate('/login');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-red-100 overflow-hidden text-center">
        
        <div className="bg-red-50 p-8 flex flex-col items-center border-b border-red-100">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <MdErrorOutline className="text-5xl text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">System Error</h1>
          <p className="text-slate-600 font-medium">
            Something went wrong while loading this view.
          </p>
        </div>

        {/* Development Stack Trace */}
        {import.meta.env?.DEV && error && (
          <div className="p-6 bg-slate-900 text-left overflow-x-auto">
            <p className="text-red-400 font-mono text-sm font-bold mb-2">
              {error.toString()}
            </p>
            <p className="text-slate-400 font-mono text-xs whitespace-pre-wrap leading-relaxed">
              {errorInfo?.componentStack}
            </p>
          </div>
        )}

        <div className="p-8 flex flex-col sm:flex-row gap-3 justify-center bg-white">
          <button
            onClick={handleReload}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-colors"
          >
            <MdRefresh className="text-xl" />
            Reload Page
          </button>
          
          {/* Using our new smart navigation handler */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors"
          >
            <MdExitToApp className="text-xl" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// 2. THE CLASS COMPONENT (Catches the errors)
// ------------------------------------------------------------------
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("System Error Caught by Boundary:", error);
    this.setState({ error, errorInfo });
  }

  // We pass this down so the button can clear the error state
  resetBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Render our functional component and pass down the data/reset function
      return (
        <ErrorFallbackUI 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          resetBoundary={this.resetBoundary}
        />
      );
    }

    return this.props.children;
  }
}