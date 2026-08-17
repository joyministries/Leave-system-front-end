import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProtectedLayout from '../components/ProtectedLayout';
import { useAlert } from '../hooks/alerthook';
import { 
  getInstitutions, 
  createInstitution, 
  updateInstitution, 
  deleteInstitution,
  getLeaveTypes 
} from '../services/ApiClient';

export default function AdminBranches() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useAlert();
  
  const [branches, setBranches] = useState([]);
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dropdown open state for leave types selector
  const [isLeaveTypesOpen, setIsLeaveTypesOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch branches and leave types
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [branchesRes, leaveTypesRes] = await Promise.allSettled([
          getInstitutions(),
          getLeaveTypes()
        ]);

        if (branchesRes.status === 'fulfilled') {
          const bData = branchesRes.value?.data?.results || branchesRes.value?.data || [];
          setBranches(Array.isArray(bData) ? bData : []);
        } else {
          showError('Failed to load branches.');
        }

        if (leaveTypesRes.status === 'fulfilled' && Array.isArray(leaveTypesRes.value)) {
          setAvailableLeaveTypes(leaveTypesRes.value);
        }
      } catch (error) {
        console.error('Error initializing branch page data:', error);
        showError('Failed to load initial branch data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showError]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsLeaveTypesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    leave_types: [] // Stores IDs or names of selected leave types
  });

  const [errors, setErrors] = useState({});

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleToggleLeaveType = (leaveTypeId) => {
    setFormData(prev => {
      const current = prev.leave_types || [];
      const exists = current.includes(leaveTypeId);
      const updated = exists 
        ? current.filter(id => id !== leaveTypeId) 
        : [...current, leaveTypeId];
      return { ...prev, leave_types: updated };
    });
  };

  const handleSelectAllLeaveTypes = () => {
    setFormData(prev => ({
      ...prev,
      leave_types: availableLeaveTypes.map(lt => lt.id)
    }));
  };

  const handleClearAllLeaveTypes = () => {
    setFormData(prev => ({
      ...prev,
      leave_types: []
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddBranch = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', leave_types: [] });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditBranch = (branch) => {
    setIsEditing(true);
    setEditingId(branch.id);
    
    // Support leave_types array of objects or IDs
    const existingLeaveTypes = Array.isArray(branch.leave_types)
      ? branch.leave_types.map(lt => (typeof lt === 'object' ? lt.id : lt))
      : (Array.isArray(branch.allowed_leave_types) ? branch.allowed_leave_types.map(lt => (typeof lt === 'object' ? lt.id : lt)) : []);

    setFormData({
      name: branch.name || '',
      leave_types: existingLeaveTypes
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteBranch = async (branchId) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      try {
        await deleteInstitution(branchId);
        setBranches(prev => prev.filter(b => b.id !== branchId));
        showSuccess('Branch deleted successfully!');
      } catch (error) {
        console.error('Error deleting branch:', error);
        showError(error.message || 'Failed to delete branch. Please try again.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      if (isEditing) {
        const response = await updateInstitution(editingId, formData);
        const updatedBranch = response.data;
        setBranches(prev => prev.map(b => b.id === editingId ? updatedBranch : b));
        showSuccess('Branch updated successfully!');
      } else {
        const response = await createInstitution(formData);
        const newBranch = response.data;
        setBranches(prev => [...prev, newBranch]);
        showSuccess('Branch added successfully!');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving branch:', error);
      showError(error.message || 'Failed to save branch. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', leave_types: [] });
    setErrors({});
    setIsEditing(false);
    setEditingId(null);
    setIsLeaveTypesOpen(false);
  };

  // Helper to resolve leave type names for display
  const getLeaveTypeName = (leaveTypeRef) => {
    if (typeof leaveTypeRef === 'object' && leaveTypeRef !== null) {
      return leaveTypeRef.name || leaveTypeRef.label;
    }
    const found = availableLeaveTypes.find(lt => lt.id === leaveTypeRef || lt.name === leaveTypeRef);
    return found ? found.name : String(leaveTypeRef);
  };

  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-slate-900 mb-2">Manage Branches</h1>
            <p className="text-slate-600">Add, edit, and configure university branches and their available leave types</p>
          </div>

          {/* Add Branch Button */}
          <div className="mb-8">
            <button
              onClick={handleAddBranch}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Branch
            </button>
          </div>

          {/* Branches Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Active Branches ({branches.length})
              </h2>
              <p className="text-slate-600 mt-1">
                All university branches currently in the system
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Branch Name</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Allowed Leave Types</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-bold text-slate-900 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="3" className="px-4 sm:px-6 py-8 text-center text-slate-500">
                        Loading branches...
                      </td>
                    </tr>
                  ) : branches.length > 0 ? (
                    branches.map((branch) => {
                      const branchLeaveTypes = Array.isArray(branch.leave_types) 
                        ? branch.leave_types 
                        : (Array.isArray(branch.allowed_leave_types) ? branch.allowed_leave_types : []);
                      
                      return (
                        <tr key={branch.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                          <td className="px-4 sm:px-6 py-4 text-sm font-bold text-slate-900">
                            {branch.name}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm">
                            {branchLeaveTypes.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {branchLeaveTypes.map((ltRef, idx) => (
                                  <span 
                                    key={idx} 
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                                  >
                                    {getLeaveTypeName(ltRef)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">All leave types (default)</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditBranch(branch)}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold rounded-lg transition"
                                title="Edit branch"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteBranch(branch.id)}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg transition"
                                title="Delete branch"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 sm:px-6 py-8 text-center text-slate-500">
                        No branches found. Click "Add New Branch" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Branch Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30"
            onClick={handleCloseModal}
          ></div>

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-8 border border-slate-200 my-8">
              
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-3 sm:top-4 right-3 sm:right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-2xl font-black text-slate-900 mb-6 pr-8">
                {isEditing ? 'Edit Branch' : 'Add New Branch'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Branch Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g., Main Campus"
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm ${
                      errors.name ? 'border-red-500' : 'border-slate-200'
                    }`}
                    required
                  />
                  {errors.name && (
                    <p className="text-red-600 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Leave Types Multi-Select Dropdown */}
                <div ref={dropdownRef} className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Allowed Leave Types for Branch
                  </label>
                  
                  {/* Selected Pills Container / Dropdown Trigger */}
                  <div
                    onClick={() => setIsLeaveTypesOpen(prev => !prev)}
                    className="min-h-[46px] w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer flex items-center justify-between gap-2 hover:border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 transition-all"
                  >
                    <div className="flex flex-wrap gap-1.5 items-center flex-1">
                      {formData.leave_types && formData.leave_types.length > 0 ? (
                        formData.leave_types.map((ltId) => {
                          const ltName = getLeaveTypeName(ltId);
                          return (
                            <span
                              key={ltId}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-md border border-blue-200"
                            >
                              {ltName}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLeaveType(ltId);
                                }}
                                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                              >
                                <svg className="w-3 h-3 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-400 text-sm">Select allowed leave types...</span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${isLeaveTypesOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Dropdown Menu */}
                  {isLeaveTypesOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-2">
                      <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 mb-1">
                        <button
                          type="button"
                          onClick={handleSelectAllLeaveTypes}
                          className="text-xs text-blue-600 font-semibold hover:underline"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllLeaveTypes}
                          className="text-xs text-slate-500 font-semibold hover:underline"
                        >
                          Clear All
                        </button>
                      </div>

                      {availableLeaveTypes.length > 0 ? (
                        availableLeaveTypes.map((leaveType) => {
                          const isSelected = formData.leave_types.includes(leaveType.id);
                          return (
                            <label
                              key={leaveType.id}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleLeaveType(leaveType.id)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                              />
                              <span className="flex-1">{leaveType.name}</span>
                              {leaveType.max_days && (
                                <span className="text-xs text-slate-400 font-normal">
                                  {leaveType.max_days} days max
                                </span>
                              )}
                            </label>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-slate-400">
                          No leave types available. Add leave types first.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                  >
                    {isEditing ? 'Update Branch' : 'Add Branch'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </ProtectedLayout>
  );
}
