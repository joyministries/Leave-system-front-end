import { useState, useEffect } from 'react';
import { useAlert } from '../hooks/alerthook';
import { applyLeave, getLeaveTypes } from '../services/ApiClient';

export default function ApplyLeaveModal({ isOpen, onClose, onSubmitSuccess }) {
  const [formData, setFormData] = useState({
    leaveTypeName: '',
    allowedMonth: '',
    startDate: '',
    endDate: '',
    reason: '',
    document: null,
  });

  const [leavetypes, setLeavetypes] = useState([]);
  const [selectedTypeMaxDays, setSelectedTypeMaxDays] = useState(null);
  const [selectedTypeMaxDuration, setSelectedTypeMaxDuration] = useState(null);
  const [daysRequested, setDaysRequested] = useState(0);
  const [exceedsLimit, setExceedsLimit] = useState(false);
  const [exceedsDuration, setExceedsDuration] = useState(false);
  const [unpaidLeaveDays, setUnpaidLeaveDays] = useState(0);
  const [isLoadingtypes, setIsLoadingtypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError, showWarning } = useAlert();

  // Helper: Check if leave type requires document
  const requiresDocument = (leaveTypeName) => {
    const name = (leaveTypeName || '').toLowerCase();
    return name.includes('sick') || name.includes('study');
  };

  // Helper: Get document label for leave type
  const getDocumentLabel = (leaveTypeName) => {
    const name = (leaveTypeName || '').toLowerCase();
    if (name.includes('sick')) {
      return 'Medical Certificate';
    }
    if (name.includes('study')) {
      return 'Supporting Document';
    }
    return 'Document';
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
    const fetchtypes = async () => {
      try {
        const data = await getLeaveTypes();
        const typesArray = Array.isArray(data) ? data : data.results || [];
        
        if (typesArray.length > 0) {
          setLeavetypes(typesArray);
          
          // Set initial max days and ID for first policy
          const initialPolicy = typesArray[0];
          setSelectedTypeMaxDays(initialPolicy.max_days);
          setSelectedTypeMaxDuration(initialPolicy.max_duration || initialPolicy.max_days);
          setFormData(prev => ({
            ...prev,
            leaveTypeId: initialPolicy.id,
            leaveTypeName: initialPolicy.name,
            allowedMonth: initialPolicy.allowed_month,
          }));
        } else {
          throw new Error('API returned empty types list');
        }
      } catch (error) {
        console.error('Error fetching leave types from API:', error);
        setLeavetypes([]);
        showError('Failed to load leave types. Please refresh the page or contact support.');
      } finally {
        setIsLoadingtypes(false);
      }
    };

    if (isOpen) {
      fetchtypes();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (name === 'leaveType') {
      // Find the type with matching ID
      const selectedType = leavetypes.find(t => String(t.id) === String(value));
      if (selectedType) {
        setFormData((prev) => ({
          ...prev,
          leaveTypeId: selectedType.id,
          leaveTypeName: selectedType.name,
          allowedMonth: selectedType.allowed_month,
        }));
        setSelectedTypeMaxDays(selectedType.max_days);
        setSelectedTypeMaxDuration(selectedType.max_duration || selectedType.max_days);
      }
    } else if (name === 'startDate' || name === 'endDate') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Recalculate days and validate
      const newStart = name === 'startDate' ? value : formData.startDate;
      const newEnd = name === 'endDate' ? value : formData.endDate;
      const days = calculateDays(newStart, newEnd);
      setDaysRequested(days);

      // Check if exceeds maximum duration per request
      if (selectedTypeMaxDuration && days > selectedTypeMaxDuration) {
        setExceedsDuration(true);
      } else {
        setExceedsDuration(false);
      }

      // Check if exceeds yearly limit and calculate unpaid days
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

    // Validate date range - warn if exceeds but still allow
    if (exceedsLimit) {
      showWarning(`⚠️ You are requesting ${daysRequested} days but only have ${selectedTypeMaxDays} allocated. The additional ${unpaidLeaveDays} day(s) will be marked as UNPAID LEAVE.`);
    }

    if (daysRequested === 0) {
      showError('Please select valid start and end dates.');
      return;
    }

    // Validate start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    const selectedStartDate = new Date(formData.startDate);
    if (selectedStartDate < today) {
      showError('Start date cannot be in the past. Please select today or a future date.');
      return;
    }

    // Check if Special Leave is only available in June
    const leaveTypeName = formData.leaveTypeName || '';
    if (leaveTypeName.toLowerCase().includes('special')) {
      const currentMonth = new Date().getMonth() + 1;
      if (currentMonth !== 6) {
        showError('Special Leave is only available during the month of June.');
        return;
      }
    }

    // Check if document is required for sick or study leave
    if (requiresDocument(leaveTypeName) && !formData.document) {
      showWarning(`Please upload a ${getDocumentLabel(leaveTypeName).toLowerCase()} for ${leaveTypeName}`);
      return;
    }

   // Check dynamic allowed_month rule
    if (formData.allowedMonth) {
      const startMonth = new Date(formData.startDate).getMonth() + 1;
      const endMonth = new Date(formData.endDate).getMonth() + 1;
      
      if (startMonth !== formData.allowedMonth || endMonth !== formData.allowedMonth) {
        const monthName = new Date(2000, formData.allowedMonth - 1, 1).toLocaleString('default', { month: 'long' });
        showError(`${formData.leaveTypeName} can only be taken strictly within the month of ${monthName}.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Send data to API with correct field names
      const submissionData = {
        leave_type: formData.leaveTypeId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        reason: formData.reason,
        document: formData.document,
      };

      const res = await applyLeave(submissionData);
      // Construct success message with unpaid leave info if applicable
      let successMessage = 'Leave request submitted for review! The administrator or HR will review your request shortly.';
      if (unpaidLeaveDays > 0) {
        successMessage += ` ⚠️ Note: ${unpaidLeaveDays} day${unpaidLeaveDays !== 1 ? 's' : ''} of this request will be marked as UNPAID LEAVE.`;
      }
      showSuccess(successMessage);

      // Reset form to first policy
      const firstType = leavetypes[0];
      setFormData({
        leaveTypeId: firstType?.id || null,
        leaveTypeName: firstType?.name || '',
        startDate: '',
        endDate: '',
        reason: '',
        document: null,
      });
      setDaysRequested(0);
      setUnpaidLeaveDays(0);
      setExceedsLimit(false);
      setExceedsDuration(false);

      // Call parent callback to refresh history if provided
      if (typeof onSubmitSuccess === 'function') {
        onSubmitSuccess(res);
      }

      onClose();
    } catch (error) {
      console.error('Error applying for leave:', error);

      // Extract detailed error message from API response
      let errorMessage = 'Failed to submit leave request. Please try again.';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          // Handle field-specific errors
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur z-30"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-8 border border-slate-200 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1 sm:mb-2 pr-8">Request Leave</h3>
          <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6">Fill in your leave request details</p>

          {/* Required Fields Info */}
          <div className="mb-5 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">Required Information:</p>
            <ul className="space-y-1.5 text-xs sm:text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>Leave type</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>Start date</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>End date</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>Reason for leave</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>Supporting document (where required)</span>
              </li>
            </ul>
          </div>

          {/* Review Process Info */}
          <div className="mb-5 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs sm:text-sm text-green-800">
              <span className="font-semibold">📋 Note:</span> After submission, your leave request will be sent to the administrator or HR for review.
            </p>
          </div>

          {isLoadingtypes ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="animate-spin h-6 w-6 text-slate-900"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
                <select
                  name="leaveType"
                  value={formData.leaveTypeId || ''}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm sm:text-base"
                  required
                >
                  <option value="">Select a leave type</option>
                  {leavetypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                {selectedTypeMaxDays && selectedTypeMaxDuration && (
                  <div className="text-xs text-slate-600 mt-2 space-y-1">
                    <p>Yearly allocation: <span className="font-semibold">{selectedTypeMaxDays} days</span></p>
                    <p>Max per request: <span className="font-semibold">{selectedTypeMaxDuration} days</span></p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    min={getTodayDate()}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    min={getTodayDate()}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Days Summary */}
              {daysRequested > 0 && (
                <div className={`p-2 sm:p-3 rounded-lg border-2 ${
                  exceedsDuration
                    ? 'bg-red-50 border-red-200'
                    : exceedsLimit
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-xs sm:text-sm font-semibold ${
                    exceedsDuration
                      ? 'text-red-700'
                      : exceedsLimit
                      ? 'text-amber-700'
                      : 'text-blue-700'
                  }`}>
                    {daysRequested} day{daysRequested !== 1 ? 's' : ''} requested
                  </p>
                  {exceedsDuration && selectedTypeMaxDuration && (
                    <p className="text-xs text-red-600 mt-1">
                      ❌ Exceeds maximum duration of {selectedTypeMaxDuration} days per request
                    </p>
                  )}
                  {!exceedsDuration && exceedsLimit && selectedTypeMaxDays && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Exceeds yearly limit of {selectedTypeMaxDays} days
                    </p>
                  )}
                  {!exceedsDuration && !exceedsLimit && selectedTypeMaxDays && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✓ {selectedTypeMaxDays - daysRequested} day{selectedTypeMaxDays - daysRequested !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>
              )}

              {/* Unpaid Leave Warning */}
              {unpaidLeaveDays > 0 && (
                <div className="p-3 sm:p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 text-sm sm:text-base">
                        UNPAID LEAVE NOTICE
                      </p>
                      <p className="text-amber-800 text-xs sm:text-sm mt-1">
                        You have exhausted your allocated {selectedTypeMaxDays} day(s) for {formData.leaveTypeName}. 
                        The additional <span className="font-bold">{unpaidLeaveDays} day{unpaidLeaveDays !== 1 ? 's' : ''}</span> will be marked as <span className="font-bold">UNPAID LEAVE</span>.
                      </p>
                      <p className="text-amber-700 text-xs mt-2 italic">
                        💡 Unpaid leave will not be deducted from your regular leave balance but will be noted in your records.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-black outline-none transition-all resize-none text-sm sm:text-base"
                  placeholder="Provide details about your leave request..."
                  required
                ></textarea>
              </div>

              {/* Document Upload - Only for Sick Leave and Study Leave */}
              {requiresDocument(formData.leaveTypeName) && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    {getDocumentLabel(formData.leaveTypeName)}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="file"
                    name="document"
                    onChange={handleChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB)
                  </p>
                  {formData.document && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ File selected: {formData.document.name}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={unpaidLeaveDays > 0 || isLoadingtypes || isSubmitting}
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg sm:rounded-xl transition-all shadow-lg text-sm sm:text-base min-h-[44px] flex items-center justify-center"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base min-h-[44px] flex items-center justify-center"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
