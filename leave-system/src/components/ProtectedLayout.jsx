import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SideBar from './SideBar';
import { NotificationBell } from './NotificationBell';
import ApplyLeaveModal from './ApplyLeaveModal';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { setAlertHandler } from '../services/ApiClient';
import { GiHamburgerMenu } from 'react-icons/gi';
import { FaPlus } from 'react-icons/fa';

/**
 * ProtectedLayout Component
 * Provides a persistent sticky top navbar + toggleable sidebar for all authenticated pages.
 * @param {React.ReactNode} children - The page content to display
 * @param {string} title - Optional page title (rendered within main content area)
 * @param {string} subtitle - Optional page subtitle
 * @param {object|React.ReactNode} action - Optional custom top nav action object { label, onClick } or ReactNode
 */
export default function ProtectedLayout({ children, title, subtitle, action }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { showError } = useAlert();
  const hamburgerRef = useRef(null);

  // Desktop collapsed preference (>= 1024px) persisted in localStorage
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sidebar_desktop_collapsed');
        return saved !== null ? JSON.parse(saved) : false;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  // Mobile off-canvas drawer open state (< 1024px)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Apply Leave Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Persist desktop collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sidebar_desktop_collapsed', JSON.stringify(isDesktopCollapsed));
    } catch (e) {
      console.error('Failed to save sidebar state to localStorage:', e);
    }
  }, [isDesktopCollapsed]);

  // Register alert handler with ApiClient for token expiration alerts
  useEffect(() => {
    setAlertHandler(showError);
  }, [showError]);

  // Listen for Escape key to close mobile drawer and return focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Close mobile drawer automatically when window resizes to desktop breakpoint (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsDesktopCollapsed((prev) => !prev);
    }
  };

  const isNavExpanded = typeof window !== 'undefined' && window.innerWidth >= 1024
    ? !isDesktopCollapsed
    : isMobileOpen;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* ─── Persistent Sticky Top Navbar ─── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">

          {/* Left — Hamburger Button + Institution Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={hamburgerRef}
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0"
              aria-expanded={isNavExpanded}
              aria-controls="main-sidebar"
              aria-label="Toggle navigation menu"
              title="Toggle navigation menu"
            >
              <GiHamburgerMenu className="text-xl" />
            </button>

            <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate">
              Team Impact Christian University
            </span>
          </div>

          {/* Right — Notification Bell FIRST, then Apply Leave Action Button SECOND */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Notification Bell */}
            <NotificationBell />

            {/* Apply Leave Action Button */}
            {action ? (
              typeof action === 'object' && action?.label ? (
                <button
                  onClick={action.onClick}
                  className="px-3 sm:px-4 py-2 bg-slate-900 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all text-xs sm:text-sm min-h-[38px] flex items-center justify-center gap-1.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <FaPlus className="text-xs" aria-hidden="true" />
                  <span className="hidden sm:inline">{action.label}</span>
                </button>
              ) : (
                action
              )
            ) : (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="px-3 sm:px-4 py-2 bg-slate-900 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all text-xs sm:text-sm min-h-[38px] flex items-center justify-center gap-1.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Apply Leave"
                title="Apply for Leave"
              >
                <FaPlus className="text-xs" aria-hidden="true" />
                <span className="hidden sm:inline">Apply Leave</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Below-Nav Layout: Sidebar + Main Content ─── */}
      <div className="flex flex-1 relative min-h-0">

        {/* Sidebar Navigation */}
        <SideBar
          isDesktopCollapsed={isDesktopCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => {
            setIsMobileOpen(false);
            hamburgerRef.current?.focus();
          }}
          onNavigate={(path) => {
            navigate(path);
            if (window.innerWidth < 1024) {
              setIsMobileOpen(false);
            }
          }}
          onLogout={handleLogout}
          currentPath={location.pathname}
        />

        {/* Main Content Area — Flush layout under top nav */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Optional page heading if title or subtitle passed */}
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>}
              {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Global Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSubmitSuccess={() => {
          setIsApplyModalOpen(false);
          // Refresh page or trigger custom reload if needed
          window.location.reload();
        }}
      />
    </div>
  );
}


