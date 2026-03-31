export default function ApprovedLeaveCard({ leave }) {
  if (!leave || !leave.start_date || !leave.end_date) { return null; }

  // 1. Safe Date Parsing (Normalize EVERYTHING to midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(leave.start_date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(leave.end_date);
  end.setHours(0, 0, 0, 0);

  // 2. Calculate Actual Working Days Duration (Skipping Weekends)
  let duration = 0;
  let currentDurationDate = new Date(start);
  while (currentDurationDate <= end) {
    const dayOfWeek = currentDurationDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      duration++;
    }
    currentDurationDate.setDate(currentDurationDate.getDate() + 1);
  }

  // 3. Countdown & Status Logic
  // Using .getTime() ensures reliable math after midnight normalization
  const timeDiff = start.getTime() - today.getTime();
  const daysUntilStart = Math.ceil(timeDiff / (1000 * 3600 * 24));

  const isOngoing = today >= start && today <= end;
  const isPast = today > end; // In case an old leave slips through
  const isStartsToday = daysUntilStart === 0;
  const isUrgent = daysUntilStart > 0 && daysUntilStart <= 2;

  // 4. Progress Bar Logic
  let progress = 0;
  if (isOngoing || isPast) {
    progress = 100;
  } else {
    // Clamp between 0 and 100
    progress = Math.max(0, Math.min(100, ((7 - daysUntilStart) / 7) * 100));
  }

  // Dynamic Text Helpers
  const getStatusText = () => {
    if (isPast) return 'Completed';
    if (isOngoing) return 'Currently on Leave';
    if (isStartsToday) return 'Starts Today';
    return 'Countdown';
  };

  const getDaysLeftText = () => {
    if (isPast || isOngoing) return '0';
    return daysUntilStart;
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
            {duration} {duration === 1 ? 'Day' : 'Days'} Duration
          </p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-black ${
            (isOngoing || isStartsToday) ? 'text-green-600' : 'text-blue-600'
          }`}>
            {getDaysLeftText()}
          </span>
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            {isOngoing ? 'Days Left' : 'Days Until'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
          <span>{getStatusText()}</span>
          <span>{isOngoing || isStartsToday ? '100%' : `${Math.round(progress)}%`}</span>
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
          <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
        )}
      </div>
    </div>
  );
}

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  // Use UTC to prevent the local timezone from shifting the display date back by a day
  const date = new Date(dateStr);
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};