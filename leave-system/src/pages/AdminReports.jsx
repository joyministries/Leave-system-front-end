import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStatistics, getAllEmployees } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

export default function AdminReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reportType, setReportType] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [employees, setEmployees] = useState([]);

  const fetchLeaveData = async () => {
    try {
      setIsLoading(true);
      const data = await getStatistics();
      
      // Transform API response to component format
      const summary = data.summary || {};
      const users = data.users || [];
      
      // Calculate department stats
      const deptMap = {};
      users.forEach((user) => {
        const dept = user.department || 'Unknown';
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, employees: 0 };
        }
        deptMap[dept].employees += 1;
      });
      const departmentStats = Object.values(deptMap);
      
      // Transform to expected format
      const transformedData = {
        totalApplications: summary.total_applications || 0,
        approvedApplications: summary.approved_applications || 0,
        rejectedApplications: summary.rejected_applications || 0,
        pendingApplications: summary.pending_applications || 0,
        totalEmployees: users.length,
        avgLeaveDaysPerEmployee: 0,
        mostUsedLeaveType: 'N/A',
        departmentStats,
        monthlyStats: [],
        leaveTypeStats: [],
      };
      
      setStatistics(transformedData);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeesData = async () => {
    try {
      const data = await getAllEmployees();
      setEmployees(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    fetchLeaveData();
    fetchEmployeesData();
  }, []);
  
  const downloadPDF = () => {
    alert('PDF export feature coming soon!');
  };

  const downloadExcel = () => {
    alert('Excel export feature coming soon!');
  };

  // 4. Refresh button handler
  const handleRefresh = () => {
    fetchLeaveData();
  };

  if (isLoading) {
    return (
      <ProtectedLayout currentPath={location.pathname}>
        <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="animate-spin h-12 w-12 text-slate-900 mx-auto mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-slate-600 font-medium">Loading reports...</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!statistics) {
    return (
      <ProtectedLayout currentPath={location.pathname}>
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="text-center">
            <p className="text-slate-600">No data available</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

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
            <h1 className="text-4xl font-black text-slate-900 mb-2">Leave Reports</h1>
            <p className="text-slate-600">View and analyze leave management statistics</p>
          </div>

          {/* Controls */}
          <div className="mb-8 flex gap-4 flex-wrap">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="summary">Summary Report</option>
              <option value="employees">All Employees</option>
              <option value="department">Department Statistics</option>
              <option value="monthly">Monthly Statistics</option>
              <option value="leaveType">Leave Type Statistics</option>
            </select>

            <button
              onClick={downloadPDF}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition"
            >
              📄 Export PDF
            </button>
            <button
              onClick={downloadExcel}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
            >
              📊 Export Excel
            </button>
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Summary Report */}
          {reportType === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm">Total Applications</p>
                  <p className="text-4xl font-black text-slate-900 mt-2">{statistics.totalApplications}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm">Approved</p>
                  <p className="text-4xl font-black text-green-600 mt-2">{statistics.approvedApplications}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm">Rejected</p>
                  <p className="text-4xl font-black text-red-600 mt-2">{statistics.rejectedApplications}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm">Pending</p>
                  <p className="text-4xl font-black text-yellow-600 mt-2">{statistics.pendingApplications}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm mb-4">Approval Rate</p>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width:
                          statistics.totalApplications > 0
                            ? `${(statistics.approvedApplications / statistics.totalApplications) * 100}%`
                            : '0%',
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    {statistics.totalApplications > 0
                      ? ((statistics.approvedApplications / statistics.totalApplications) * 100).toFixed(1)
                      : '0'}
                    % approved
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm mb-2">Quick Stats</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Employees:</span>
                      <span className="font-semibold">{statistics.totalEmployees}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Avg Days/Employee:</span>
                      <span className="font-semibold">{statistics.avgLeaveDaysPerEmployee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Most Used:</span>
                      <span className="font-semibold">{statistics.mostUsedLeaveType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Rejection Rate:</span>
                      <span className="font-semibold">
                        {statistics.totalApplications > 0
                          ? ((statistics.rejectedApplications / statistics.totalApplications) * 100).toFixed(1)
                          : '0'}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Department Statistics */}
          {reportType === 'employees' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Summary Card */}
              <div className="bg-blue-50 border-b border-slate-200 p-4">
                <p className="text-blue-900 font-semibold">
                  All Employees in the System ({employees.length})
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-900">Name</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-900">Email</th>
                      <th className="hidden md:table-cell px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-900">Department</th>
                      <th className="hidden lg:table-cell px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-900">Position</th>
                      <th className="hidden sm:table-cell px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-900">Date Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length > 0 ? (
                      employees.map((emp, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition">
                          <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-900">
                            {emp.first_name} {emp.last_name}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-slate-600 truncate">
                            {emp.email}
                          </td>
                          <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-sm text-slate-600">
                            {emp.department || 'N/A'}
                          </td>
                          <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-slate-600">
                            {emp.position || 'N/A'}
                          </td>
                          <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-slate-600">
                            {emp.date_added ? new Date(emp.date_added).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 sm:px-6 py-8 text-center text-slate-500">
                          No employees found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Department Statistics */}
          {reportType === 'department' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Summary Card */}
              <div className="bg-blue-50 border-b border-slate-200 p-4">
                <p className="text-blue-900 font-semibold">
                  Department breakdown of leave statistics
                </p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Department</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Employees</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Approved Leave</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Pending Applications</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.departmentStats.length > 0 ? (
                    statistics.departmentStats.map((dept, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">{dept.department}</td>
                        <td className="px-6 py-4 text-slate-600">{dept.employees}</td>
                        <td className="px-6 py-4 text-slate-600">{dept.approvedLeave}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
                            {dept.pendingLeave}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-slate-500">
                        No department data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Monthly Statistics */}
          {reportType === 'monthly' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Summary Card */}
              <div className="bg-blue-50 border-b border-slate-200 p-4">
                <p className="text-blue-900 font-semibold">
                  Monthly leave application trends
                </p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Month</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Approved</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Rejected</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.monthlyStats.length > 0 ? (
                    statistics.monthlyStats.map((month, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">{month.month}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            {month.approved}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            {month.rejected}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                            {month.pending}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-slate-500">
                        No monthly data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Leave Type Statistics */}
          {reportType === 'leaveType' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Summary Card */}
              <div className="bg-blue-50 border-b border-slate-200 p-4">
                <p className="text-blue-900 font-semibold">
                  Break down by leave type
                </p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Leave Type</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Total</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Approved</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Rejected</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.leaveTypeStats.length > 0 ? (
                    statistics.leaveTypeStats.map((leave, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">{leave.type}</td>
                        <td className="px-6 py-4 text-slate-600">{leave.used}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            {leave.approved}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            {leave.rejected}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
                            {leave.pending}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                        No leave type data available
                      </td>
                    </tr>
                  )}
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