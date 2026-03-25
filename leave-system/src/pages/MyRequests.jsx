import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getMyLeaves } from '../services/ApiClient';
import { useAlert } from '../hooks/alerthook';
import ProtectedLayout from '../components/ProtectedLayout';

// Helper function for date formatting
const formatDate = (dateStr) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, options);
};

// Helper function for status color styling
const getStatusColor = (status) => {
  const statusLower = (status || '').toLowerCase();
  if (statusLower === 'approved') {
    return 'bg-green-100 text-green-700';
  } else if (statusLower === 'rejected') {
    return 'bg-red-100 text-red-700';
  } else if (statusLower === 'pending') {
    return 'bg-yellow-100 text-yellow-700';
  }
  return 'bg-slate-100 text-slate-800';
};

// Request Card Component
const RequestCard = ({ request }) => {
  if (!request || !request.id) return null;

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-slate-200 hover:shadow-md transition-shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">{request.leave_type || request.type || 'Leave'}</h3>
          <p className="text-slate-600 text-sm">{formatDate(request.start_date)} to {formatDate(request.end_date)}</p>
          <p className="text-slate-500 text-sm mt-2">Reason: {request.reason || '-'}</p>
          <p className="text-slate-400 text-xs mt-1">Submitted: {formatDate(request.created_at || new Date().toISOString())}</p>
        </div>
        <div></div>
        <div className="md:text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(request.status || 'pending')}`}>
            {request.status || 'Pending'}
          </span>
          {request.admin_remarks && (
            <p className="text-slate-600 text-xs mt-3 md:text-right">Admin: {request.admin_remarks}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Status Section Component
const StatusSection = ({ title, requests: sectionRequests, icon, bgColor }) => (
  <div>
    <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${bgColor}`}>
      <span className="text-lg">{icon}</span>
      <h3 className="text-lg font-bold text-slate-900">
        {title} ({sectionRequests.length})
      </h3>
    </div>
    <div className="space-y-4">
      {sectionRequests.length > 0 ? (
        sectionRequests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))
      ) : (
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <p className="text-slate-500">No {title.toLowerCase()} requests</p>
        </div>
      )}
    </div>
  </div>
);

export default function MyRequests() {
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const { showError } = useAlert();

  useEffect(() => {
    const fetchLeaveHistory = async () => {
      try {

        const leaveData = await getMyLeaves();
        if (!leaveData) {
          showError('No leave data found.');
          return;
        }
        // Handle both array and paginated response formats
        const requestsList = Array.isArray(leaveData) ? leaveData : leaveData.results || [];
        // Filter out any undefined/null entries
        const cleanedRequests = requestsList.filter(req => req && req.id);
        setRequests(cleanedRequests);
      } catch (error) {
        console.error('Error fetching leave requests:', error);
        showError('Failed to load leave requests.');
      }
    };

    fetchLeaveHistory();
  }, [showError]);

  // Categorize requests by status
  const getRequestsByStatus = (status) => {
    return requests.filter(req => (req.status || '').toLowerCase() === status.toLowerCase());
  };

  const pendingRequests = getRequestsByStatus('pending');
  const approvedRequests = getRequestsByStatus('approved');
  const rejectedRequests = getRequestsByStatus('rejected');

  return (
    <ProtectedLayout
      title="My Leave Requests"
      subtitle="View all your submitted leave requests"
      currentPath={location.pathname}
    >
      <div className="space-y-8">
        {/* Pending Requests */}
        <StatusSection
          title="Pending Requests"
          requests={pendingRequests}
          icon="⏳"
          bgColor="bg-yellow-50 border border-yellow-200"
        />

        {/* Approved Requests */}
        <StatusSection
          title="Approved Requests"
          requests={approvedRequests}
          icon="✅"
          bgColor="bg-green-50 border border-green-200"
        />

        {/* Rejected Requests */}
        <StatusSection
          title="Rejected Requests"
          requests={rejectedRequests}
          icon="❌"
          bgColor="bg-red-50 border border-red-200"
        />

        {/* No Requests */}
        {requests.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-500 text-lg">No leave requests found</p>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
