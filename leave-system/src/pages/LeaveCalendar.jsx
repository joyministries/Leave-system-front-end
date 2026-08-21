import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { getMyLeaves, listLeaves, getLeaveTypes } from '../services/ApiClient';
import { getUserDisplayName, getUserEmail } from '../utils/userUtils';
import ProtectedLayout from '../components/ProtectedLayout';
import { getUserRole } from '../utils/authorize';
import { 
  MdChevronLeft, 
  MdChevronRight, 
  MdFilterList, 
  MdToday, 
  MdEventNote,
  MdClose,
  MdOutlineCalendarMonth,
  MdAddCircleOutline
} from 'react-icons/md';

export default function LeaveCalendar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useAlert();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [leaveEvents, setLeaveEvents] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('ALL');
  const [selectedDateDetails, setSelectedDateDetails] = useState(null); // { day, dateStr, events: [] }
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role?.toLowerCase() === 'admin' || getUserRole(user) === 'admin';

  // Fetch leave types and calendar events
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setIsLoading(true);
        const [leavesRes, typesRes] = await Promise.allSettled([
          isAdmin ? listLeaves() : getMyLeaves(),
          getLeaveTypes()
        ]);

        // Process leave types
        if (typesRes.status === 'fulfilled') {
          const rawTypes = typesRes.value?.data?.results || typesRes.value?.data || typesRes.value || [];
          const typeList = Array.isArray(rawTypes) ? rawTypes : [];
          setLeaveTypes(typeList);
        }

        // Process leave events
        if (leavesRes.status === 'fulfilled') {
          const rawData = leavesRes.value?.data;
          const leaveData = Array.isArray(rawData) ? rawData : rawData?.results || [];

          const events = leaveData
            .filter((leave) => (leave.status || '').toLowerCase() !== 'rejected')
            .map((leave) => {
              const baseType = leave.leave_type_name || leave.leave_type || leave.type || 'Leave';
              let empName = 'Unknown';
              if (leave.employee_name) {
                empName = leave.employee_name;
              } else if (leave.employee?.first_name || leave.employee?.last_name) {
                empName = `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.trim();
              }

              return {
                id: leave.id,
                date: leave.start_date,
                endDate: leave.end_date,
                type: baseType,
                typeId: leave.leave_type,
                empName: isAdmin ? empName : null,
                title: leave.reason || '',
                status: leave.status || 'pending',
              };
            });

          setLeaveEvents(events);
        } else {
          showError('Failed to load leave events.');
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, [showError, isAdmin]);

  // Filter events based on selected leave type
  const filteredEvents = useMemo(() => {
    if (selectedLeaveType === 'ALL') {
      return leaveEvents;
    }
    return leaveEvents.filter((event) => {
      const eventTypeLower = (event.type || '').toLowerCase();
      const selectedLower = selectedLeaveType.toLowerCase();
      return (
        String(event.typeId) === String(selectedLeaveType) ||
        eventTypeLower === selectedLower ||
        eventTypeLower.includes(selectedLower)
      );
    });
  }, [leaveEvents, selectedLeaveType]);

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

    return filteredEvents.filter((event) => {
      if (!event.date || !event.endDate) return false;

      const safeStartDate = event.date.split('T')[0];
      const [sYear, sMonth, sDay] = safeStartDate.split('-').map(Number);
      const start = new Date(sYear, sMonth - 1, sDay);
      start.setHours(0, 0, 0, 0);

      const safeEndDate = event.endDate.split('T')[0];
      const [eYear, eMonth, eDay] = safeEndDate.split('-').map(Number);
      const end = new Date(eYear, eMonth - 1, eDay);
      end.setHours(0, 0, 0, 0);

      return cellDate >= start && cellDate <= end;
    });
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleMonthSelect = (e) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentMonth(new Date(currentMonth.getFullYear(), newMonth, 1));
  };

  const handleYearSelect = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1));
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const leavesOnDay = getLeavesForDate(day);
    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;

    setSelectedDateDetails({
      day,
      dateStr,
      isoDate,
      rawDate: dateObj,
      events: leavesOnDay,
    });
  };

  const getLeaveColor = (status) => {
    const statusLower = String(status || 'pending').toLowerCase();
    if (statusLower === 'approved') return 'bg-emerald-50 border-emerald-300 text-emerald-900';
    if (statusLower === 'pending') return 'bg-amber-50 border-amber-300 text-amber-900';
    return 'bg-slate-50 border-slate-300 text-slate-800';
  };

  const getLeaveStatusBadgeColor = (status) => {
    const statusLower = String(status || 'pending').toLowerCase();
    if (statusLower === 'approved') return 'bg-emerald-600';
    if (statusLower === 'pending') return 'bg-amber-500';
    return 'bg-slate-500';
  };

  // Month year range for quick selectors (5 years in past to 5 years in future)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Check if a day is today
  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  // Check if a day is in the past
  const isPastDay = (day) => {
    if (!day) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    cellDate.setHours(0, 0, 0, 0);
    return cellDate < today;
  };

  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isAdmin ? 'Institution Leave Calendar' : `${getUserDisplayName(user)}'s Leave Calendar`}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isAdmin
                ? 'Overview of all employee leave schedules and department availability'
                : 'View your scheduled, approved, and pending leave dates'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/apply-leave')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shrink-0"
          >
            <MdAddCircleOutline className="text-lg" />
            <span>Apply Leave</span>
          </button>
        </div>

        {/* Filters & Navigation Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Leave Type Selector (Allows selecting leave types even before the current set date) */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <MdFilterList className="text-base text-blue-600" />
                <span>Filter Leave Type:</span>
              </label>
              <select
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                className="w-full sm:max-w-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium text-slate-900 outline-none transition-all cursor-pointer"
              >
                <option value="ALL">All Leave Types ({leaveEvents.length})</option>
                {leaveTypes.map((lt) => {
                  const count = leaveEvents.filter(
                    (e) =>
                      String(e.typeId) === String(lt.id) ||
                      (e.type || '').toLowerCase() === (lt.name || '').toLowerCase()
                  ).length;
                  return (
                    <option key={lt.id} value={lt.name}>
                      {lt.name} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })}
              </select>

              {selectedLeaveType !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedLeaveType('ALL')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 self-start sm:self-center"
                >
                  <MdClose className="text-sm" />
                  <span>Clear Filter</span>
                </button>
              )}
            </div>

            {/* Month & Year Selectors + Jump to Today */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
              <select
                value={currentMonth.getMonth()}
                onChange={handleMonthSelect}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={currentMonth.getFullYear()}
                onChange={handleYearSelect}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={goToToday}
                title="Go to Today"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                <MdToday className="text-sm" />
                <span className="hidden sm:inline">Today</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Calendar Card */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-slate-600">Loading leave calendar...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8">
            {/* Month Header Banner */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous Month"
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors"
              >
                <MdChevronLeft className="text-2xl" />
              </button>

              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{monthName}</h2>
                {selectedLeaveType !== 'ALL' && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                    Filtered by: {selectedLeaveType}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next Month"
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors"
              >
                <MdChevronRight className="text-2xl" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-bold text-xs uppercase tracking-wider text-slate-400 py-1.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {days.map((day, index) => {
                const leavesOnDay = day ? getLeavesForDate(day) : [];
                const hasLeave = leavesOnDay.length > 0;
                const isCurrentDay = isToday(day);
                const isPast = isPastDay(day);

                let cellBorder = 'border-slate-200';
                let cellBg = 'bg-white hover:bg-slate-50';

                if (!day) {
                  cellBg = 'bg-slate-50/40 border-transparent';
                } else if (hasLeave) {
                  cellBg = getLeaveColor(leavesOnDay[0].status);
                } else if (isCurrentDay) {
                  cellBg = 'bg-blue-50/50 border-blue-400';
                } else if (isPast) {
                  cellBg = 'bg-slate-50/70 border-slate-200';
                }

                return (
                  <div
                    key={index}
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[75px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border text-xs sm:text-sm transition-all flex flex-col justify-between cursor-pointer ${cellBg} ${cellBorder} ${
                      day ? 'hover:shadow-xs hover:border-slate-400' : 'cursor-default pointer-events-none'
                    }`}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              isCurrentDay
                                ? 'bg-blue-600 text-white'
                                : isPast
                                ? 'text-slate-400'
                                : 'text-slate-800'
                            }`}
                          >
                            {day}
                          </span>
                          {leavesOnDay.length > 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-900 text-white rounded-full">
                              +{leavesOnDay.length}
                            </span>
                          )}
                        </div>

                        {hasLeave && (
                          <div className="mt-1 space-y-1">
                            {leavesOnDay.slice(0, 2).map((l, i) => (
                              <div
                                key={i}
                                className={`text-[10px] sm:text-xs font-medium text-white px-1.5 py-0.5 rounded truncate ${getLeaveStatusBadgeColor(
                                  l.status
                                )}`}
                                title={`${l.type} - ${l.empName || ''} (${l.status})`}
                              >
                                {l.empName ? `${l.empName}: ` : ''}{l.type}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend & Details Breakdown */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-slate-700">Status Legend:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                  <span className="text-slate-600 font-medium">Approved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-slate-600 font-medium">Pending</span>
                </div>
              </div>

              <span className="text-xs text-slate-400">
                💡 Tip: Click on any day to inspect details or scheduled leaves.
              </span>
            </div>
          </div>
        )}

        {/* Selected Date Inspector Modal / Drawer */}
        {selectedDateDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MdOutlineCalendarMonth className="text-xl text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">{selectedDateDetails.dateStr}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDateDetails(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <MdClose className="text-xl" />
                </button>
              </div>

              {selectedDateDetails.events.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-sm">
                  <p>No leaves recorded or scheduled on this date.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {selectedDateDetails.events.map((event, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{event.type}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 text-white rounded-full uppercase ${getLeaveStatusBadgeColor(
                            event.status
                          )}`}
                        >
                          {event.status}
                        </span>
                      </div>
                      {event.empName && (
                        <p className="text-xs text-slate-600 font-medium">Employee: {event.empName}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        Duration: {formatDateRange(event.date, event.endDate)}
                      </p>
                      {event.title && (
                        <p className="text-xs text-slate-600 italic mt-1 bg-white p-2 rounded border border-slate-100">
                          &ldquo;{event.title}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const targetDate = selectedDateDetails.isoDate;
                    setSelectedDateDetails(null);
                    navigate('/apply-leave', {
                      state: {
                        startDate: targetDate,
                        endDate: targetDate,
                      },
                    });
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm"
                >
                  <MdAddCircleOutline className="text-base" />
                  <span>Apply for this Date</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDateDetails(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
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
