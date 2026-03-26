import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStatistics, getEmployees, listLeaves } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

export default function AdminReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reportType, setReportType] = useState('applications');
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);

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
      const data = await getEmployees();
      setEmployees(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchLeaveApplications = async () => {
    try {
      const response = await listLeaves();
      const data = Array.isArray(response) ? response : (response.data || response.results || []);
      setLeaveApplications(data);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
    }
  };

  useEffect(() => {
    fetchLeaveData();
    fetchEmployeesData();
    fetchLeaveApplications();
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
        <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 max-w-md w-full text-center">
            <svg
              className="w-20 h-20 text-slate-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Available</h3>
            <p className="text-slate-600 mb-6">
              There is no reporting data available at this moment. Try refreshing the page or check back later.
            </p>
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Refresh Data
            </button>
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
          <div className="mb-10">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold mb-6 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-5xl font-black text-slate-900 mb-3">Leave Applications</h1>
            <p className="text-slate-600 text-lg">
              Review and manage pending leave applications awaiting approval
            </p>
          </div>

          {/* Controls - Hidden for now, shows when needed */}
          {reportType !== 'applications' && (
            <div className="mb-8 flex gap-3 flex-wrap items-center">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="summary">Summary Report</option>
                <option value="applications">Leave Applications</option>
                <option value="employees">All Employees</option>
                <option value="department">Department Statistics</option>
                <option value="monthly">Monthly Statistics</option>
                <option value="leaveType">Leave Type Statistics</option>
              </select>

              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={downloadPDF}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Export PDF
              </button>
              <button
                onClick={downloadExcel}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Export Excel
              </button>
            </div>
          )}

          {/* Summary Report - Hidden by default */}
          {reportType === 'summary' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Summary Bar */}
              <div className="bg-blue-50 border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">Leave Statistics Summary</h2>
                <p className="text-slate-600 mt-1">Overview of all leave applications and statistics</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide">Total Applications</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{statistics.totalApplications}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-green-700 text-xs font-semibold uppercase tracking-wide">Approved</p>
                    <p className="text-3xl font-black text-green-600 mt-2">{statistics.approvedApplications}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-red-700 text-xs font-semibold uppercase tracking-wide">Rejected</p>
                    <p className="text-3xl font-black text-red-600 mt-2">{statistics.rejectedApplications}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-yellow-700 text-xs font-semibold uppercase tracking-wide">Pending</p>
                    <p className="text-3xl font-black text-yellow-600 mt-2">{statistics.pendingApplications}</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-slate-600 text-xs">Total Employees</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">{statistics.totalEmployees}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-xs">Approval Rate</p>
                      <p className="text-2xl font-black text-blue-600 mt-1">
                        {statistics.totalApplications > 0
                          ? ((statistics.approvedApplications / statistics.totalApplications) * 100).toFixed(0)
                          : '0'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-xs">Rejection Rate</p>
                      <p className="text-2xl font-black text-red-600 mt-1">
                        {statistics.totalApplications > 0
                          ? ((statistics.rejectedApplications / statistics.totalApplications) * 100).toFixed(0)
                          : '0'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-xs">Pending Rate</p>
                      <p className="text-2xl font-black text-yellow-600 mt-1">
                        {statistics.totalApplications > 0
                          ? ((statistics.pendingApplications / statistics.totalApplications) * 100).toFixed(0)
                          : '0'}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leave Applications Report */}
          {reportType === 'applications' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-blue-50 border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">Leave Applications</h2>
                <p className="text-slate-600 mt-1">Complete list of all employee leave applications</p>
              </div>

              {/* Status Summary */}
              <div className="border-b border-slate-200 p-4 bg-slate-50 flex gap-3 flex-wrap">
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                  ✓ Approved: {leaveApplications.filter(l => (l.status || '').toLowerCase() === 'approved').length}
                </div>
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                  ⏳ Pending: {leaveApplications.filter(l => (l.status || '').toLowerCase() === 'pending').length}
                </div>
                <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                  ✕ Rejected: {leaveApplications.filter(l => (l.status || '').toLowerCase() === 'rejected').length}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Leave Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Start Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">End Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveApplications.length > 0 ? (
                      leaveApplications.map((app, idx) => {
                        const status = (app.status || '').toLowerCase();
                        const statusColor = 
                          status === 'approved' ? 'bg-green-100 text-green-800' :
                          status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800';
                        
                        const statusIcon = 
                          status === 'approved' ? '✓' :
                          status === 'pending' ? '⏳' :
                          status === 'rejected' ? '✕' :
                          '•';

                        return (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition">
                            <td className="px-6 py-4 text-sm text-slate-900 font-semibold">
                              {app.employee?.first_name} {app.employee?.last_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {app.leave_type?.name || app.leave_type || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {app.start_date ? new Date(app.start_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {app.end_date ? new Date(app.end_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                {statusIcon} {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State for Leave Applications */}
          {reportType === 'applications' && leaveApplications.length === 0 && (
            <div className="flex items-center justify-center min-h-96">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 max-w-md w-full text-center">
                <svg
                  className="w-20 h-20 text-slate-300 mx-auto mb-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">No Pending Applications</h3>
                <p className="text-slate-600 text-base leading-relaxed">
                  All leave applications have been processed!
                </p>
              </div>
            </div>
          )}

          {/* All Employees */}
          {reportType === 'employees' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-blue-50 border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">All Employees</h2>
                <p className="text-slate-600 mt-1">{employees.length} employees in the system</p>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 border-b border-slate-200 p-4">
                <p className="text-slate-700 font-semibold text-sm">
                  Total: {employees.length} employee{employees.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length > 0 ? (
                      employees.map((emp, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {emp.first_name} {emp.last_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {emp.email}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {emp.department || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {emp.position || 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State for Employees */}
          {reportType === 'employees' && employees.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 m-6">
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
                    d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20a9 9 0 0118 0v-2a9 9 0 00-18 0v2z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Employees Found</h3>
                <p className="text-slate-600">No employees are currently in the system</p>
              </div>
            </div>
          )}

          {/* Department Statistics */}
          {reportType === 'department' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-blue-50 border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">Department Statistics</h2>
                <p className="text-slate-600 mt-1">Leave statistics broken down by department</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Employees</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Approved Leave</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.departmentStats.length > 0 ? (
                      statistics.departmentStats.map((dept, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{dept.department}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{dept.employees}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{dept.approvedLeave || '0'}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                              {dept.pendingLeave || '0'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State for Department Statistics */}
          {reportType === 'department' && statistics.departmentStats.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 m-6">
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Department Data</h3>
                <p className="text-slate-600">No department statistics are available</p>
              </div>
            </div>
          )}

          {/* Monthly Statistics */}
          {reportType === 'monthly' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-blue-50 border-b border-slate-200 p-6">
                <h2 className="text-2xl font-bold text-slate-900">Monthly Statistics</h2>
                <p className="text-slate-600 mt-1">Leave application trends by month</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Month</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Approved</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Rejected</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-900">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.monthlyStats.length > 0 ? (
                      statistics.monthlyStats.map((month, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{month.month}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                              {month.approved || '0'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                              {month.rejected || '0'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                              {month.pending || '0'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State for Monthly Statistics */}
          {reportType === 'monthly' && statistics.monthlyStats.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 m-6">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Monthly Statistics</h3>
                <p className="text-slate-600">No monthly data is currently available</p>
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