import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/alerthook';
import { getPendingLeaves, updateLeave } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

export default function AdminApplications() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useAlert();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Format leave type
  const formatLeaveType = (leaveType) => {
    const typeMap = {
      ANN: 'Annual Leave',
      SICK: 'Sick Leave',
      STUDY: 'Study Leave',
      FAMILY: 'Family Responsibility Leave',
    };
    return typeMap[leaveType] || leaveType || 'Leave';
  };

  // Fetch pending applications
  const fetchPendingApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getPendingLeaves();
      // Handle both array and nested object responses
      const leaveData = Array.isArray(data) ? data : data.results || [];

      // Transform API response to component format
      const transformedData = leaveData.map((item) => {
        const employee = item.employee || {};
        return {
          id: item.id,
          employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
          employeeId: employee.id || 'N/A',
          employeeDepartment: employee.department || 'N/A',
          employeeEmail: employee.email || 'N/A',
          type: formatLeaveType(item.leave_type),
          start: item.start_date || 'N/A',
          end: item.end_date || 'N/A',
          reason: item.reason || 'No reason provided',
          submittedDate: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A',
          leave_type: item.leave_type,
        };
      });

      setApplications(transformedData);
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      showError('Failed to load pending applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Fetch pending applications on component mount
  useEffect(() => {
    fetchPendingApplications();
  }, [fetchPendingApplications]);

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '1 day';
    } catch {
      return 'N/A';
    }
  };



  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-black text-slate-900 mb-2">Leave Applications</h1>
            <p className="text-slate-600">
              Review and manage pending leave applications awaiting approval
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12">
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="animate-spin h-6 w-6 text-slate-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-slate-600 font-medium">Loading applications...</p>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-slate-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Pending Applications</h3>
                <p className="text-slate-600">All leave applications have been processed!</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Summary Card */}
              <div className="bg-blue-50 border-b border-slate-200 p-4">
                <p className="text-blue-900 font-semibold">
                  {applications.length} pending application{applications.length !== 1 ? 's' : ''} awaiting approval
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Employee</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Department</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Leave Type</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Duration</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Start Date</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">End Date</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Reason</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <ApplicationRow
                        key={app.id}
                        app={app}
                        onUpdateSuccess={(updatedApp) => {
                          setApplications((prev) =>
                            prev.map((item) => (item.id === updatedApp.id ? updatedApp : item))
                          );
                        }}
                        calculateDays={calculateDays}
                        showWarning={showWarning}
                        showSuccess={showSuccess}
                        showError={showError}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}

// Extracted ApplicationRow component to isolate edit state and prevent massive re-renders
function ApplicationRow({ app, onUpdateSuccess, calculateDays, showSuccess, showError }) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle approve action
  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await updateLeave(app.id, { status: 'APPROVED' });
      onUpdateSuccess({ ...app, status: 'Approved' });
      showSuccess('Leave application approved successfully!');
    } catch (error) {
      console.error('Error approving application:', error);
      showError('Failed to approve application. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject action
  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await updateLeave(app.id, { status: 'REJECTED' });
      onUpdateSuccess({ ...app, status: 'Rejected' });
      showSuccess('Leave application rejected successfully!');
    } catch (error) {
      console.error('Error rejecting application:', error);
      showError('Failed to reject application. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <tr className="border-b border-slate-200 hover:bg-slate-50 transition">
      <td className="px-6 py-4">
        <div>
          <p className="font-semibold text-slate-900">{app.employeeName}</p>
          <p className="text-xs text-slate-500">{app.employeeId}</p>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-700">{app.employeeDepartment}</td>
      <td className="px-6 py-4 text-slate-700">{app.type}</td>
      <td className="px-6 py-4 text-slate-700">{calculateDays(app.start, app.end)}</td>
      <td className="px-6 py-4">
        <span className="text-slate-700">{app.start}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-slate-700">{app.end}</span>
      </td>
      <td className="px-6 py-4">
        <p className="text-slate-700 text-sm truncate max-w-xs" title={app.reason}>
          {app.reason}
        </p>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded transition disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  );
}