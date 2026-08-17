import { useEffect, useRef } from 'react';
import { MdExitToApp, MdClose } from 'react-icons/md';
import { useAuth } from '../hooks/authhook';
import { getAuthorizedMenuItems } from '../utils/sidebarConfig';

/**
 * SideBar Component
 * Renders an accessible navigation sidebar.
 * - Desktop (>=1024px): sticky rail that toggles between full width (256px) and icon-only rail (64px).
 * - Mobile (<1024px): off-canvas drawer overlay with focus trap and backdrop.
 */
export default function SideBar({
  isDesktopCollapsed,
  isMobileOpen,
  onCloseMobile,
  onNavigate,
  onLogout,
  currentPath = '/dashboard',
}) {
  const { user } = useAuth();
  const menuItems = getAuthorizedMenuItems(user);
  const mobileDrawerRef = useRef(null);

  // Focus trap for mobile drawer when active
  useEffect(() => {
    if (!isMobileOpen || !mobileDrawerRef.current) return;

    const drawer = mobileDrawerRef.current;
    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Auto-focus first element in mobile drawer
    firstElement.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    drawer.addEventListener('keydown', handleTabKey);
    return () => drawer.removeEventListener('keydown', handleTabKey);
  }, [isMobileOpen]);

  const isActive = (path) => currentPath === path;

  return (
    <>
      {/* ─── DESKTOP SIDEBAR (≥1024px) ─── */}
      <aside
        className={`hidden lg:flex flex-col border-r border-slate-200 bg-white sticky top-0 h-screen flex-shrink-0 z-30 font-sans transition-all duration-200 ease-out motion-reduce:transition-none ${
          isDesktopCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Desktop Logo Header */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-center h-16 flex-shrink-0">
          <img
            src="/favicon.png"
            alt="Team Impact Christian University Logo"
            className={`object-contain transition-all duration-200 motion-reduce:transition-none ${
              isDesktopCollapsed ? 'h-8 w-8' : 'h-10 w-auto'
            }`}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

        {/* Desktop Navigation List */}
        <nav id="main-sidebar" aria-label="Main navigation" className="flex-1 p-2 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.navIcon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                title={item.label}
                aria-label={item.label}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-slate-900 text-white font-bold shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${isDesktopCollapsed ? 'justify-center' : ''}`}
              >
                <span className="text-xl flex-shrink-0" aria-hidden="true">
                  {Icon ? <Icon /> : <div className="w-5 h-5" />}
                </span>
                <span className={`truncate text-sm sm:text-base ${isDesktopCollapsed ? 'sr-only' : 'block'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Logout Button */}
        <div className="p-2 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
            className={`w-full flex items-center gap-3 px-3 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-xl transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isDesktopCollapsed ? 'justify-center' : ''
            }`}
          >
            <MdExitToApp className="text-xl text-slate-500 flex-shrink-0" aria-hidden="true" />
            <span className={isDesktopCollapsed ? 'sr-only' : 'block'}>Logout</span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE BACKDROP & DRAWER (<1024px) ─── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200 motion-reduce:transition-none"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-sidebar"
        ref={mobileDrawerRef}
        aria-label="Mobile navigation"
        className={`fixed top-0 left-0 h-full w-64 bg-white z-50 lg:hidden border-r border-slate-200 flex flex-col font-sans transform transition-transform duration-200 ease-out motion-reduce:transition-none shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header with Logo & Close Button */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center h-16 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="/favicon.png"
              alt="Team Impact Christian University"
              className="h-9 w-auto object-contain"
            />
            <span className="font-black text-slate-900 text-sm tracking-tight">
              Team Impact
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close navigation menu"
            title="Close navigation"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Mobile Navigation List */}
        <nav aria-label="Mobile navigation menu" className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.navIcon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                title={item.label}
                aria-label={item.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-slate-900 text-white font-bold shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="text-xl flex-shrink-0" aria-hidden="true">
                  {Icon ? <Icon /> : <div className="w-5 h-5" />}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile Logout Button */}
        <div className="p-3 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-xl transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <MdExitToApp className="text-xl text-slate-500 flex-shrink-0" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}