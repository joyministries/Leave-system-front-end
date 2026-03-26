import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProtectedLayout from '../components/ProtectedLayout';
import { useAlert } from '../hooks/alerthook';
import { getInstitutions, createInstitution, updateInstitution, deleteInstitution } from '../services/ApiClient';

export default function AdminBranches() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useAlert();
  
  const [branches, setBranches] = useState([]);

  // create institution
  const createBranch = async (branchData) => {
    try {
      const response = await createInstitution(branchData);
      return response.data;
    } catch (error) {
      console.error('Error creating branch:', error);
      showError('Failed to add branch. Please try again.');
      throw error;
    }
  };

  // update institution
  const editBranch = async (branchId, branchData) => {
    try {
      const response = await updateInstitution(branchId, branchData);
      return response.data;
    } catch (error) {
      console.error('Error updating branch:', error);
      showError('Failed to update branch. Please try again.');
      throw error;
    }
  };

  // delete institution
  const removeBranch = async (branchId) => {
    try {
      await deleteInstitution(branchId);
      setBranches(prev => prev.filter(b => b.id !== branchId));
      showSuccess('Branch deleted successfully!');
    }
    catch (error) {
      console.error('Error deleting branch:', error);
      showError('Failed to delete branch. Please try again.');
    }
  }

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await getInstitutions();
        setBranches(response.data.results);
      }
      catch (error) {
        console.error('Error fetching branches:', error);
        showError('Failed to load branches. Please refresh the page or contact support.');
      }
    };
    fetchBranches();
  }, [showError]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: ''
  });

  const [errors, setErrors] = useState({});

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
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
    setFormData({ name: ''});
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditBranch = (branch) => {
    setIsEditing(true);
    setEditingId(branch.id);
    setFormData({
      name: branch.name
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteBranch = (branchId) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      removeBranch(branchId);
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
        // Update existing branch
        const updatedBranch = await editBranch(editingId, formData);
        setBranches(prev => prev.map(b => b.id === editingId ? updatedBranch : b));
        showSuccess('Branch updated successfully!');
      } else {
        // Add new branch
        const newBranch = await createBranch(formData);
        setBranches(prev => [...prev, newBranch]);
        showSuccess('Branch added successfully!');
      }
      setIsModalOpen(false);
      setFormData({ name: '' });
      setIsEditing(false);
      setEditingId(null);
      setErrors({});
    } catch (error) {
      console.error('Error saving branch:', error);
      showError('Failed to save branch. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '' });
    setErrors({});
    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
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
            <h1 className="text-4xl font-black text-slate-900 mb-2">Manage Branches</h1>
            <p className="text-slate-600">Add, edit, and manage university branches</p>
          </div>

          {/* Add Branch Button */}
          <div className="mb-8">
            <button
              onClick={handleAddBranch}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
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
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-900">Branch Name</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-bold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.length > 0 ? (
                    branches.map((branch) => (
                      <tr key={branch.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                        <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-900">
                          {branch.name}
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="px-4 sm:px-6 py-8 text-center text-slate-500">
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
            className="fixed inset-0 backdrop-blur z-30"
            onClick={handleCloseModal}
          ></div>

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-8 border border-slate-200">
              
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

              <form onSubmit={handleSubmit} className="space-y-4">
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

                {/* Submit and Cancel Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
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
