import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SideBar from './SideBar';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { setAlertHandler, getMyLeaves } from '../services/ApiClient';
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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  // Fetch leave notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getMyLeaves();
        const leaveData = data.data.results
        
        // Filter approved leaves and calculate remaining days
        const approvedLeaves = leaveData.filter(leave => 
          leave.status === 'approved' || leave.status === 'Approved'
        );
        
        const activeNotifications = approvedLeaves
          .map(leave => {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const today = new Date();
            
            const totalLeaveDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            let totalUsedDays = 0;
            
            if (today >= start) {
              if (today >= end) {
                totalUsedDays = totalLeaveDays;
              } else {
                totalUsedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1;
              }
            }
            
            const remainingDays = Math.max(totalLeaveDays - totalUsedDays, 0);
            
            return {
              ...leave,
              remainingDays,
              leaveType: leave.leave_type || leave.type
            };
          })
          .filter(leave => leave.remainingDays >= 0 && leave.remainingDays <= 3)
          .sort((a, b) => a.remainingDays - b.remainingDays);
        
        setNotifications(activeNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    
    fetchNotifications();
  }, []);

  // Register alert handler with ApiClient for token expiration alerts
  useEffect(() => {
    setAlertHandler(showError);
  }, [showError]);

  // Close notification dropdown when route changes
  useEffect(() => {
    setIsNotificationOpen(false);
  }, [location.pathname]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isNotificationOpen]);

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
              <div className="flex-shrink-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3 items-center relative">
                {/* Notification Bell Button */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition min-h-[44px]"
                    title="Click to see notifications"
                  >
                    <span className="text-lg">🔔</span>
                    <span className="hidden sm:inline text-sm font-semibold text-blue-700">Notifications</span>
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-300 rounded-lg shadow-xl z-50">
                      <div className="p-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-900 text-sm">Leave Notifications</h3>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-500">
                            <p className="text-sm">No notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-200">
                            {notifications.map((leave) => {
                              const leaveTypeLabel = {
                                'ANN': 'Annual Leave',
                                'SICK': 'Sick Leave',
                                'FAMILY': 'Family Responsibility Leave',
                                'STUDY': 'Study Leave',
                                'SPECIAL': 'Special Leave',
                              }[leave.leaveType] || leave.leaveType;

                              let alertColor = 'bg-blue-50 border-l-4 border-blue-500';
                              let alertIcon = '📅';
                              let alertMessage = '';

                              if (leave.remainingDays === 0) {
                                alertColor = 'bg-red-50 border-l-4 border-red-500';
                                alertIcon = '🚨';
                                alertMessage = 'Last day!';
                              } else if (leave.remainingDays === 1) {
                                alertColor = 'bg-red-50 border-l-4 border-red-500';
                                alertIcon = '🚨';
                                alertMessage = '1 day left!';
                              } else if (leave.remainingDays === 2) {
                                alertColor = 'bg-orange-50 border-l-4 border-orange-500';
                                alertIcon = '⚡';
                                alertMessage = '2 days left!';
                              } else if (leave.remainingDays === 3) {
                                alertColor = 'bg-blue-50 border-l-4 border-blue-500';
                                alertIcon = '📅';
                                alertMessage = '3 days left!';
                              }

                              return (
                                <div key={leave.id} className={`p-3 ${alertColor}`}>
                                  <div className="flex items-start gap-2">
                                    <span className="text-lg flex-shrink-0">{alertIcon}</span>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-slate-900 text-sm truncate">{leaveTypeLabel}</p>
                                      <p className="text-xs text-slate-600 mt-1">{alertMessage}</p>
                                      <p className="text-xs text-slate-500 mt-1">{leave.start_date} to {leave.end_date}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
