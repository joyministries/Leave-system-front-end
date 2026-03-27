import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStatistics, getEmployees, listLeaves } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

export default function AdminReports() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- State Management ---
  const [reportType, setReportType] = useState('applications');
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  // Initialized as an object to prevent "cannot read property of null" errors
  const [statistics, setStatistics] = useState({
    totalApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    pendingApplications: 0,
    totalEmployees: 0,
    departmentStats: [],
    monthlyStats: [],
    leaveTypeStats: [],
  });

  // --- Data Fetching ---
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch all required data in parallel
      const [statsData, empData, leavesData] = await Promise.all([
        getStatistics(),
        getEmployees(),
        listLeaves()
      ]);

      // 1. Process Statistics & Department Mapping
      const users = statsData.users || [];
      const summary = statsData.summary || {};
      const deptMap = {};

      users.forEach((user) => {
        const dept = user.department || 'Unknown';
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, employees: 0, approvedLeave: 0, pendingLeave: 0 };
        }
        deptMap[dept].employees += 1;
      });

      setStatistics({
        totalApplications: summary.total_applications || 0,
        approvedApplications: summary.approved_applications || 0,
        rejectedApplications: summary.rejected_applications || 0,
        pendingApplications: summary.pending_applications || 0,
        totalEmployees: users.length,
        departmentStats: Object.values(deptMap),
        monthlyStats: statsData.monthly_stats || [],
        leaveTypeStats: statsData.leave_type_stats || [],
      });

      // 2. Set Employee List
      setEmployees(Array.isArray(empData) ? empData : empData.results || []);

      // 3. Set Leave Applications
      const leaves = Array.isArray(leavesData) ? leavesData : (leavesData.data || leavesData.results || []);
      setLeaveApplications(leaves);

    } catch (error) {
      console.error('Error fetching admin report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers ---
  const handleRefresh = () => fetchData();
  const downloadPDF = () => alert('PDF export feature coming soon!');
  const downloadExcel = () => alert('Excel export feature coming soon!');

  // --- Individual Employee Logic ---
  const selectedEmployee = employees.find(emp => emp.id.toString() === selectedEmployeeId);
  const individualLeaves = leaveApplications.filter(app => 
    (app.employee?.id?.toString() === selectedEmployeeId) || (app.employee_id?.toString() === selectedEmployeeId)
  );

  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Section */}
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
            <h1 className="text-5xl font-black text-slate-900 mb-3">Admin Reports</h1>
            <p className="text-slate-600 text-lg">System-wide analytics and individual employee tracking</p>
          </div>

          {/* Controls Bar - Always Visible */}
          <div className="mb-8 flex gap-4 flex-wrap items-end bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Report Category</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700"
              >
                <option value="applications">Leave Applications</option>
                <option value="individual">Individual Employee Stats</option>
                <option value="summary">Summary Report</option>
                <option value="employees">All Employees</option>
                <option value="department">Department Statistics</option>
              </select>
            </div>

            {/* Sub-Selector for Employee Stats */}
            {reportType === 'individual' && (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Select Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700"
                >
                  <option value="">-- Select Name --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 ml-auto">
              <button onClick={handleRefresh} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors">Refresh</button>
              <button onClick={downloadPDF} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors">PDF</button>
              <button onClick={downloadExcel} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors">Excel</button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* --- 1. Individual Employee View --- */}
              {reportType === 'individual' && (
                selectedEmployee ? (
                  <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 p-10 text-white">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-4xl font-black mb-2">{selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
                          <p className="text-slate-400 font-medium">{selectedEmployee.email} • {selectedEmployee.department || 'General'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-500 uppercase">Position</p>
                          <p className="text-xl font-bold text-blue-400">{selectedEmployee.position || 'Employee'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-slate-100">
                      <div className="p-8 border-r border-slate-100 flex flex-col items-center">
                        <p className="text-xs font-black text-slate-400 uppercase mb-1">Total Requests</p>
                        <p className="text-5xl font-black text-slate-900">{individualLeaves.length}</p>
                      </div>
                      <div className="p-8 border-r border-slate-100 flex flex-col items-center">
                        <p className="text-xs font-black text-slate-400 uppercase mb-1">Approved</p>
                        <p className="text-5xl font-black text-green-600">{individualLeaves.filter(l => l.status === 'approved').length}</p>
                      </div>
                      <div className="p-8 flex flex-col items-center">
                        <p className="text-xs font-black text-slate-400 uppercase mb-1">Pending</p>
                        <p className="text-5xl font-black text-yellow-500">{individualLeaves.filter(l => l.status === 'pending').length}</p>
                      </div>
                    </div>

                    <div className="p-8 bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Request Timeline</h3>
                      <div className="space-y-3">
                        {individualLeaves.map((l, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                            <div>
                              <p className="font-bold text-slate-800">{l.leave_type?.name || 'Leave'}</p>
                              <p className="text-xs text-slate-500">{l.start_date} to {l.end_date}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${l.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {l.status}
                            </span>
                          </div>
                        ))}
                        {individualLeaves.length === 0 && <p className="text-slate-400 italic text-center py-10">No records found for this employee.</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 text-xl font-medium">Please select an employee from the dropdown to generate statistics.</p>
                  </div>
                )
              )}

              {/* --- 2. Summary Report View --- */}
              {reportType === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard label="Total Applications" value={statistics.totalApplications} />
                  <StatCard label="Approved" value={statistics.approvedApplications} color="text-green-600" />
                  <StatCard label="Rejected" value={statistics.rejectedApplications} color="text-red-600" />
                  <StatCard label="Pending" value={statistics.pendingApplications} color="text-yellow-600" />
                </div>
              )}

              {/* --- 3. Full Applications Table --- */}
              {reportType === 'applications' && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase">Employee</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase">Leave Type</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase">Dates</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveApplications.map((app, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm font-bold text-slate-900">
                              {app.employee?.first_name} {app.employee?.last_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {app.leave_type?.name || app.leave_type || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {app.start_date}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {app.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Add more conditions for 'employees' and 'department' views as needed */}

            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}

// Reusable Stat Card Component
function StatCard({ label, value, color = "text-slate-900" }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-4xl font-black mt-2 ${color}`}>{value}</p>
    </div>
  );
}