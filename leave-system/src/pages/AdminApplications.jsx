import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/alerthook';
import { getPendingLeaves, getLeaveType, updateLeaveStatus, downloadLeaveDocument } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

export default function AdminApplications() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    app: null,
    actionType: '', // 'APPROVED' or 'REJECTED'
    remarks: '',
    startDate: '',
    endDate: ''
  });

  const formatLeaveType = (leaveType) => {
    const typeMap = {
      ANN: 'Annual Leave',
      SICK: 'Sick Leave',
      STUDY: 'Study Leave',
      FAMILY: 'Family Responsibility Leave',
    };
    return typeMap[leaveType] || leaveType || 'Leave';
  };

  // Calculate days between two dates (inclusive)
  const calculateDaysDifference = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    let weekdayCount = 0;
    const currentDate = new Date(start);

    // Loop through each day from start to end date (inclusive)
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      // 0 = Sunday, 6 = Saturday; exclude both
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        weekdayCount++;
      }
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return Math.max(0, weekdayCount);
  };

  const fetchPendingApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getPendingLeaves();
      const data = res.data;
      const leaveData = Array.isArray(data) ? data : data.results || [];

      // Get unique leave type codes
      const uniqueLeaveTypes = [...new Set(leaveData.map(item => item.leave_type).filter(Boolean))];

      // Fetch max_days for each leave type
      const leaveTypeDetails = {};
      await Promise.all(
        uniqueLeaveTypes.map(async (typeCode) => {
          try {
            const typeRes = await getLeaveType(typeCode);
            leaveTypeDetails[typeCode] = typeRes.data.max_days || 'N/A';
          } catch (err) {
            console.warn(`Failed to fetch details for leave type ${typeCode}:`, err);
            leaveTypeDetails[typeCode] = 'N/A';
          }
        })
      );

      const transformedData = leaveData.map((item) => {
        return {
          id: item.id,
          employeeName: item.employee_name || 'Unknown',
          employeeDepartment: item.department || item.employee?.department || 'General',
          employeeInstitution: item.institution_name || 'Main Branch',
          type: formatLeaveType(item.leave_type_name || item.leave_type),
          leaveTypeCode: item.leave_type || 'N/A',
          maxDays: leaveTypeDetails[item.leave_type] || 'N/A',
          start: item.start_date || '',
          end: item.end_date || '',
          reason: item.reason || 'No reason provided',
          extra_unpaid_days: item.extra_unpaid_days || 0,
          leave_duration: item.leave_duration || 0,
          supporting_document: item.supporting_document || null
        };
      });

      setApplications(transformedData);
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      showError('Failed to load pending applications.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchPendingApplications();
  }, [fetchPendingApplications]);


  // 2. Open Review Dialog
  const openReviewModal = (app, type) => {
    setReviewModal({
      isOpen: true,
      app,
      actionType: type,
      remarks: '',
      startDate: app.start,
      endDate: app.end
    });
  };

  const closeReviewModal = () => {
    setReviewModal({ isOpen: false, app: null, actionType: '', remarks: '', startDate: '', endDate: '' });
  };

  // Submit the Review
  const submitReview = async () => {
    try {
      const payload = {
        status: reviewModal.actionType,
        admin_remarks: reviewModal.remarks,
        start_date: reviewModal.startDate,
        end_date: reviewModal.endDate
      };

      await updateLeaveStatus(reviewModal.app.id, payload);

      showSuccess(`Leave ${reviewModal.actionType.toLowerCase()} successfully!`);

      // Remove from pending list
      setApplications(prev => prev.filter(item => item.id !== reviewModal.app.id));
      closeReviewModal();
    } catch (error) {
      console.error('Error updating leave:', error);
      showError('Failed to process application. Please try again.');
    }
  };

  const handleDownloadDocument = async (leaveId) => {
    try {
      const response = await downloadLeaveDocument(leaveId);

      // Get filename and MIME type from headers
      const contentDisposition = response.headers['content-disposition'];
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      let fileName = 'document';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1];
        }
      }

      // Create blob with correct MIME type
      const blobData = new Blob([response.data], { type: contentType });

      // Create object URL and open in new tab
      const url = window.URL.createObjectURL(blobData);
      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        showError('Please allow popups to view the document.');
        // Fallback to download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Cleanup URL after a delay to ensure tab loads
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);

    } catch (error) {
      console.error('Error opening document:', error);
      showError('Failed to open document. Please try again.');
    }
  };

  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
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
            <p className="text-slate-600">Review and process employee leave requests</p>
          </div>

          {isLoading ? (
            <p>Loading...</p>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Pending Applications</h3>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Employee</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Institution</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Department</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Leave Type</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Duration</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Document</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{app.employeeName}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">{app.employeeInstitution}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{app.employeeDepartment}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <span className="font-bold">{app.type}</span>
                          <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]">"{app.reason}"</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">
                          {app.leave_duration}
                          <p className="text-[10px] mt-1 text-orange-500"> Unpaid Days : {app.extra_unpaid_days}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {app.supporting_document ? (
                            <button
                              onClick={() => handleDownloadDocument(app.id)}
                              className="text-blue-600 font-semibold hover:underline cursor-pointer"
                            >
                              View Document
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">No document</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openReviewModal(app, 'APPROVED')}
                              className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-bold uppercase tracking-wider rounded transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openReviewModal(app, 'REJECTED')}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold uppercase tracking-wider rounded transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REVIEW MODAL */}
      {reviewModal.isOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={closeReviewModal}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  {reviewModal.actionType === 'APPROVED' ? 'Approve Leave' : 'Reject Leave'}
                </h2>
                <span className={`px-3 py-1 text-xs font-black uppercase rounded-full ${reviewModal.actionType === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {reviewModal.app.employeeName}
                </span>
              </div>

              <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Leave Type</p>
                    <p className="text-sm font-bold text-slate-900">{reviewModal.app.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Max Days Allowed</p>
                    <p className="text-sm font-bold text-blue-600">{reviewModal.app.maxDays} days</p>
                  </div>
                </div>
                {reviewModal.app.supporting_document && (
                  <div className="mt-3 pt-3 border-t border-slate-300">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Supporting Document</p>
                    <button
                      onClick={() => handleDownloadDocument(reviewModal.app.id)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Document
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={reviewModal.startDate}
                    onChange={(e) => setReviewModal({ ...reviewModal, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={reviewModal.endDate}
                    onChange={(e) => setReviewModal({ ...reviewModal, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {(() => {
                const newDays = calculateDaysDifference(reviewModal.startDate, reviewModal.endDate);
                const maxDaysAllowed = parseInt(reviewModal.app.maxDays) || 0;
                const unpaidDays = Math.max(0, newDays - maxDaysAllowed);

                return unpaidDays > 0 ? (
                  <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
                    <p className="text-sm font-bold text-orange-700">
                      Adding unpaid days: {unpaidDays}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Requested: {newDays} days → Max allowed: {maxDaysAllowed} days
                    </p>
                  </div>
                ) : null;
              })()}

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Remarks (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Add notes, conditions, or reasons..."
                  value={reviewModal.remarks}
                  onChange={(e) => setReviewModal({ ...reviewModal, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={submitReview}
                  className={`flex-1 py-3 text-white font-bold rounded-xl transition ${reviewModal.actionType === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Confirm {reviewModal.actionType === 'APPROVED' ? 'Approval' : 'Rejection'}
                </button>
                <button
                  onClick={closeReviewModal}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ProtectedLayout>
  );
}