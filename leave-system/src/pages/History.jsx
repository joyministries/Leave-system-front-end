import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getMyLeaves } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

export default function History() {
  const location = useLocation();
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const data = await getMyLeaves();
        // Handle both array and paginated response formats
        const leaveData = data.data.results
        setLeaves(leaveData);
      } catch (error) {
        console.error('Error fetching leave history:', error);
      }
    };

    fetchLeaves();
  }, []);

  return (
    <ProtectedLayout
      title="Leave History"
      subtitle="View all your leave requests"
      currentPath={location.pathname}
    >
      <div className="space-y-4">
        {leaves.length > 0 ? (
          leaves.map((leave) => (
            <div
              key={leave.id}
              className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-slate-300 hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{leave.leave_type || leave.type}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
                  </p>
                  {leave.reason && (
                    <p className="text-gray-500 text-xs mt-2">Reason: {leave.reason}</p>
                  )}
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${getStatusClasses(leave.status)}`}>
                  {leave.status}
                </span>
              </div>
              {leave.admin_remarks && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-600 font-semibold">Admin Remarks:</p>
                  <p className="text-sm text-slate-700 mt-1">{leave.admin_remarks}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">No leave history found</p>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}

const formatDate = (dateStr) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, options);
};

const getStatusClasses = (status) => {
  const statusLower = (status || '').toLowerCase();
  if (statusLower === 'approved') {
    return 'bg-green-100 text-green-800 border border-green-300';
  } else if (statusLower === 'rejected') {
    return 'bg-red-100 text-red-800 border border-red-300';
  } else if (statusLower === 'pending') {
    return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
  }
  return 'bg-slate-100 text-slate-800 border border-slate-300';
};