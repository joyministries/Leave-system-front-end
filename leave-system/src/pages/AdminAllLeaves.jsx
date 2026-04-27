// src/pages/AdminAllLeaves.jsx
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/alerthook';
import { listLeaves, downloadLeaveDocument } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  APPROVED: 'bg-green-100  text-green-800  border border-green-200',
  REJECTED: 'bg-red-100    text-red-800    border border-red-200',
  CANCELLED: 'bg-slate-100  text-slate-600  border border-slate-200',
};

// Build the year range: 3 years back → 1 year forward
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilterBar({ month, year, status, search, onMonthChange, onYearChange, onStatusChange, onSearchChange, onReset }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
      {/* Month */}
      <div className="flex flex-col gap-1 min-w-[130px]">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</label>
        <select
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Months</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {/* Year */}
      <div className="flex flex-col gap-1 min-w-[100px]">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Year</label>
        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Employee name, email, leave type…"
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        Reset
      </button>
    </div>
  );
}

function Pagination({ page, totalPages, totalCount, onPrev, onNext, onPage }) {
  if (totalPages <= 1) return null;

  // Show a sliding window of up to 5 page buttons
  const window = 2;
  let start = Math.max(1, page - window);
  let end = Math.min(totalPages, page + window);
  if (end - start < 4) {
    if (start === 1) end = Math.min(totalPages, start + 4);
    else start = Math.max(1, end - 4);
  }
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
      <p className="text-sm text-slate-500">
        Showing page <span className="font-semibold text-slate-800">{page}</span> of{' '}
        <span className="font-semibold text-slate-800">{totalPages}</span>{' '}
        &mdash; <span className="font-semibold text-slate-800">{totalCount}</span> total records
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>

        {start > 1 && (
          <>
            <button onClick={() => onPage(1)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">1</button>
            {start > 2 && <span className="px-1 text-slate-400">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${p === page
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 border border-slate-300'
              }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
            <button onClick={() => onPage(totalPages)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">{totalPages}</button>
          </>
        )}

        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAllLeaves() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showError } = useAlert();

  // Filters
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));  // 1-based
  const [year, setYear] = useState(String(now.getFullYear()));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Data
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query params understood by the backend /leaves/ endpoint
      const params = {
        page,
        page_size: PAGE_SIZE,
      };
      if (status) params.status = status;
      if (search) params.search = search;

      const res = await listLeaves(params);
      const data = res.data;

      const raw = Array.isArray(data) ? data : data.results || [];
      const count = data.count ?? raw.length;

      const filtered = raw.filter((leave) => {
        if (!leave.start_date) return true;
        const d = new Date(leave.start_date);
        const monthMatch = month ? d.getMonth() + 1 === Number(month) : true;
        const yearMatch = year ? d.getFullYear() === Number(year) : true;
        return monthMatch && yearMatch;
      });

      setLeaves(filtered);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch (err) {
      console.error('Error fetching leaves:', err);
      showError('Failed to load leave records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, status, search, month, year, showError]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [month, year, status, search]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  // ── Document handler ─────────────────────────────────────────────────────

  const handleViewDocument = async (leaveId) => {
    try {
      const response = await downloadLeaveDocument(leaveId);
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url; a.download = 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch {
      showError('Failed to open document. Please try again.');
    }
  };

  // ── Reset filters ────────────────────────────────────────────────────────

  const handleReset = () => {
    setMonth(String(now.getMonth() + 1));
    setYear(String(now.getFullYear()));
    setStatus('');
    setSearch('');
    setPage(1);
  };

  // ── Derived label for current view ───────────────────────────────────────

  const viewLabel = month
    ? `${MONTHS[Number(month) - 1]} ${year}`
    : `All of ${year}`;

  // ─────────────────────────────────────────────────────────────────────────

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

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black text-slate-900 mb-1">All Leave Requests</h1>
                <p className="text-slate-500 text-sm">
                  Showing records for <span className="font-semibold text-slate-700">{viewLabel}</span>
                  {status && <> &mdash; status: <span className="font-semibold text-slate-700">{status}</span></>}
                </p>
              </div>

              {/* Summary chips */}
              <div className="flex gap-2 flex-wrap">
                {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(prev => prev === s ? '' : s)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${status === s
                        ? STATUS_STYLES[s] + ' ring-2 ring-offset-1 ring-slate-400'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <FilterBar
            month={month} year={year} status={status} search={search}
            onMonthChange={setMonth}
            onYearChange={setYear}
            onStatusChange={setStatus}
            onSearchChange={setSearch}
            onReset={handleReset}
          />

          {/* Table */}
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 flex items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-slate-500 font-medium">Loading leave records…</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
              <svg className="w-14 h-14 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No records found</h3>
              <p className="text-slate-400 text-sm">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Status', 'Document'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaves.map((leave) => {
                        const statusKey = (leave.status || '').toUpperCase();
                        return (
                          <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                            {/* Employee */}
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900 text-sm">
                                {leave.employee_name || leave.employee_email || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {leave.institution_name || ''}
                              </p>
                            </td>

                            {/* Leave Type */}
                            <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                              {leave.leave_type_name || leave.leave_type || '—'}
                            </td>

                            {/* From */}
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {fmt(leave.start_date)}
                            </td>

                            {/* To */}
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {fmt(leave.end_date)}
                            </td>

                            {/* Days */}
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className="font-semibold text-slate-800">
                                {leave.leave_duration ?? '—'}
                              </span>
                              {leave.extra_unpaid_days > 0 && (
                                <span className="ml-1 text-xs text-orange-500 font-medium">
                                  (+{leave.extra_unpaid_days} unpaid)
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[statusKey] ?? 'bg-slate-100 text-slate-600'}`}>
                                {leave.status || '—'}
                              </span>
                            </td>

                            {/* Document */}
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {leave.supporting_document ? (
                                <button
                                  onClick={() => handleViewDocument(leave.id)}
                                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                                >
                                  View
                                </button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <Pagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                onPage={setPage}
              />
            </>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
