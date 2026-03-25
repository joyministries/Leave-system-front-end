import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SideBar from './SideBar';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { setAlertHandler } from '../services/ApiClient';
import { GiHamburgerMenu } from 'react-icons/gi';

/**
 * ProtectedLayout Component
 * Provides consistent sidebar + content layout for all authenticated user pages
 * @param {React.ReactNode} children - The page content to display
 * @param {string} title - Page title/greeting
 * @param {string} subtitle - Optional page subtitle
 * @param {React.ReactNode} action - Optional action button/element (top right)
 */
export default function ProtectedLayout({ children, title, subtitle, action }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { showError } = useAlert();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Register alert handler with ApiClient for token expiration alerts
  useEffect(() => {
    setAlertHandler(showError);
  }, [showError]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Component */}
      <SideBar 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
        currentPath={location.pathname}
        branding="LeaveSystem"
      />

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-4 md:p-8 w-full">
        {/* Header */}
        {title && (
          <header className="flex justify-between items-start md:items-center mb-6 sm:mb-8 gap-3 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Hamburger Menu Button - Mobile Only */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-2xl text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition flex-shrink-0 mt-1"
                title="Toggle menu"
              >
                <GiHamburgerMenu />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
                {subtitle && <p className="text-slate-500 mt-1 text-xs sm:text-sm truncate">{subtitle}</p>}
              </div>
            </div>
            {action && (
              <div className="flex-shrink-0 w-full sm:w-auto">
                {typeof action === 'object' && action?.label ? (
                  <button
                    onClick={action.onClick}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2.5 bg-slate-900 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm sm:text-base min-h-[44px] flex items-center justify-center"
                  >
                    {action.label}
                  </button>
                ) : (
                  action
                )}
              </div>
            )}
          </header>
        )}

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
}
