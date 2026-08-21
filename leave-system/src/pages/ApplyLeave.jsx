import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProtectedLayout from '../components/ProtectedLayout';
import { useAlert } from '../hooks/alerthook';
import { useAuth } from '../hooks/authhook';
import { applyLeave, getLeaveTypes, getInstitutions } from '../services/ApiClient';
import { MdOutlineUploadFile, MdOutlineInfo, MdOutlineEventNote } from 'react-icons/md';

export default function ApplyLeave() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useAlert();

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    leaveTypeName: '',
    allowedMonths: [], // array of integers e.g. [1, 6, 12]
    startDate: location.state?.startDate || '',
    endDate: location.state?.endDate || location.state?.startDate || '',
    reason: '',
    document: null,
  });

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedTypeMaxDays, setSelectedTypeMaxDays] = useState(null);
  const [selectedTypeMaxDuration, setSelectedTypeMaxDuration] = useState(null);
  const [daysRequested, setDaysRequested] = useState(0);
  const [exceedsLimit, setExceedsLimit] = useState(false);
  const [exceedsDuration, setExceedsDuration] = useState(false);
  const [unpaidLeaveDays, setUnpaidLeaveDays] = useState(0);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for location state passed from calendar navigation
  useEffect(() => {
    if (location.state?.startDate) {
      const s = location.state.startDate;
      const e = location.state.endDate || s;
      setFormData((prev) => ({
        ...prev,
        startDate: s,
        endDate: e,
      }));
      setDaysRequested(calculateDays(s, e));
    }
  }, [location.state]);

  // Helper: Check if leave type requires document
  const requiresDocument = (typeName) => {
    const name = (typeName || '').toLowerCase();
    return name.includes('sick') || name.includes('study');
  };

  // Helper: Get document label for leave type
  const getDocumentLabel = (typeName) => {
    const name = (typeName || '').toLowerCase();
    if (name.includes('sick')) return 'Medical Certificate';
    if (name.includes('study')) return 'Supporting Document';
    return 'Supporting Document';
  };

  // Get today's date in YYYY-MM-DD format for min date validation
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate days between dates
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      return days > 0 ? days : 0;
    } catch {
      return 0;
    }
  };

  // Fetch leave types on mount
  useEffect(() => {
    const fetchTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const [typesRes, institutionsRes] = await Promise.allSettled([
          getLeaveTypes(),
          getInstitutions(),
        ]);

        let allTypes = [];
        if (typesRes.status === 'fulfilled') {
          const d = typesRes.value;
          allTypes = Array.isArray(d) ? d : d.results || [];
        }

        let typesArray = allTypes;

        // Filter by branch/institution allowed leave types if employee belongs to a branch
        if (
          institutionsRes.status === 'fulfilled' &&
          user &&
          (user.institution || user.institution_id || user.institution_name || user.branch)
        ) {
          const instData = institutionsRes.value?.data?.results || institutionsRes.value?.data || [];
          const instList = Array.isArray(instData) ? instData : [];

          const userInst = instList.find(
            (i) =>
              String(i.id) === String(user.institution) ||
              String(i.id) === String(user.institution_id) ||
              String(i.id) === String(user.branch) ||
              i.name === user.institution ||
              i.name === user.institution_name
          );

          if (userInst) {
            const rawAllowed = Array.isArray(userInst.leave_types)
              ? userInst.leave_types
              : Array.isArray(userInst.allowed_leave_types)
              ? userInst.allowed_leave_types
              : null;

            if (Array.isArray(rawAllowed)) {
              if (rawAllowed.length === 0) {
                typesArray = [];
              } else {
                const allowedIds = rawAllowed.map((lt) =>
                  typeof lt === 'object' && lt !== null ? (lt.id ?? lt.name) : lt
                );
                typesArray = allTypes.filter((t) =>
                  allowedIds.some((id) => String(id) === String(t.id) || String(id) === String(t.name))
                );
              }
            }
          }
        }

        if (typesArray.length > 0) {
          setLeaveTypes(typesArray);

          // Set initial selection
          const initialPolicy = typesArray[0];
          setSelectedTypeMaxDays(initialPolicy.max_days);
          setSelectedTypeMaxDuration(initialPolicy.max_duration || initialPolicy.max_days);
          setFormData((prev) => ({
            ...prev,
            leaveTypeId: initialPolicy.id,
            leaveTypeName: initialPolicy.name,
            allowedMonths: Array.isArray(initialPolicy.allowed_months)
              ? initialPolicy.allowed_months
              : [],
          }));
        } else {
          setLeaveTypes([]);
          if (allTypes.length > 0) {
            showWarning('No leave types are currently allowed for your branch. Please contact an administrator.');
          } else {
            showError('No leave types found.');
          }
        }
      } catch (error) {
        console.error('Error fetching leave types:', error);
        showError('Failed to load leave types. Please refresh the page or contact support.');
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchTypes();
  }, [user, showError, showWarning]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (name === 'leaveType') {
      const selectedType = leaveTypes.find((t) => String(t.id) === String(value));
      if (selectedType) {
        const isDocReq = requiresDocument(selectedType.name);
        setFormData((prev) => ({
          ...prev,
          leaveTypeId: selectedType.id,
          leaveTypeName: selectedType.name,
          allowedMonths: Array.isArray(selectedType.allowed_months)
            ? selectedType.allowed_months
            : [],
          document: isDocReq ? prev.document : null,
        }));
        setSelectedTypeMaxDays(selectedType.max_days);
        setSelectedTypeMaxDuration(selectedType.max_duration || selectedType.max_days);
      }
    } else if (name === 'startDate' || name === 'endDate') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      const newStart = name === 'startDate' ? value : formData.startDate;
      const newEnd = name === 'endDate' ? value : formData.endDate;
      const days = calculateDays(newStart, newEnd);
      setDaysRequested(days);

      if (selectedTypeMaxDuration && days > selectedTypeMaxDuration) {
        setExceedsDuration(true);
      } else {
        setExceedsDuration(false);
      }

      if (selectedTypeMaxDays && days > selectedTypeMaxDays) {
        setExceedsLimit(true);
        setUnpaidLeaveDays(days - selectedTypeMaxDays);
      } else {
        setExceedsLimit(false);
        setUnpaidLeaveDays(0);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'file' ? files[0] : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.leaveTypeId) {
      showError('Please select a valid leave type.');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      showError('Please provide both a start date and an end date.');
      return;
    }

    if (daysRequested === 0) {
      showError('Please select valid start and end dates.');
      return;
    }

    const leaveTypeName = formData.leaveTypeName || '';

    // Check if document is required
    if (requiresDocument(leaveTypeName) && !formData.document) {
      showWarning(`Please upload a ${getDocumentLabel(leaveTypeName).toLowerCase()} for ${leaveTypeName}`);
      return;
    }

    // Check allowed months rule
    if (formData.allowedMonths && formData.allowedMonths.length > 0) {
      const startMonth = new Date(formData.startDate).getMonth() + 1;
      const endMonth = new Date(formData.endDate).getMonth() + 1;

      const monthNames = formData.allowedMonths
        .map((m) => new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' }))
        .join(', ');

      if (!formData.allowedMonths.includes(startMonth)) {
        showError(
          `The start date must fall in one of the allowed month(s) for ${formData.leaveTypeName}: ${monthNames}. ` +
            `You can apply now, but please choose a start date in ${monthNames}.`
        );
        return;
      }

      if (!formData.allowedMonths.includes(endMonth)) {
        showError(
          `The end date must also fall within the allowed month(s) for ${formData.leaveTypeName}: ${monthNames}.`
        );
        return;
      }
    }

    if (!formData.reason.trim()) {
      showWarning('Please provide a reason for your leave request.');
      return;
    }

    try {
      setIsSubmitting(true);

      const submissionData = {
        leave_type: formData.leaveTypeId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        reason: formData.reason.trim(),
        document: formData.document,
      };

      await applyLeave(submissionData);

      let successMessage = 'Leave request submitted for review! The administrator or HR will review your request shortly.';
      if (unpaidLeaveDays > 0) {
        successMessage += ` ⚠️ Note: ${unpaidLeaveDays} day${unpaidLeaveDays !== 1 ? 's' : ''} of this request will be marked as UNPAID LEAVE.`;
      }
      showSuccess(successMessage);

      // Navigate to My Requests
      navigate('/my-requests');
    } catch (error) {
      console.error('Error applying for leave:', error);
      let errorMessage = 'Failed to submit leave request. Please try again.';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const msg = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${msg}`;
            })
            .join(' | ');
          errorMessage = fieldErrors || errorMessage;
        }
      }
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = leaveTypes.find((t) => String(t.id) === String(formData.leaveTypeId));

  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="max-w-3xl mx-auto pb-12">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Apply for Leave</h1>
          <p className="text-slate-500 text-sm mt-1">
            Submit a new leave request for administrative review and approval
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {isLoadingTypes ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm font-medium">Loading leave categories...</p>
            </div>
          ) : leaveTypes.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-600 mb-4">
                <MdOutlineInfo className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Leave Types Available</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                There are no leave types currently configured or allowed for your branch. Please contact your system administrator.
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Leave Type Select */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="leaveType"
                  value={formData.leaveTypeId || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-slate-900 cursor-pointer"
                  required
                >
                  <option value="">Select a leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.max_days ? `(${type.max_days} days max/yr)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Policy Summary Banner - Positioned prominently at top for small & large screens */}
              {selectedType && (
                <div className="p-4 sm:p-5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <MdOutlineEventNote className="text-xl text-blue-700 shrink-0" />
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Policy Summary: <span className="text-blue-700">{selectedType.name}</span>
                    </h3>
                  </div>

                  <div className={`grid ${requiresDocument(selectedType.name) ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-2.5 sm:gap-3 text-xs sm:text-sm`}>
                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-xs">
                      <span className="text-slate-500 text-xs block mb-0.5">Yearly Limit</span>
                      <span className="font-bold text-blue-900 text-sm">
                        {selectedType.max_days ? `${selectedType.max_days} days` : 'Unlimited'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-xs">
                      <span className="text-slate-500 text-xs block mb-0.5">Max per Request</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedType.max_duration ? `${selectedType.max_duration} days` : (selectedType.max_days ? `${selectedType.max_days} days` : 'Unlimited')}
                      </span>
                    </div>

                    {requiresDocument(selectedType.name) && (
                      <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-xs col-span-2 sm:col-span-1">
                        <span className="text-slate-500 text-xs block mb-0.5">Supporting Document</span>
                        <span className="font-bold text-sm text-amber-700">Required</span>
                      </div>
                    )}
                  </div>

                  {/* Allowed Months Warning / Guidance */}
                  {formData.allowedMonths && formData.allowedMonths.length > 0 && (() => {
                    const monthNames = formData.allowedMonths
                      .map((m) => new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' }))
                      .join(', ');
                    const currentMonth = new Date().getMonth() + 1;
                    const isCurrentMonthAllowed = formData.allowedMonths.includes(currentMonth);

                    return (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5">
                          <span>📅 Permitted Application Window:</span>
                          <span className="font-bold underline">{monthNames}</span>
                        </p>
                        {!isCurrentMonthAllowed ? (
                          <p className="text-amber-700 text-xs">
                            💡 You may submit your application in advance today — simply select dates that start in {monthNames}.
                          </p>
                        ) : (
                          <p className="text-green-700 text-xs font-medium">
                            ✓ Currently within the allowed application period.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Dates Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      min={formData.startDate || undefined}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-slate-900"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Duration & Limit Warnings Card */}
              {daysRequested > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">Total Requested Duration:</span>
                    <span className="text-sm sm:text-base font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      {daysRequested} day{daysRequested !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {exceedsDuration && (
                    <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      ⚠️ Requested duration exceeds maximum limit of {selectedTypeMaxDuration} days per single request.
                    </p>
                  )}

                  {exceedsLimit && (
                    <div className="text-xs text-rose-700 font-medium bg-rose-50 border border-rose-200 rounded-lg p-2.5 space-y-1">
                      <p className="font-bold">⚠️ Exceeds Annual Paid Limit</p>
                      <p>
                        Your request exceeds the yearly limit of {selectedTypeMaxDays} days. The excess {unpaidLeaveDays} day{unpaidLeaveDays !== 1 ? 's' : ''} will be categorized as <span className="font-bold underline">UNPAID LEAVE</span>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Reason for Leave <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Describe the reason for your leave request in detail..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm text-slate-900 resize-y"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Please provide sufficient detail for administrative review.</p>
              </div>

              {/* Supporting Document Upload - Only rendered for Sick Leave and Study Leave */}
              {requiresDocument(formData.leaveTypeName) && (
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    {getDocumentLabel(formData.leaveTypeName)} <span className="text-red-500">* (Required)</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 sm:p-6 text-center transition-colors bg-slate-50">
                    <input
                      type="file"
                      name="document"
                      id="supporting-document-upload"
                      onChange={handleChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      required
                    />
                    <label
                      htmlFor="supporting-document-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                        <MdOutlineUploadFile className="text-xl" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {formData.document ? formData.document.name : 'Click to upload or drag & drop'}
                      </span>
                      <span className="text-xs text-slate-400">PDF, PNG, JPG, or DOCX (Max 5MB)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Actions - Equal Width Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 bg-slate-900 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <span>Submit Leave Request</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3.5 px-6 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold rounded-xl transition-colors text-sm sm:text-base flex items-center justify-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
