import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/alerthook';
import { createEmployee, getInstitutions } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

export default function AddEmployee() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useAlert();
  const [branchOptions, setBranchOptions] = useState([]);

   // Fetch branches for institution dropdown on component mount
    useState(() => {
      const fetchBranches = async () => {
        try {
          const response = await getInstitutions();
          setBranchOptions(response.data.results);
        } catch (error) {
          console.error('Error fetching branches:', error);
          showError('Failed to load branches. Please refresh the page or contact support.');
        }
      };
      fetchBranches();
    }, [showError]);


  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    position: '',
    role: '',
    institution: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear inline field error when user starts retyping
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      showWarning('First name and last name are required');
      return;
    }

    if (!formData.email.trim()) {
      showWarning('Email is required');
      return;
    }

    if (!formData.department.trim()) {
      showWarning('Department is required');
      return;
    }

    if (!formData.role.trim()) {
      showWarning('Role is required');
      return;
    }

    if (!formData.institution.trim()) {
      showWarning('Institution is required');
      return;
    }

    // Prepare data for API - using field names the backend expects
    const employeeData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone_number: formData.phoneNumber,
      department: formData.department,
      position: formData.position,
      role: formData.role.toUpperCase(),
      institution: formData.institution,
    };

    setIsLoading(true);

    createEmployee(employeeData)
      .then((response) => {
          if (response.statusText === "Created") {
            showSuccess( `Employee created successfully!`);
          
          // Reset form
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            department: '',
            position: '',
            role: '',
            institution: '',
          });
          // Navigate back to admin dashboard after a short delay
          setTimeout(() => {
            navigate('/admin/dashboard');
          }, 1500);
             } else {
            showError('Failed to create employee. Please try again.');
          }
        })
      .catch((error) => {
        showError("An error occurred while creating the employee. Please check the form and try again.");
        console.error('Error creating employee:', error);

      })
      .finally(() => {
        setIsLoading(false);
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            department: '',
            position: '',
            role: '',
            institution: ''
          });
         setFieldErrors({}); // Clear field errors on completion
          });
  };

  const handleCancel = () => {
    navigate('/admin/dashboard');
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-black text-slate-900 mb-2">Add New Employee</h1>
            <p className="text-slate-600">Create a new employee account and add them to your organization</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Email and Phone Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@company.com"
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none transition-all ${fieldErrors.email
                      ? 'border-red-400 focus:ring-red-300 bg-red-50'
                      : 'border-slate-200 focus:ring-blue-500'
                      }`}
                    disabled={isLoading}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g., Human Resources, IT"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="e.g., Software Engineer"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Institution */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Institution *</label>
               
                <select
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isLoading}
                  required
                >
                  <option value="">Select an institution</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isLoading}
                  required
                >
                  <option value="">Select a role</option>
                  <option value="HR">HR</option>
                  <option value="Manager">Manager</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>



              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Employee
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
