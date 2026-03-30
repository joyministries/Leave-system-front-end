import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getReports, getEmployees, listLeaves, getDepartmentReports, getEmployeeLeaveSummary } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';
import { LeaveSummaryCard } from '../components/LeaveSummaryCard';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


export default function AdminReports() {
  const location = useLocation();
  const navigate = useNavigate();

  // State Management
  const [reportType, setReportType] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  
  // Optmized Individual Fetching States
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Paginated Leave States
  const [individualLeaves, setIndividualLeaves] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [individualEmployeeSummary, setIndividualEmployeeSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [reports, setReports] = useState({
    totalApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    pendingApplications: 0,
    departmentStats: [],
  });

  // 1. Fetch Summary Data
  const fetchSummaryData = async () => {
    try {
      setIsLoading(true);
      const [globalResponse, deptResponse] = await Promise.all( [
        getReports(),
        getDepartmentReports()
      ]);
      const globalReports = globalResponse.data;
      const deptReports = deptResponse.data;

      console.log('Global Reports:', globalReports);
      console.log('Department Reports:', deptReports);
      const deptMap = [];

      Object.entries(deptReports).forEach(([inst, depts]) => {
        Object.entries(depts).forEach(([dept, leaves]) => {
          deptMap.push({
            institution: inst,
            department: dept,
            employees: leaves.length
          });
        })
      })
      setReports({
        totalApplications: globalReports.total_applications || 0,
        approvedApplications: globalReports.approved || 0,
        rejectedApplications: globalReports.rejected || 0,
        pendingApplications: globalReports.pending || 0,
        departmentStats: deptMap,
        report_data: deptReports
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, []);

  // 2. Optimum Smart Search for Employees (Avoid Bulk Loading)
  useEffect(() => {
    if (employeeSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Simulate debounced search (In production, hit /api/employees/?search=term)
    const timeoutId = setTimeout(async () => {
      try {
        console.log('Searching for employees with term:', employeeSearch);
        const res = await getEmployees({ search: employeeSearch });
        console.log('Search results:', res);
        const results = Array.isArray(res.data) ? res.data : res.data.results || [];
        console.log('Parsed search results:', results);
        // Keep to max 5 results for clean UI
        setSearchResults(results.slice(0, 5));
      } catch (error) {
        console.error('Search error', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [employeeSearch]);

  // 3. Paginated Fetch for Individual User Records
  const fetchIndividualLeaves = async (employeeId, pageNum = 1) => {
    try {
      console.log(`Fetching leaves for employee ${employeeId} - Page ${pageNum}`);
      // Passes employee_id and page to utilize backend optimization
      const res = await listLeaves({ employee: employeeId, page: pageNum });
      console.log('Paginated leaves response:', res);
      const rawData = res.data;
      console.log('Individual leaves data:', rawData);

      let leavesArray = [];
      let hasNextPage = false;

      if (rawData.results) {
        leavesArray = rawData.results;
        hasNextPage = !!rawData.next;
      } else if (Array.isArray(rawData)) {
        leavesArray = rawData;
        hasNextPage = false;
      }

      console.log('Processed leaves array:', leavesArray);
      setIndividualLeaves(leavesArray);
      setHasNext(hasNextPage);
      setCurrentPage(pageNum);
    } catch (error) {
      console.error('Failed to load employee leaves', error);
      setIndividualLeaves([]);
      setHasNext(false);
    }
  };

  const selectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setEmployeeSearch('');
    setSearchResults([]);
    setIndividualLeaves([]); // Reset leaves
    setIndividualEmployeeSummary(null); // Reset summary
    setCurrentPage(1); // Reset pagination
    fetchIndividualLeaves(emp.id, 1);
    // Fetch leave summary for selected employee
    fetchEmployeeLeaveSummary(emp.id);
  };

  // Fetch Employee Leave Summary
  const fetchEmployeeLeaveSummary = async (employeeId) => {
    try {
      setIsSummaryLoading(true);
      console.log(`Fetching leave summary for employee ${employeeId}`);
      // Fetch all leaves to calculate summary by leave type
      const res = await getEmployeeLeaveSummary(employeeId);
      console.log('Employee leave summary response:', res);
      const summary = res.data;
      
      setIndividualEmployeeSummary(summary);
      console.log('Calculated employee leave summary:', summary);
    } catch (error) {
      console.error('Failed to load employee leave summary', error);
      setIndividualEmployeeSummary([]);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const downloadPDFReport = () => {
    if (!reports.report_data) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const timestamp = new Date().toLocaleString();

    doc.setFontSize(22);
    doc.text("Team Impact University: Leave Report", 14, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on: ${timestamp}`, 14, 32);

    let finalY = 40;

    // 1. Institutions
    Object.entries(reports.report_data).forEach(([inst, depts]) => {
      doc.setFontSize(16);
      doc.setTextColor(50, 100, 200);
      doc.text(inst, 14, finalY);
      finalY += 8;

      // 2. DEPARTMENT LOOP

      Object.entries(depts).forEach(([dept, leaves]) => {
        doc.setFontSize(14);
        doc.text(`Department: ${dept}`, 20, finalY + 5);

        autoTable(doc, {
          startY: finalY + 10,
          head: [['Employee', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Status']],
          body: leaves.map(l => [
            l.employee || 'N/A',
            l.leave_type_name || l.leave_type || 'N/A',
            l.start_date || 'N/A',
            l.end_date || 'N/A',
            l.duration ? `${l.duration} days` : 'N/A',
            l.status || 'N/A'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [50, 100, 200] },
        })
        finalY = doc.lastAutoTable.finalY + 10;
      })

      doc.save(`Leave_Report_${inst.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
    });
  };

  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-10">
              <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Dashboard
              </button>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-3">Admin Reports</h1>
            <p className="text-slate-600 text-lg">System-wide analytics and individual employee tracking</p>
          </div>

          {/* Controls Bar */}
          <div className="mb-8 flex gap-4 flex-wrap items-end bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Report Category</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="summary">Summary Report</option>
                <option value="individual">Individual Employee Timeline</option>
              </select>
            </div>

            {reportType === 'individual' && (
              <div className="flex flex-col gap-2 relative">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Search Employee</label>
                <input
                  type="text"
                  placeholder="Type name or email..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="px-4 py-2 w-64 bg-blue-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-blue-900"
                />
                
                {/* Search Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="absolute top-[100%] mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg z-50 overflow-hidden">
                    {searchResults.map(emp => (
                      <div 
                        key={emp.id} 
                        onClick={() => selectEmployee(emp)}
                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        <p className="text-sm font-bold text-slate-900">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-slate-500">{emp.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 ml-auto">
                <button 
                  onClick={() => downloadPDFReport()} 
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Full PDF Report
                </button>     
                </div>
          </div>

          {isLoading ? (
            <p className="text-center font-bold text-slate-400 py-12">Loading Insights...</p>
          ) : (
            <div className="space-y-6">
              
              {/* Summary View */}
              {reportType === 'summary' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard label="Total Applications" value={reports.totalApplications} />
                        <StatCard label="Approved" value={reports.approvedApplications} color="text-green-600" />
                        <StatCard label="Rejected" value={reports.rejectedApplications} color="text-red-600" />
                        <StatCard label="Pending" value={reports.pendingApplications} color="text-yellow-600" />
                    </div>
                </>
              )}

              {/* Individual Employee Paginated View */}
              {reportType === 'individual' && (
                selectedEmployee ? (
                  <div className="space-y-6">
                    {/* Employee Header */}
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-900 p-8 text-white flex justify-between">
                          <div>
                            <h2 className="text-3xl font-black mb-1">{selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
                            <p className="text-slate-400 text-sm">{selectedEmployee.email}</p>
                          </div>
                      </div>
                    </div>

                    {/* Leave Summary Section */}
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Leave Balance Summary</h3>
                      {isSummaryLoading ? (
                        <div className="bg-slate-50 rounded-lg p-8 text-center border border-dashed border-slate-300">
                          <p className="text-slate-500">Loading leave summary...</p>
                        </div>
                      ) : individualEmployeeSummary ? (
                        <LeaveSummaryCard summary={individualEmployeeSummary} />
                      ) : (
                        <div className="bg-slate-50 rounded-lg p-8 text-center border border-dashed border-slate-300">
                          <p className="text-slate-500">No leave summary available</p>
                        </div>
                      )}
                    </div>

                    {/* Leave History Section */}
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                      <div className="p-8 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">Paginated Leave History</h3>
                      </div>

                      <div className="p-8">
                        <div className="space-y-3">
                          {individualLeaves && individualLeaves.length > 0 ? (
                            individualLeaves.map((l, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                  <p className="font-bold text-slate-800">{l.leave_type_name || 'Leave'}</p>
                                  <p className="text-xs text-slate-500">{l.start_date} to {l.end_date}</p>
                                </div>
                                {l.extra_unpaid_days > 0 && (
                                  <span className="text-xs font-bold text-red-600">{l.extra_unpaid_days} Unpaid Day{l.extra_unpaid_days !== 1 ? 's' : ''}</span>
                                )}
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${l.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : l.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {l.status}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="bg-slate-50 rounded-lg p-6 text-center border border-dashed border-slate-300">
                              <p className="text-slate-500 text-sm">No leave records found for this employee</p>
                            </div>
                          )}
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex gap-2 mt-6 justify-center">
                          <button 
                              disabled={currentPage === 1}
                              onClick={() => fetchIndividualLeaves(selectedEmployee.employee, currentPage - 1)}
                              className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-bold disabled:opacity-50 hover:bg-slate-50"
                          >
                              Previous
                          </button>
                          <span className="px-4 py-2 text-sm font-bold text-slate-500">Page {currentPage}</span>
                          <button 
                              disabled={!hasNext}
                              onClick={() => fetchIndividualLeaves(selectedEmployee.employee, currentPage + 1)}
                              className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-bold disabled:opacity-50 hover:bg-slate-50"
                          >
                              Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 text-xl font-medium">Search and select an employee above.</p>
                  </div>
                )
              )}

            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}

function StatCard({ label, value, color = "text-slate-900" }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-4xl font-black mt-2 ${color}`}>{value}</p>
    </div>
  );
}