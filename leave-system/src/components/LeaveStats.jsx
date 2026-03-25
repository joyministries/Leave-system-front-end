import { getMyLeaves } from "../services/ApiClient";
import { useAlert } from "../hooks/alerthook";
import { useEffect, useState } from "react";

// Backend leave type codes to display labels
const LEAVE_TYPE_LABELS = {
  ANN: 'Annual Leave',
  SICK: 'Sick Leave',
  FAMILY: 'Family Responsibility Leave',
  STUDY: 'Study Leave',
  SPECIAL: 'Special Leave',
};

// Create reverse mapping for full names to codes (for API that returns full names)
const LEAVE_NAME_TO_CODE = Object.entries(LEAVE_TYPE_LABELS).reduce((acc, [code, name]) => {
  acc[name] = code;
  acc[name.toUpperCase()] = code;
  return acc;
}, {});

export default function LeaveStats() {
    const [leaveDurations, setLeaveDurations] = useState([]);
    const { showError } = useAlert();

    
    useEffect(() => {
        const fetchLeaveDurations = async () => {
            try {
                const data = await getMyLeaves();
                // Handle both array and paginated response formats
                const leaveData = Array.isArray(data) ? data : data.results || [];
                
                // Filter for approved leaves only
                const approvedLeaves = leaveData.filter(leave => 
                    leave.status === 'approved' || leave.status === 'Approved'
                );
                
                const durations = approvedLeaves.map(leave => {
                    const start = new Date(leave.start_date);
                    const end = new Date(leave.end_date);
                    const today = new Date();
                    
                    // Calculate total duration for this specific leave
                    const totalLeaveDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

                    // Calculate days used for this specific leave
                    let totalUsedDays = 0;
                    if (today >= start) {
                        if (today >= end) {
                           totalUsedDays = totalLeaveDays; // Leave is completed
                        } else {
                            totalUsedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1;
                        }
                    }
                    
                    // Calculate progress percentage
                    const progressPercentage = Math.min((totalUsedDays / totalLeaveDays) * 100, 100);
                    
                    return {
                        ...leave,
                        totalLeaveDays,
                        totalUsedDays,
                        progressPercentage,
                    };
                });
                
                setLeaveDurations(durations);
            } catch (error) {
                console.error("Error fetching leave durations:", error);
                showError("Failed to load leave statistics.");
            }
        };
        
        fetchLeaveDurations();
    }, [showError]);

    if (leaveDurations.length === 0) {
        return <p className="text-center text-gray-500 py-8">No current leaves to display.</p>;
    }

    const getLeaveTypeLabel = (input) => {
        if (!input) return 'Unknown Leave';
        
        // If it's already a code (key in LEAVE_TYPE_LABELS), use it directly
        if (LEAVE_TYPE_LABELS[input]) {
            return LEAVE_TYPE_LABELS[input];
        }
        
        // If it's a full name, convert to code first then get label
        if (LEAVE_NAME_TO_CODE[input]) {
            return LEAVE_TYPE_LABELS[LEAVE_NAME_TO_CODE[input]];
        }
        
        // If still no match, trim and try again (handles case sensitivity)
        const trimmed = String(input).trim().toUpperCase();
        if (LEAVE_NAME_TO_CODE[trimmed]) {
            return LEAVE_TYPE_LABELS[LEAVE_NAME_TO_CODE[trimmed]];
        }
        
        // Last resort: return the input as-is (it might already be formatted)
        return input;
    };

    const getLeaveColor = (input) => {
        if (!input) return 'bg-slate-500';
        
        // If it's a code, use directly
        if (['ANN', 'SICK', 'FAMILY', 'STUDY', 'SPECIAL'].includes(input)) {
            const colors = {
                'ANN': 'bg-blue-500',
                'SICK': 'bg-red-500',
                'FAMILY': 'bg-purple-500',
                'STUDY': 'bg-yellow-500',
                'SPECIAL': 'bg-green-500',
            };
            return colors[input] || 'bg-slate-500';
        }
        
        // If it's a full name, convert to code first
        const code = LEAVE_NAME_TO_CODE[input];
        if (code) {
            const colors = {
                'ANN': 'bg-blue-500',
                'SICK': 'bg-red-500',
                'FAMILY': 'bg-purple-500',
                'STUDY': 'bg-yellow-500',
                'SPECIAL': 'bg-green-500',
            };
            return colors[code] || 'bg-slate-500';
        }
        
        return 'bg-slate-500';
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10">
            {leaveDurations.map((leave) => (
                <div 
                    key={leave.id} 
                    className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                >
                    {/* Leave Type Header */}
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900">
                            {getLeaveTypeLabel(leave.leave_type || leave.type)}
                        </h3>
                        <span className="text-xl font-black text-blue-600">
                            {leave.totalLeaveDays}
                        </span>
                    </div>
                    
                    {/* Days label */}
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                        {leave.totalLeaveDays} days
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-3">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${getLeaveColor(leave.leave_type || leave.type)} rounded-full transition-all duration-300`}
                                style={{ width: `${leave.progressPercentage}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Progress details */}
                    <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>{leave.totalUsedDays} days used</span>
                        <span className="font-semibold">{Math.round(leave.progressPercentage)}%</span>
                    </div>

                    {/* Dates */}
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                        {formatDate(leave.start_date)} — {formatDate(leave.end_date)}
                    </p>
                </div>
            ))}
        </div>
    );
}

const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
};
