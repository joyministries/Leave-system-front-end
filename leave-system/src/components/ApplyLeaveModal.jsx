import { useState, useEffect } from 'react';
import { useAlert } from '../hooks/alerthook';
import { applyLeave, getLeavePolices } from '../services/ApiClient';

export default function ApplyLeaveModal({ isOpen, onClose, onSubmitSuccess }) {
  const [formData, setFormData] = useState({
    leaveTypeId: null,
    leaveTypeName: '',
    startDate: '',
    endDate: '',
    reason: '',
    document: null,
  });

  const [leavePolicies, setLeavePolicies] = useState([]);
  const [selectedPolicyMaxDays, setSelectedPolicyMaxDays] = useState(null);
  const [daysRequested, setDaysRequested] = useState(0);
  const [exceedsLimit, setExceedsLimit] = useState(false);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError, showWarning } = useAlert();

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

  // Fetch leave policies on mount
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setIsLoadingPolicies(true);
        const data = await getLeavePolices();
        const policiesArray = Array.isArray(data) ? data : data.results || [];
        setLeavePolicies(policiesArray);
        
        // Set initial max days and ID for first policy
        if (policiesArray.length > 0) {
          const initialPolicy = policiesArray[0];
          setSelectedPolicyMaxDays(initialPolicy.max_days);
          setFormData(prev => ({
            ...prev,
            leaveTypeId: initialPolicy.id,
            leaveTypeName: initialPolicy.name,
          }));
        }
      } catch (error) {
        console.error('Error fetching leave policies:', error);
        showWarning('Could not load leave policies. Please try again.');
      } finally {
        setIsLoadingPolicies(false);
      }
    };

    if (isOpen) {
      fetchPolicies();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (name === 'leaveType') {
      // Find the policy with matching ID
      const selectedPolicy = leavePolicies.find(p => p.id === parseInt(value));
      if (selectedPolicy) {
        setFormData((prev) => ({
          ...prev,
          leaveTypeId: selectedPolicy.id,
          leaveTypeName: selectedPolicy.name,
        }));
        setSelectedPolicyMaxDays(selectedPolicy.max_days);
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

      // Check if exceeds limit
      if (selectedPolicyMaxDays && days > selectedPolicyMaxDays) {
        setExceedsLimit(true);
      } else {
        setExceedsLimit(false);
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

    // Validate date range
    if (exceedsLimit) {
      showError(`You cannot request more than ${selectedPolicyMaxDays} days for this leave type.`);
      return;
    }

    if (daysRequested === 0) {
      showWarning('Please select valid start and end dates.');
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

    // Check if document is required for sick or study leave
    const leaveTypeName = formData.leaveTypeName || '';
    if ((leaveTypeName.toLowerCase().includes('sick') || leaveTypeName.toLowerCase().includes('study')) && !formData.document) {
      showWarning('Please upload a document for ' + leaveTypeName);
      return;
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

      await applyLeave(submissionData);
      showSuccess('Leave request submitted successfully!');

      // Reset form to first policy
      const firstPolicy = leavePolicies[0];
      setFormData({
        leaveTypeId: firstPolicy?.id || null,
        leaveTypeName: firstPolicy?.name || '',
        startDate: '',
        endDate: '',
        reason: '',
        document: null,
      });
      setDaysRequested(0);

      // Call parent callback to refresh history if provided
      if (typeof onSubmitSuccess === 'function') {
        onSubmitSuccess();
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

          {isLoadingPolicies ? (
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
                  {leavePolicies.map(policy => (
                    <option key={policy.id} value={policy.id}>{policy.name}</option>
                  ))}
                </select>
                {selectedPolicyMaxDays && (
                  <p className="text-xs text-slate-600 mt-2">
                    Maximum allowed: <span className="font-semibold">{selectedPolicyMaxDays} days/year</span>
                  </p>
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
                  exceedsLimit
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-xs sm:text-sm font-semibold ${exceedsLimit ? 'text-red-700' : 'text-blue-700'}`}>
                    {daysRequested} day{daysRequested !== 1 ? 's' : ''} requested
                  </p>
                  {exceedsLimit && selectedPolicyMaxDays && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Exceeds limit of {selectedPolicyMaxDays} days
                    </p>
                  )}
                  {!exceedsLimit && selectedPolicyMaxDays && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✓ {selectedPolicyMaxDays - daysRequested} day{selectedPolicyMaxDays - daysRequested !== 1 ? 's' : ''} remaining
                    </p>
                  )}
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
              {(formData.leaveTypeName.toLowerCase().includes('sick') || formData.leaveTypeName.toLowerCase().includes('study')) && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    {formData.leaveTypeName.toLowerCase().includes('sick') ? 'Medical Certificate' : 'Supporting Document'}
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
                disabled={exceedsLimit || isLoadingPolicies || isSubmitting}
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
