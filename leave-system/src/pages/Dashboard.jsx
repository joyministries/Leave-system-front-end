import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { useEffect, useState } from 'react';
import { getMyLeaves, getMyLeaveSummary, getLeaveTypes } from '../services/ApiClient';
import { getUserDisplayName } from '../utils/userUtils';
import ProtectedLayout from '../components/ProtectedLayout';
import ApplyLeaveModal from '../components/ApplyLeaveModal';
import ApprovedLeaveCard from '../components/LeaveStats';
import { LeaveSummaryCard } from '../components/LeaveSummaryCard';

export default function Dashboard() {
    const location = useLocation();
    const { user } = useAuth();
    const { showError, showSuccess } = useAlert();
    const [ongoingLeaves, setOngoingLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [myLeaveSummary, setMyLeaveSummary] = useState(null);
    const [loading, setLoading] = useState(false);

    // Get greeting based on time
    const getGreeting = () => {
        const now = new Date();
        const hour = now.getHours();

        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };
    const handleApplyLeaveClick = () => {
        setIsModalOpen(true);
    };
    const greetingText = `${getGreeting()}, ${getUserDisplayName(user)}!`;
    const subtitleText = 'Track your leave status and apply for new leaves';

    // Calculate leave summary from leave types and approved leaves
    const calculateLeaveSummary = (leaveTypes, approvedLeaves) => {
        try {
            const summaryMap = {};
            
            // Get today's date and normalize to midnight for real-time burndown
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Initialize each leave type with maximum allocated days
            if (Array.isArray(leaveTypes)) {
                leaveTypes.forEach(type => {
                    const maxDays = type.max_days || 0;
                    summaryMap[type.id] = {
                        leave_type_name: type.name || type.leave_type_name || 'Leave',
                        max_days: maxDays,  // Maximum allocated days for this leave type
                        used_days: 0,
                        remaining_days: 0,
                        is_active: true,
                        status: 'active'
                    };
                });
            }

            // Count used days from approved leaves (Real-time burndown logic)
            if (Array.isArray(approvedLeaves)) {
                approvedLeaves.forEach(leave => {
                    if (leave.leave_type && summaryMap[leave.leave_type]) {
                        const start = new Date(leave.start_date);
                        const end = new Date(leave.end_date);
                        
                        // Normalize leave dates to midnight
                        start.setHours(0, 0, 0, 0);
                        end.setHours(0, 0, 0, 0);

                        let current = new Date(start);
                        let duration = 0;
                        
                        // Loop continues ONLY IF we haven't passed the leave's end date 
                        // AND we haven't passed today's date
                        while (current <= end && current <= today) {
                            const dayOfWeek = current.getDay();
                            
                            // 0 is Sunday, 6 is Saturday. Only count weekdays.
                            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                                duration++;
                            }
                            
                            // Move forward by 1 day
                            current.setDate(current.getDate() + 1);
                        }
                        
                        summaryMap[leave.leave_type].used_days += duration;
                    }
                });
            }

            // Calculate remaining days = Total - Used
            Object.keys(summaryMap).forEach(key => {
                const item = summaryMap[key];
                item.remaining_days = Math.max(0, item.max_days - item.used_days);
            });

            console.log('Calculated summary with max days:', Object.values(summaryMap));
            return Object.values(summaryMap);
        } catch (error) {
            console.error('Error calculating leave summary:', error);
            return [];
        }
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);

            try{
                const [leaveRes, typesRes] = await Promise.all([
                    getMyLeaves(),
                    getLeaveTypes()
                ]);
                const leaveData = Array.isArray(leaveRes.data.results) ? leaveRes.data.results : leaveRes.data.results || [];
                const typesData = Array.isArray(typesRes) ? typesRes : typesRes.data || [];
                
                const approvedLeaves = leaveData.filter(leave => leave.status?.toLowerCase() === 'approved');
                const pendingLeaveList = leaveData.filter(leave => leave.status?.toLowerCase() === 'pending');
                
                setOngoingLeaves(approvedLeaves);
                setPendingLeaves(pendingLeaveList);
                
                // Calculate summary from leave types and approved leaves
                const calculatedSummary = calculateLeaveSummary(typesData, approvedLeaves);
                setMyLeaveSummary(calculatedSummary);
                
                console.log('Calculated Leave Summary:', calculatedSummary);
                showSuccess('Welcome to your dashboard!');
            } catch (error) {
                showError('Failed to load dashboard data');
                console.error("Failed to fetch data: ", error)
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, [showError, showSuccess]);

    return (
        <ProtectedLayout
            title="Team Impact Christian University"
            subtitle={subtitleText}
            action={{ label: 'Apply Leave', onClick: handleApplyLeaveClick }}
            currentPath={location.pathname}
        >
            {/* Welcome Banner */}
            <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-lg mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{greetingText}</h1>
                <p className="text-blue-100 mt-2 text-sm sm:text-base">{subtitleText}</p>
            </div>

            {loading ? (
                <div className="text-center py-10">
                    <p className="text-slate-500">Loading your dashboard...</p>
                </div>
            ) : (
                <>
                    {/* Show Summary of employee's leave balance */}
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4">Leave Summary</h2>
                        <LeaveSummaryCard summary={myLeaveSummary} />
                    </div>

                    {/* Leave Stats Grid */}
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4">Your Current Leaves</h2>
                        {ongoingLeaves && ongoingLeaves.length > 0 ? (
                            <ApprovedLeaveCard leave={ongoingLeaves[0]} /> // Display the first approved leave
                        ) : (
                            <p className="text-slate-500">You have no current leaves.</p>
                        )}
                    </div>

                    {/* Leave Requests Table */}
                    <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 border-b border-slate-200">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Requests</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Start Date</th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">End Date</th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingLeaves && pendingLeaves.length > 0 ? (
                                        pendingLeaves.slice(0, 5).map((request) => {
                                            // Add safety check for request object
                                            if (!request || !request.id) return null;
                                            return (
                                                <tr key={request.id} className="border-t border-slate-200 hover:bg-slate-50">
                                                    <td className="px-4 md:px-6 py-4 text-sm font-medium text-slate-900">
                                                        {formatLeaveType(request.leave_type || request.type)}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-sm text-slate-600">
                                                        {request.start_date ? formatDate(request.start_date) : 'N/A'}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-sm text-slate-600">
                                                        {request.end_date ? formatDate(request.end_date) : 'N/A'}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-sm">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status || 'pending')}`}>
                                                            {request.status || 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                                                        {request.admin_remarks || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 md:px-6 py-8 text-center text-slate-500">
                                                No leave requests found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Apply Leave Modal */}
            <ApplyLeaveModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmitSuccess={() => {
                    setIsModalOpen(false);
                    showSuccess('Leave request submitted successfully!');
                    // Refresh leave requests and recalculate summary
                    const fetchLeaveRequests = async () => {
                        try {
                            const [leaveRes, typesRes] = await Promise.all([
                                getMyLeaves(),
                                getLeaveTypes()
                            ]);
                            const data = leaveRes.data.results || leaveRes.data || [];
                            const leaveData = Array.isArray(data) ? data : [];
                            const typesData = Array.isArray(typesRes) ? typesRes : typesRes.data || [];

                            // Filter out any undefined/null entries
                            const validLeaves = leaveData.filter(leave => leave && leave.id);

                            const formattedLeaveData = validLeaves.map(leave => ({
                                ...leave,
                                leave_type: formatLeaveType(leave.leave_type || leave.type)
                            }));
                            const approvedLeaves = formattedLeaveData.filter(leave => leave.status?.toLowerCase() === 'approved');
                            const pendingLeaveList = formattedLeaveData.filter(leave => leave.status?.toLowerCase() === 'pending');
                            
                            setOngoingLeaves(approvedLeaves);
                            setPendingLeaves(pendingLeaveList);
                            
                            // Recalculate summary with updated leave data
                            const updatedSummary = calculateLeaveSummary(typesData, approvedLeaves);
                            setMyLeaveSummary(updatedSummary);
                        } catch (error) {
                            console.error('Error fetching leave requests:', error);
                            showError('Failed to refresh leave requests.');
                        }
                    };
                    fetchLeaveRequests();
                }}
            />
        </ProtectedLayout>
    );
}


const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
};

const getStatusColor = (status) => {
    if (!status) return 'bg-slate-100 text-slate-800';
    const statusLower = String(status).toLowerCase().trim();
    if (statusLower === 'approved') {
        return 'bg-green-100 text-green-800';
    } else if (statusLower === 'rejected') {
        return 'bg-red-100 text-red-800';
    } else if (statusLower === 'pending') {
        return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-slate-100 text-slate-800';
};

// Leave type mapping
const LEAVE_TYPE_LABELS = {
    ANN: 'Annual Leave',
    SICK: 'Sick Leave',
    FAMILY: 'Family Responsibility Leave',
    STUDY: 'Study Leave',
    SPECIAL: 'Special Leave',
};

const LEAVE_NAME_TO_CODE = Object.entries(LEAVE_TYPE_LABELS).reduce((acc, [code, name]) => {
    acc[name] = code;
    acc[name.toUpperCase()] = code;
    return acc;
}, {});

const formatLeaveType = (input) => {
    if (!input) return 'Unknown Leave';

    // If it's already a code, use directly
    if (LEAVE_TYPE_LABELS[input]) {
        return LEAVE_TYPE_LABELS[input];
    }

    // If it's a full name, check if we have it mapped
    if (LEAVE_NAME_TO_CODE[input]) {
        return LEAVE_TYPE_LABELS[LEAVE_NAME_TO_CODE[input]];
    }

    // Try uppercase version
    const upper = String(input).toUpperCase();
    if (LEAVE_TYPE_LABELS[upper]) {
        return LEAVE_TYPE_LABELS[upper];
    }

    // Return as-is if already formatted
    return input;
};