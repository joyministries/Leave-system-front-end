export default function ApprovedLeaveCard({ leave }) {
  if (!leave || !leave.start_date || !leave.end_date) { return null; }

  // 1. Safe Date Parsing (Normalize EVERYTHING to midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(leave.start_date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(leave.end_date);
  end.setHours(0, 0, 0, 0);

  // 2. Calculate Total Duration & Elapsed Duration (Skipping Weekends)
  let totalDuration = 0;
  let elapsedDuration = 0;
  
  let currentDurationDate = new Date(start);
  
  while (currentDurationDate <= end) {
    const dayOfWeek = currentDurationDate.getDay();
    
    // If it's a weekday (not Sunday 0, not Saturday 6)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      totalDuration++;
      
      // If this day has already passed or is today, count it as elapsed
      if (currentDurationDate <= today) {
        elapsedDuration++;
      }
    }
    currentDurationDate.setDate(currentDurationDate.getDate() + 1);
  }

  // Calculate Remaining Days
  const remainingLeaveDays = totalDuration - elapsedDuration;

  // 3. State Logic
  const timeDiff = start.getTime() - today.getTime();
  const calendarDaysUntilStart = Math.ceil(timeDiff / (1000 * 3600 * 24));

  const isOngoing = today >= start && today <= end;
  const isPast = today > end;
  const isStartsToday = calendarDaysUntilStart === 0;
  const isUrgent = calendarDaysUntilStart > 0 && calendarDaysUntilStart <= 2;
  const isFuture = calendarDaysUntilStart > 0;

  // 4. Dual-Mode Progress Bar Logic
  let progress = 0;
  
  if (isPast) {
    // Leave is completely done
    progress = 100; 
  } else if (isOngoing) {
    // BURNDOWN MODE: Progress based on elapsed leave days
    progress = Math.min(100, (elapsedDuration / totalDuration) * 100);
  } else if (isFuture) {
    // COUNTDOWN MODE: 7-day run-up before leave starts
    progress = Math.max(0, Math.min(100, ((7 - calendarDaysUntilStart) / 7) * 100));
  }

  // 5. Dynamic Text Helpers
  const getStatusText = () => {
    if (isPast) return 'Completed';
    if (isOngoing) return 'Leave Progress';
    if (isStartsToday) return 'Starts Today';
    return 'Countdown to Start';
  };

  const getPrimaryNumber = () => {
    if (isPast) return '0';
    if (isOngoing) return Math.max(0, remainingLeaveDays).toString();
    return calendarDaysUntilStart.toString();
  };

  const getPrimaryLabel = () => {
    if (isOngoing || isPast) return 'Days Remaining';
    return 'Days Until';
  };

  return (
    <div className={`bg-white p-6 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md ${
      (isOngoing || isStartsToday) ? 'border-green-500 bg-green-50' 
      : isUrgent ? 'border-orange-400' 
      : 'border-slate-200'
    }`}>
      {/* Header: Name and Days Left */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {leave.leave_type_name || leave.leave_type || 'Leave Request'}
          </h3>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {totalDuration} {totalDuration === 1 ? 'Day' : 'Days'} Total
          </p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-black ${
            (isOngoing || isStartsToday) ? 'text-green-600' : 'text-blue-600'
          }`}>
            {getPrimaryNumber()}
          </span>
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            {getPrimaryLabel()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
          <span>{getStatusText()}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
          <div 
            className={`h-full transition-all duration-700 ease-out ${
              (isOngoing || isStartsToday) ? 'bg-green-500' 
              : isUrgent ? 'bg-orange-500' 
              : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Footer: Date Range */}
      <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Schedule</span>
          <span className="text-xs font-semibold text-slate-700">
            {formatDisplayDate(leave.start_date)} - {formatDisplayDate(leave.end_date)}
          </span>
        </div>
        {(isOngoing || isStartsToday) && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-green-600 uppercase">Active</span>
            <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
          </div>
        )}
      </div>
    </div>
  );
}

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};