//src/pages/AdminManageLeaves.jsx
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/alerthook';
import { getLeaveTypes, updateLeaveType, deleteLeaveType, createLeaveType, toggleLeaveTypeActive } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

const MONTHS = [
    { value: 1,  label: 'Jan', full: 'January' },
    { value: 2,  label: 'Feb', full: 'February' },
    { value: 3,  label: 'Mar', full: 'March' },
    { value: 4,  label: 'Apr', full: 'April' },
    { value: 5,  label: 'May', full: 'May' },
    { value: 6,  label: 'Jun', full: 'June' },
    { value: 7,  label: 'Jul', full: 'July' },
    { value: 8,  label: 'Aug', full: 'August' },
    { value: 9,  label: 'Sep', full: 'September' },
    { value: 10, label: 'Oct', full: 'October' },
    { value: 11, label: 'Nov', full: 'November' },
    { value: 12, label: 'Dec', full: 'December' },
];

function MonthPicker({ selected, onChange }) {
    const toggle = (month) => {
        if (selected.includes(month)) {
            onChange(selected.filter(m => m !== month));
        } else {
            onChange([...selected, month].sort((a, b) => a - b));
        }
    };

    const selectAll = () => onChange(MONTHS.map(m => m.value));
    const clearAll  = () => onChange([]);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                    Allowed Months
                    <span className="ml-1 text-slate-400 font-normal">(Optional — leave empty for year-round)</span>
                </label>
                <div className="flex gap-3 text-xs">
                    <button type="button" onClick={selectAll}
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                        Select all
                    </button>
                    <button type="button" onClick={clearAll}
                        className="text-slate-500 hover:text-slate-700 font-medium transition-colors">
                        Clear
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {MONTHS.map(({ value, label, full }) => {
                    const active = selected.includes(value);
                    return (
                        <button
                            key={value}
                            type="button"
                            title={full}
                            onClick={() => toggle(value)}
                            className={`
                                py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-150 select-none
                                ${active
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                                }
                            `}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {selected.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                    Selected: <span className="font-medium text-blue-700">
                        {selected.map(m => MONTHS[m - 1].full).join(', ')}
                    </span>
                </p>
            )}
            {selected.length === 0 && (
                <p className="mt-2 text-xs text-slate-400 italic">
                    No restriction — available year-round.
                </p>
            )}
        </div>
    );
}

function AllowedMonthsBadges({ months }) {
    if (!months || months.length === 0) {
        return <span className="text-xs text-slate-400 italic">Year-round</span>;
    }
    return (
        <div className="flex flex-wrap gap-1">
            {months.map(m => (
                <span key={m}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {MONTHS[m - 1]?.full ?? m}
                </span>
            ))}
        </div>
    );
}

export default function AdminManageLeaves() {
    const location  = useLocation();
    const navigate  = useNavigate();
    const { showSuccess, showError } = useAlert();

    const [leaveTypes,    setLeaveTypes]    = useState([]);
    const [isLoading,     setIsLoading]     = useState(true);
    const [showForm,      setShowForm]      = useState(false);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [editingId,     setEditingId]     = useState(null);

    const [formData, setFormData] = useState({
        name:           '',
        max_days:       '',
        is_active:      true,
        allowed_months: [],   // array of month numbers, e.g. [1, 6, 12]
    });

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchLeaveTypes = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getLeaveTypes();
            setLeaveTypes(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching leave types:', error);
            showError('Failed to load leave types. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    useEffect(() => { fetchLeaveTypes(); }, [fetchLeaveTypes]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({ name: '', max_days: '', is_active: true, allowed_months: [] });
        setEditingId(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            showError('Leave type name is required');
            return;
        }
        if (!formData.max_days || formData.max_days <= 0) {
            showError('Maximum days must be greater than 0');
            return;
        }

        // Send null when no months are selected (means year-round)
        const allowed_months = formData.allowed_months.length > 0
            ? formData.allowed_months
            : null;

        try {
            setIsFormLoading(true);

            if (editingId) {
                await updateLeaveType(editingId, {
                    name:           formData.name.trim(),
                    max_days:       parseInt(formData.max_days),
                    is_active:      formData.is_active,
                    allowed_months,
                });
                showSuccess('Leave type updated successfully!');
            } else {
                await createLeaveType({
                    name:           formData.name.trim(),
                    max_days:       parseInt(formData.max_days),
                    is_active:      formData.is_active,
                    allowed_months,
                });
                showSuccess('Leave type created successfully!');
            }

            await fetchLeaveTypes();
            resetForm();
        } catch (error) {
            console.error('Error saving leave type:', error);
            showError(error.message || 'Failed to save leave type. Please try again.');
        } finally {
            setIsFormLoading(false);
        }
    };

    const handleEdit = (leaveType) => {
        setFormData({
            name:           leaveType.name,
            max_days:       leaveType.max_days,
            is_active:      leaveType.is_active,
            allowed_months: Array.isArray(leaveType.allowed_months)
                ? leaveType.allowed_months
                : [],
        });
        setEditingId(leaveType.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this leave type? This action cannot be undone.')) {
            try {
                await deleteLeaveType(id);
                showSuccess('Leave type deleted successfully!');
                await fetchLeaveTypes();
            } catch (error) {
                console.error('Error deleting leave type:', error);
                showError(error.message || 'Failed to delete leave type. Please try again.');
            }
        }
    };

    const handleToggleActive = async (id) => {
        try {
            await toggleLeaveTypeActive(id);
            showSuccess('Leave type status updated successfully!');
            await fetchLeaveTypes();
        } catch (error) {
            console.error('Error toggling leave type status:', error);
            showError(error.message || 'Failed to update leave type status. Please try again.');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <ProtectedLayout currentPath={location.pathname}>
            <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
                <div className="max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 mb-2">Manage Leave Types</h1>
                                <p className="text-slate-600">
                                    Create, update, and manage leave types with maximum days allocation
                                </p>
                            </div>
                            {!showForm && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg"
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Leave Type
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Form ── */}
                    {showForm && (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">
                                {editingId ? 'Edit Leave Type' : 'Create New Leave Type'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Leave Type Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Leave Type Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Annual Leave, Sick Leave"
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    {/* Maximum Days */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Maximum Days *
                                        </label>
                                        <input
                                            type="number"
                                            name="max_days"
                                            value={formData.max_days}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 21"
                                            min="1"
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    {/* Active Status Toggle */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Status
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                                    formData.is_active ? 'bg-green-500' : 'bg-slate-300'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                                        formData.is_active ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                            <span className={`text-sm font-medium ${
                                                formData.is_active ? 'text-green-600' : 'text-slate-600'
                                            }`}>
                                                {formData.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Multi-Month Picker (full width) ── */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <MonthPicker
                                        selected={formData.allowed_months}
                                        onChange={(months) =>
                                            setFormData(prev => ({ ...prev, allowed_months: months }))
                                        }
                                    />
                                </div>

                                {/* Form Buttons */}
                                <div className="flex gap-4 pt-2">
                                    <button
                                        type="submit"
                                        disabled={isFormLoading}
                                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isFormLoading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </span>
                                        ) : (
                                            editingId ? 'Update Leave Type' : 'Create Leave Type'
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ── Leave Types List ── */}
                    {isLoading ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12">
                            <div className="flex items-center justify-center gap-3">
                                <svg className="animate-spin h-6 w-6 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-slate-600 font-medium">Loading leave types...</p>
                            </div>
                        </div>
                    ) : leaveTypes.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12">
                            <div className="text-center">
                                <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4" />
                                </svg>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">No Leave Types</h3>
                                <p className="text-slate-600">Create your first leave type to get started</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {leaveTypes.map((leaveType) => (
                                <div
                                    key={leaveType.id}
                                    className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    {/* Card Header */}
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                                        <h3 className="text-lg font-bold text-white mb-1">{leaveType.name}</h3>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4">
                                        <div className="mb-4">
                                            <div className="flex items-baseline gap-2 mb-3">
                                                <p className="text-3xl font-bold text-blue-600">{leaveType.max_days}</p>
                                                <p className="text-slate-600 text-sm">days/year</p>
                                            </div>

                                            {/* Allowed Months */}
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                                    Availability
                                                </p>
                                                <AllowedMonthsBadges months={leaveType.allowed_months} />
                                            </div>
                                        </div>

                                        {/* Card Footer - Actions */}
                                        <div className="flex gap-2 pt-4 border-t border-slate-200">
                                            <button
                                                onClick={() => handleEdit(leaveType)}
                                                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(leaveType.id)}
                                                className={`flex-1 px-3 py-2 font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 ${
                                                    leaveType.is_active
                                                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                                title={leaveType.is_active ? 'Click to deactivate' : 'Click to activate'}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                        d={leaveType.is_active
                                                            ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            : "M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m10-2a9 9 0 11-18 0 9 9 0 0118 0z"}
                                                    />
                                                </svg>
                                                {leaveType.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(leaveType.id)}
                                                className="flex-1 px-3 py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedLayout>
    );
}