import { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  const { user, logout } = useAuth();
  const { showError } = useAlert();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  // Fetch leave notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getMyLeaves();
        const rawData = res.data;
        
        if (!rawData) return;

        // Safely handle both array and paginated response formats
        const leaveData = Array.isArray(rawData) ? rawData : rawData.results || [];
        
        // Filter ONLY approved leaves
        const approvedLeaves = leaveData.filter(leave => 
          leave && leave.id && (leave.status || '').toLowerCase() === 'approved'
        );
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to midnight
        
        const activeNotifications = approvedLeaves.map;

        approvedLeaves.forEach(leave => {
            const start = new Date(leave.start_date);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(leave.end_date);
            end.setHours(0, 0, 0, 0);
            
            const daysUntilStart = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
            const daysUntilEnd = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

            let alertMessage = '';
            let alertColor = '';
            let alertIcon = '';

            // Scenario 1: Leave is upcoming (Starts in 1 to 7 days)
            if (daysUntilStart > 0 && daysUntilStart <= 7) {
                alertMessage = `Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}`;
                alertColor = 'bg-blue-50 border-blue-500 text-blue-900';
                alertIcon = '📅';
            } 
            // Scenario 2: Currently ON leave
            else if (daysUntilStart <= 0 && daysUntilEnd >= 0) {
                if (daysUntilEnd === 0) {
                    alertMessage = 'Ends today!';
                    alertColor = 'bg-red-50 border-red-500 text-red-900';
                    alertIcon = '⚠️';
                } else if (daysUntilEnd <= 2) {
                    alertMessage = `Ends in ${daysUntilEnd} days!`;
                    alertColor = 'bg-orange-50 border-orange-500 text-orange-900';
                    alertIcon = '⏳';
                } else {
                    alertMessage = 'Currently Active';
                    alertColor = 'bg-green-50 border-green-500 text-green-900';
                    alertIcon = '✅';
                }
            }

            // Only push if it fits our notification criteria
            if (alertMessage) {
                activeNotifications.push({
                    ...leave,
                    leaveTypeLabel: leave.leave_type_name || leave.leave_type || 'Leave',
                    alertMessage,
                    alertColor,
                    alertIcon,
                    sortWeight: daysUntilStart > 0 ? daysUntilStart : daysUntilEnd // Used for sorting
                });
            }

           
            });

        // Sort so the most urgent notifications appear at the top
        activeNotifications.sort((a, b) => a.sortWeight - b.sortWeight);
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
  useLayoutEffect(() => {
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

  const handleNotificationClick = () => {
    setIsNotificationOpen(false);
    const userRole = String(user?.role || '').toUpperCase();

    if (['ADMIN', 'MANAGER', 'HR'].includes(userRole)) {
      navigate(`/admin/applications`);
    } else {  
      navigate(`/my-requests`);
    }
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
        branding="Team Impact Christian University"
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
                    className="relative flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition min-h-[44px]"
                    title="Click to see notifications"
                  >
                    <span className="text-lg">🔔</span>
                    <span className="hidden sm:inline text-sm font-semibold text-blue-700">Notifications</span>

                    {notifications.length > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white shadow-sm">
                        {notifications.length}
                      </span>
                    )}
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
                          <div className="max-h-96 overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                            <span className="text-3xl mb-2 opacity-50">📭</span>
                            <p className="text-sm font-medium">You're all caught up!</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {notifications.map((leave) => (
                              <button 
                                key={leave.id} 
                                onClick={handleNotificationClick}
                                className={`w-full text-left p-3 rounded-lg border-l-4 transition-all hover:opacity-80 hover:shadow-md cursor-pointer ${leave.alertColor}`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-lg flex-shrink-0 mt-0.5">{leave.alertIcon}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm truncate">{leave.leaveTypeLabel}</p>
                                    <p className="text-xs font-semibold mt-0.5">{leave.alertMessage}</p>
                                    <p className="text-[10px] text-slate-500 mt-1 opacity-80 font-medium">
                                      {leave.start_date} to {leave.end_date}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
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
