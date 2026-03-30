import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';
import { useAlert } from '../hooks/alerthook';
import { useEffect, useState } from 'react';
import { getMyLeaves, getPendingLeaves } from '../services/ApiClient';
import { getUserDisplayName } from '../utils/userUtils';
import ProtectedLayout from '../components/ProtectedLayout';
import ApprovedLeaveCard from '../components/LeaveStats';
import ApplyLeaveModal from '../components/ApplyLeaveModal';

export default function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showError, showSuccess } = useAlert();
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingLeaves, setPendingLeaves] = useState([]);

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

    // Fetch pending leaves for admin dashboard
    useEffect(() => {
        const fetchPendingLeaves = async () => {
            try {
                const res = await getPendingLeaves();
                const data = res.data;
                const pendingData = Array.isArray(data) ? data : data.results || [];
                setPendingLeaves(pendingData);
            } catch (error) {
                console.error('Error fetching pending leaves:', error);
                showError('Failed to load pending leave requests. Please try again.');
            }
        };

        fetchPendingLeaves();
    }, [showError]);

    useEffect(() => {
        const fetchApprovedLeaves = async () => {
            const data = await getMyLeaves();
            const approvedleaves = data.data;
            const approvedData = Array.isArray(approvedleaves) ? approvedleaves : [];
            setLeaveRequests(approvedData.filter(leave => leave.status?.toLowerCase() === 'approved'));
        };
        fetchApprovedLeaves();
    }, [showError]);


    return (
        <ProtectedLayout
            title="Team Impact University"
            subtitle={subtitleText}
            action={{ label: 'Apply Leave', onClick: handleApplyLeaveClick }}
            currentPath={location.pathname}
        >
            {/* Welcome Banner with Add Employee Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 text-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-lg mb-6 sm:mb-8 gap-4">
                <div className="flex-1">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{greetingText}</h1>
                    <p className="text-blue-100 mt-2 text-sm sm:text-base">{subtitleText}</p>
                </div>
                <button
                    onClick={() => navigate('/admin/add-employee')}
                    className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] flex-shrink-0"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Employee
                </button>
            </div>

            {/* Leave Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {leaveRequests
                    .filter(req => req.status?.toLowerCase() === 'approved')
                    .slice(0, 3) // Only show the next 3 upcoming leaves
                    .map(leave => (
                        <ApprovedLeaveCard key={leave.id} leave={leave} />
                    ))
                }
            </div>

            {/* Leave Requests Table */}
            <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 border-b border-slate-200">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Requests</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm sm:text-base">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                                <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Start Date</th>
                                <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">End Date</th>
                                <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="hidden sm:table-cell px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingLeaves && pendingLeaves.length > 0 ? (
                                pendingLeaves.slice(0, 5).map((request) => {
                                    // Add safety check for request object
                                    if (!request || !request.id) return null;
                                    return (
                                        <tr key={request.id} className="border-t border-slate-200 hover:bg-slate-50 transition">
                                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-900">
                                                {formatLeaveType(request.leave_type || request.type)}
                                            </td>
                                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                                                {request.start_date ? formatDate(request.start_date) : 'N/A'}
                                            </td>
                                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                                                {request.end_date ? formatDate(request.end_date) : 'N/A'}
                                            </td>
                                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                                                <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status || 'pending')}`}>
                                                    {request.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="hidden sm:table-cell px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 max-w-xs truncate">
                                                {request.admin_remarks || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-3 sm:px-4 md:px-6 py-6 sm:py-8 text-center text-slate-500 text-sm sm:text-base">
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
                            const data = await getMyLeaves();
                            const leaveData = Array.isArray(data) ? data : data.results || [];
                            const formattedLeaveData = leaveData.map(leave => ({
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