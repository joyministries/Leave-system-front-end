import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMyLeaves, downloadLeaveDocument, uploadLeaveDocument } from '../services/ApiClient';
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

// Determine whether a leave row should show an upload button.
// Matches the backend rule: PENDING or APPROVED + Sick/Study leave type only.
const canUploadDocument = (request) => {
  const uploadableStatuses = ['pending', 'approved'];
  const uploadableTypes = ['sick leave', 'study leave'];
  const statusOk = uploadableStatuses.includes((request.status || '').toLowerCase());
  const typeOk = uploadableTypes.includes(
    (request.leave_type_name || request.leave_type || '').toLowerCase()
  );
  return statusOk && typeOk;
};

// Request Table Row Component
const RequestTableRow = ({ request, onViewDocument, onUploadDocument, uploading }) => {
  if (!request || !request.id) return null;

  const showUpload = canUploadDocument(request);
  const hasDoc = Boolean(request.supporting_document);
  const isUploading = uploading === request.id;

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

      {/* Document column */}
      <td className="px-4 py-3 text-sm">
        <div className="flex flex-col gap-1">
          {/* View button — shown when a document already exists */}
          {hasDoc && (
            <button
              onClick={() => onViewDocument(request.id)}
              className="text-blue-600 font-semibold hover:underline cursor-pointer text-left"
            >
              View
            </button>
          )}

          {/* Upload / Replace button — only for eligible leave types & statuses */}
          {showUpload && (
            <button
              onClick={() => onUploadDocument(request.id)}
              disabled={isUploading}
              className={
                `text-xs font-semibold px-2 py-1 rounded transition-colors cursor-pointer ` +
                (isUploading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : hasDoc
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200')
              }
            >
              {isUploading ? 'Uploading…' : hasDoc ? '↻ Replace' : '↑ Upload'}
            </button>
          )}

          {/* No action available — rejected / cancelled / non-sick leave with no doc */}
          {!hasDoc && !showUpload && (
            <span className="text-slate-400">—</span>
          )}
        </div>
      </td>
    </tr>
  );
};

// Requests Table Component
const RequestsTable = ({ requests, onViewDocument, onUploadDocument, uploading }) => {
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
              <RequestTableRow
                key={request.id}
                request={request}
                onViewDocument={onViewDocument}
                onUploadDocument={onUploadDocument}
                uploading={uploading}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Status Section Component
const StatusSection = ({ title, requests: sectionRequests, icon, bgColor, onViewDocument, onUploadDocument, uploading }) => (
  <div>
    <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${bgColor}`}>
      <span className="text-lg">{icon}</span>
      <h3 className="text-lg font-bold text-slate-900">
        {title} ({sectionRequests.length})
      </h3>
    </div>
    <RequestsTable
      requests={sectionRequests}
      onViewDocument={onViewDocument}
      onUploadDocument={onUploadDocument}
      uploading={uploading}
    />
  </div>
);

export default function MyRequests() {
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const { showError, showSuccess } = useAlert();
  const [loading, setLoading] = useState(false);
  // ID of the leave currently being uploaded to — used to show a spinner on the right row
  const [uploadingLeaveId, setUploadingLeaveId] = useState(null);
  // Tracks which leave ID the hidden file-input is targeting
  const uploadTargetRef = useRef(null);
  const fileInputRef = useRef(null);

    const handleViewDocument = async (leaveId) => {
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
        
        // Cleanup URL after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        
      } catch (error) {
        console.error('Error opening document:', error);
        showError('Failed to open document. Please try again.');
      }
    };

  // ── Upload handler ──────────────────────────────────────────────────────────
  // Called when the employee clicks "↑ Upload" or "↻ Replace" on a leave row.
  // We store the target leave ID in a ref then programmatically open a file picker.
  const handleUploadDocument = (leaveId) => {
    uploadTargetRef.current = leaveId;
    // Reset the input so picking the same file still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  // Fired after the employee picks a file from the OS dialog
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    const leaveId = uploadTargetRef.current;
    if (!file || !leaveId) return;

    setUploadingLeaveId(leaveId);
    try {
      const res = await uploadLeaveDocument(leaveId, file);
      const updatedLeave = res.data?.leave;

      // Patch the updated leave record into local state so the View button appears immediately
      if (updatedLeave) {
        setRequests((prev) =>
          prev.map((req) => (req.id === leaveId ? { ...req, ...updatedLeave } : req))
        );
      }
      showSuccess('Document uploaded successfully!');
    } catch (error) {
      const serverMsg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Failed to upload document. Please try again.';
      showError(serverMsg);
    } finally {
      setUploadingLeaveId(null);
      uploadTargetRef.current = null;
    }
  };

  // ── Fetch leave history ──────────────────────────────────────────────────────
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
      {/* Hidden file input — triggered programmatically from Upload/Replace buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
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
            <RequestsTable
              requests={pendingRequests}
              onViewDocument={handleViewDocument}
              onUploadDocument={handleUploadDocument}
              uploading={uploadingLeaveId}
            />
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
          onViewDocument={handleViewDocument}
          onUploadDocument={handleUploadDocument}
          uploading={uploadingLeaveId}
        />

        {/* Rejected Requests */}
        <StatusSection
          title="Rejected Requests"
          requests={rejectedRequests}
          icon="❌"
          bgColor="bg-red-50 border border-red-200"
          onViewDocument={handleViewDocument}
          onUploadDocument={handleUploadDocument}
          uploading={uploadingLeaveId}
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
