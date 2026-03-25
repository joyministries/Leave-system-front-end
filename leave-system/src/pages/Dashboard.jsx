import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { useEffect, useState } from 'react';
import { getLeaveHistory } from '../services/ApiClient';
import { getUserDisplayName } from '../utils/userUtils';
import ProtectedLayout from '../components/ProtectedLayout';
import LeaveStats from '../components/LeaveStats';
import ApplyLeaveModal from '../components/ApplyLeaveModal';

export default function Dashboard() {
    const location = useLocation();
    const { user } = useAuth();
    const { showError, showSuccess } = useAlert();
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Get greeting based on time
    const getGreeting = () => {
        const now = new Date();
        const hour = now.getHours();

        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    useEffect(() => {
        const fetchLeaveRequests = async () => {
            try {
                const data = await getLeaveHistory();
                // Handle both array and paginated response formats
                const leaveData = Array.isArray(data) ? data : data.results || [];

                // Filter out any undefined/null entries
                const validLeaves = leaveData.filter(leave => leave && leave.id);

                // Format leave types for display
                const formattedLeaveData = validLeaves.map(leave => ({
                    ...leave,
                    leave_type: formatLeaveType(leave.leave_type || leave.type)
                }));
                setLeaveRequests(formattedLeaveData);
            } catch (error) {
                console.error('Error fetching leave requests:', error);
                showError('Failed to load leave requests. Please try again.');
            }
        };

        fetchLeaveRequests();
    }, [showError]);

    const handleApplyLeaveClick = () => {
        setIsModalOpen(true);
    };

    const greetingText = `${getGreeting()}, ${getUserDisplayName(user)}!`;
    const subtitleText = 'Track your leave status and apply for new leaves';

    return (
        <ProtectedLayout
            title="Team Impact University"
            subtitle={subtitleText}
            action={{ label: 'Apply Leave', onClick: handleApplyLeaveClick }}
            currentPath={location.pathname}
        >
            {/* Welcome Banner */}
            <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-lg mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{greetingText}</h1>
                <p className="text-blue-100 mt-2 text-sm sm:text-base">{subtitleText}</p>
            </div>

            {/* Leave Stats Grid */}
            <div className="mb-6 sm:mb-8">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4">Your Current Leaves</h2>
                <LeaveStats />
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
                            {leaveRequests && leaveRequests.length > 0 ? (
                                leaveRequests.slice(0, 5).map((request) => {
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

            {/* Apply Leave Modal */}
            <ApplyLeaveModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmitSuccess={() => {
                    setIsModalOpen(false);
                    showSuccess('Leave request submitted successfully!');
                    // Refresh leave requests
                    const fetchLeaveRequests = async () => {
                        try {
                            const data = await getLeaveHistory();
                            const leaveData = Array.isArray(data) ? data : data.results || [];

                            // Filter out any undefined/null entries
                            const validLeaves = leaveData.filter(leave => leave && leave.id);

                            const formattedLeaveData = validLeaves.map(leave => ({
                                ...leave,
                                leave_type: formatLeaveType(leave.leave_type || leave.type)
                            }));
                            setLeaveRequests(formattedLeaveData);
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