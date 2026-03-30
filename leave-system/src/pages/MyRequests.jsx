import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

// Request Table Row Component
const RequestTableRow = ({ request }) => {
  if (!request || !request.id) return null;

  return (
    <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
        {request.leave_type_name || request.leave_type || 'Leave Request'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {formatDate(request.start_date)}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {formatDate(request.end_date)}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">
          {request.leave_duration || 'N/A'} days
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
        {request.reason || 'No reason provided'}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
          {request.status || 'Pending'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {request.supporting_document ? (
          <a 
            href={request.supporting_document} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold hover:underline"
          >
            View
          </a>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
    </tr>
  );
};

// Requests Table Component
const RequestsTable = ({ requests }) => {
  if (!requests || requests.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-300">
        <p className="text-slate-500">No requests</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Leave Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">From</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Document</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <RequestTableRow key={request.id} request={request} />
            ))}
          </tbody>
        </table>
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
    <RequestsTable requests={sectionRequests} />
  </div>
);

export default function MyRequests() {
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const { showError } = useAlert();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaveHistory = async () => {
      setLoading(true);
      try {
        const res = await getMyLeaves();
        const leaveData = res.data;
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
      } finally {
        setLoading(false);
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
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
              <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Dashboard
              </button>
              <h1 className="text-4xl font-black text-slate-900 mb-2">My Leave Requests</h1>
              <p className="text-slate-600">View all your submitted leave requests</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
              <p className="text-slate-500 text-lg">Loading your leave requests...</p>
            </div>
          ) : (
      
      <div className="space-y-12">
        {/** Pending requests */}
       <section className="mb-12">
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
            <span className="text-2xl">⏳</span>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Pending Requests ({pendingRequests.length})
              </h3>
            </div>
          </div>

          {pendingRequests.length > 0 ? (
            <RequestsTable requests={pendingRequests} />
          ) : (
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-300">
              <p className="text-slate-500">No pending requests</p>
            </div>
          )}
        </section>
       
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
          )}
      </div>
     </div>
    </ProtectedLayout>
  );
}
