import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { getMyLeaves } from '../services/ApiClient';
import { getUserDisplayName, getUserEmail } from '../utils/userUtils';
import ProtectedLayout from '../components/ProtectedLayout';

export default function LeaveCalendar() {
  const location = useLocation();
  const { user } = useAuth();
  const { showError } = useAlert();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [leaveEvents, setLeaveEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaveEvents = async () => {
      try {
        setIsLoading(true);
        const data = await getMyLeaves();

        if (data) {
        // Handle both array and paginated response formats
        const leaveData = Array.isArray(data) ? data : data.results || [];
        
        // Create events for all leaves (not just approved, so user can see pending too)
        const events = leaveData.map(leave => ({
          date: leave.start_date,
          endDate: leave.end_date,
          type: leave.leave_type || leave.type,
          title: leave.reason || '',
          status: leave.status || 'pending',
        }));
        
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
  }, [showError]);

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

  const hasLeaveOnDate = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaveEvents.some(e => e.date.startsWith(dateStr));
  };

  const getLeaveOnDate = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaveEvents.find(e => e.date.startsWith(dateStr));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getLeaveColor = (status) => {
    const statusLower = String(status || 'pending').toLowerCase();
    if (statusLower === 'approved') return 'bg-green-100 border-green-400';
    if (statusLower === 'rejected') return 'bg-red-100 border-red-400';
    if (statusLower === 'pending') return 'bg-yellow-100 border-yellow-400';
    return 'bg-slate-100 border-slate-400';
  };

  const getLeaveStatusBadgeColor = (status) => {
    const statusLower = String(status || 'pending').toLowerCase();
    if (statusLower === 'approved') return 'bg-green-500';
    if (statusLower === 'rejected') return 'bg-red-500';
    if (statusLower === 'pending') return 'bg-yellow-500';
    return 'bg-slate-500';
  };

  return (
    <ProtectedLayout
      title={`${getUserDisplayName()}'s Leave Calendar`}
      subtitle="View your approved and pending leave dates"
      currentPath={location.pathname}
    >
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Loading calendar...</p>
          </div>
        ) : (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-8">
          {/* User Info */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <p className="text-sm text-slate-600">
              Viewing leave calendar for: <span className="font-semibold text-slate-900">{getUserDisplayName()}</span>
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
            const hasLeave = day && hasLeaveOnDate(day);
            const leaveData = day && getLeaveOnDate(day);
            const bgColor = hasLeave && leaveData ? getLeaveColor(leaveData.status) : 'bg-white border-slate-200';
            
            return (
              <div
                key={index}
                className={`min-h-20 p-2 rounded border text-sm ${
                  !day
                    ? 'bg-slate-50 border-transparent'
                    : bgColor
                }`}
                title={hasLeave && leaveData ? `${leaveData.type} (${leaveData.status || 'pending'})` : ''}
              >
                {day && (
                  <>
                    <div className="font-bold text-slate-900">{day}</div>
                    {hasLeave && leaveData && (
                      <div className={`mt-1 text-xs ${getLeaveStatusBadgeColor(leaveData.status)} text-white px-1 py-0.5 rounded truncate`}>
                        {leaveData.type}
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
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-slate-600">Rejected</span>
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
