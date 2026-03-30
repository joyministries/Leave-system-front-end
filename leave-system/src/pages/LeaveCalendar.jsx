import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { getMyLeaves, listLeaves } from '../services/ApiClient';
import { getUserDisplayName, getUserEmail } from '../utils/userUtils';
import ProtectedLayout from '../components/ProtectedLayout';
import { getUserRole } from '../utils/authorize';

export default function LeaveCalendar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useAlert();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [leaveEvents, setLeaveEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role?.toLowerCase() === 'admin' || getUserRole(user) === 'admin';

// LeaveCalendar.jsx
  useEffect(() => {
    const fetchLeaveEvents = async () => {
      try {
        setIsLoading(true);
        const res = isAdmin ? await listLeaves() : await getMyLeaves();
        const rawData = res.data; 
        if (rawData) {
          // Handle both array and paginated response formats
          const leaveData = Array.isArray(rawData) ? rawData : rawData.results || [];
          
          // Map events including the hydrated leave_type_name
          const events = leaveData
          .filter(leave => (leave.status || "").toLowerCase() !== 'rejected')
          .map(leave => {
            const basetype = leave.leave_type_name || leave.leave_type || leave.type || 'Leave';

            let empName = 'Unknown';
            if (leave.employee) {
              empName = leave.employee_name
            } 
            return {
            date: leave.start_date,
            endDate: leave.end_date,
            type: basetype,
            empName: isAdmin ? empName : null,
            title: leave.reason || '',
            status: leave.status || 'pending',
            }
          });
          
          setLeaveEvents(events);
        } else {
          showError('No leave data found.');
        }
      } catch (error) {
        console.error('Error fetching leave events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaveEvents();
  }, [showError, isAdmin]); // Keep dependencies clean

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const days = [];
  const firstDay = getFirstDayOfMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getLeavesForDate = (day) => {
    if (!day) return [];

    const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    cellDate.setHours(0, 0, 0, 0);
    return leaveEvents.filter(event => {
      if (!event.date || !event.endDate) return false;

      const safeStartDate = event.date.split('T')[0];

      const [sYear, sMonth, sDay] = safeStartDate.split('-').map(Number);
      const start = new Date(sYear, sMonth - 1, sDay);
      start.setHours(0, 0, 0, 0);

      const [eYear, eMonth, eDay] = event.endDate.split('-').map(Number);
      const end = new Date(eYear, eMonth - 1, eDay);
      end.setHours(0, 0, 0, 0);

      return cellDate >= start && cellDate <= end;
    })
  }
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getLeaveColor = (status) => {
    const statusLower = String(status || 'pending').toLowerCase();
    if (statusLower === 'approved') return 'bg-green-100 border-green-400';
    if (statusLower === 'pending') return 'bg-yellow-100 border-yellow-400';
    return 'bg-slate-100 border-slate-400';
  };

  const getLeaveStatusBadgeColor = (status) => {
    const statusLower = String(status || 'pending').toLowerCase();
    if (statusLower === 'approved') return 'bg-green-500';
    if (statusLower === 'pending') return 'bg-yellow-500';
    return 'bg-slate-500';
  };
  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
              <button
                  onClick={() => navigate(user?.role?.toLowerCase() === 'admin' ? '/admin/dashboard' : '/dashboard')}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Dashboard
              </button>
              <h1 className="text-4xl font-black text-slate-900 mb-2">{`${getUserDisplayName(user)}'s Leave Calendar`}</h1>
              <p className="text-slate-600">View your approved and pending leave dates</p>
          </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Loading calendar...</p>
          </div>
        ) : (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-8">
          {/* User Info */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <p className="text-sm text-slate-600">
              Viewing leave calendar for: <span className="font-semibold text-slate-900">{getUserDisplayName(user)}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">{getUserEmail(user)}</p>
          </div>

          {/* Calendar Container */}
          <div className="rounded-lg border border-slate-200 p-6 bg-slate-50">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="px-3 py-2 hover:bg-slate-100 rounded transition"
          >
            ←
          </button>
          <h2 className="text-2xl font-bold text-slate-900">{monthName}</h2>
          <button
            onClick={nextMonth}
            className="px-3 py-2 hover:bg-slate-100 rounded transition"
          >
            →
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-bold text-slate-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const leavesonDay = day ? getLeavesForDate(day) : [];
            const hasLeave = leavesonDay.length > 0;

            const bgColor = hasLeave ? getLeaveColor(leavesonDay[0].status) : 'bg-white border-slate-200';
            
            return (
              <div
                key={index}
                className={`min-h-20 p-2 rounded border text-sm ${
                  !day
                    ? 'bg-slate-50 border-transparent'
                    : bgColor
                }`}
                title={hasLeave && leavesonDay[0] ? `${leavesonDay[0].type} (${leavesonDay[0].status || 'pending'})` : ''}
              >
                {day && (
                  <>
                    <div className="font-bold text-slate-900">{day}</div>
                    {hasLeave && leavesonDay[0] && (
                      <div className={`mt-1 text-xs ${getLeaveStatusBadgeColor(leavesonDay[0].status)} text-white px-1 py-0.5 rounded truncate`}>
                        {leavesonDay[0].type}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">Status Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-slate-600">Approved</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-slate-600">Pending</span>
            </div>
          </div>

          <h3 className="font-bold text-slate-900 mb-3">Your Leave Events</h3>
          <div className="space-y-2">
            {leaveEvents.length > 0 ? (
              leaveEvents.map((event, idx) => {
                const safeStatus = event.status || 'pending';
                return (
                <div key={idx} className="flex items-start gap-3 text-sm p-2 bg-slate-50 rounded">
                  <div className={`w-3 h-3 mt-1 rounded flex-shrink-0 ${getLeaveStatusBadgeColor(safeStatus)}`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      {event.type} - {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
                    </div>
                    <div className="text-xs text-slate-600">
                      {event.empName ? `Employee: ${event.empName}` : `${getUserDisplayName(user)}`}
                    </div>
                    <div className="text-xs text-slate-600">
                      {formatDateRange(event.date, event.endDate)}
                    </div>
                    {event.title && <div className="text-xs text-slate-600 mt-1">{event.title}</div>}
                  </div>
                </div>
              );
              })
            ) : (
              <p className="text-slate-600 text-sm">No leave events scheduled</p>
            )}
          </div>

          {/* End Calendar Container */}
          </div>
        </div>

      </div> )}
      </div>
      </div>
    </ProtectedLayout>
  );
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, options);
};

const formatDateRange = (startDate, endDate) => {
  if (!startDate) return 'N/A';
  if (!endDate || startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};
