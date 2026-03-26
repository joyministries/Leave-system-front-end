//src/pages/AdminEmployeeManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/alerthook';
import { deactivateEmployee, getEmployees, updateEmployee } from '../services/ApiClient';
import ProtectedLayout from '../components/ProtectedLayout';

export default function AdminEmployeeManagement() {
    const location = useLocation();
    const navigate = useNavigate();
    const { showSuccess, showError } = useAlert();
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPasswordMap, setShowPasswordMap] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch employees on component mount
    const fetchEmployees = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await getEmployees();
            console.log('Full response:', response)
            console.log('Employee roles in response:', response.data.results.map(emp => ({ name: emp.first_name + ' ' + emp.last_name, role: emp.role })));
            setEmployees(response.data.results);

        } catch (error) {
            console.error('Error fetching employees:', error);
            showError('Failed to load employees. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Toggle password visibility
    const togglePasswordVisibility = (employeeId) => {
        setShowPasswordMap(prev => ({
            ...prev,
            [employeeId]: !prev[employeeId]
        }));
    };

    const handleUpdate = async (employeeId, updatedData) => {
        try {
            await updateEmployee(employeeId, updatedData);
            showSuccess('Employee updated successfully!');
            await fetchEmployees();
            setEditingEmployee(null);
        }
        catch (error) {
            console.error('Error updating employee:', error);
            showError('Failed to update employee. Please try again.');
        }
    };

    // Handle edit button click
    const handleEditClick = (employee) => {
        setEditingEmployee(employee.id);
        setEditFormData({
            first_name: employee.first_name,
            last_name: employee.last_name,
            email: employee.email,
            role: employee.role,
            department: employee.department || '',
            password: employee.password || '',
        });
    };

    // Handle edit form submission
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingEmployee) return;

        // Validation
        if (!editFormData.first_name.trim() || !editFormData.last_name.trim()) {
            showError('First name and last name are required');
            return;
        }
        if (!editFormData.email.trim()) {
            showError('Email is required');
            return;
        }

        try {
            setIsSubmitting(true);
            await handleUpdate(editingEmployee, editFormData);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
        setEditingEmployee(null);
        setEditFormData({});
    };

    // Handle edit form input change
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle delete
    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            try {
                await deactivateEmployee(id);
                showSuccess('Employee deactivated successfully!');
                await fetchEmployees();
            } catch (error) {
                console.error('Error deactivating employee:', error);
                showError('Failed to deactivate employee. Please try again.');
            }
        }
    };

    // Filter and search employees
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = 
            (emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesRole = filterRole === 'all' || emp.role === filterRole;
        
        return matchesSearch && matchesRole;
    });

    // Get unique roles
    const uniqueRoles = [...new Set(employees.map(emp => emp.role).filter(Boolean))];

    return (
        <ProtectedLayout currentPath={location.pathname}>
            <div className="min-h-screen bg-slate-50 p-8">
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
                        <h1 className="text-4xl font-black text-slate-900 mb-2">Employee Management</h1>
                        <p className="text-slate-600">
                            View and manage all employees in the system
                        </p>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Search */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Search
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or employee ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Role Filter */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Filter by Role
                                </label>
                                <select
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="all">All Roles</option>
                                    {uniqueRoles.map(role => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Employees List */}
                    {isLoading ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12">
                            <div className="flex items-center justify-center gap-3">
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
                                <p className="text-slate-600 font-medium">Loading employees...</p>
                            </div>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12">
                            <div className="text-center">
                                <svg
                                    className="w-16 h-16 text-slate-300 mx-auto mb-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3.5A2.5 2.5 0 011 18.5V5.5A2.5 2.5 0 013.5 3h17A2.5 2.5 0 0123 5.5v13a2.5 2.5 0 01-2.5 2.5z"
                                    />
                                </svg>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">No Employees Found</h3>
                                <p className="text-slate-600">No employees match your search criteria</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                            {/* Summary */}
                            <div className="bg-blue-50 border-b border-slate-200 p-4">
                                <p className="text-blue-900 font-semibold">
                                    Showing {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200">
                                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Name</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Email</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Employee ID</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Role</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Password</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEmployees.map((employee, index) => (
                                            <tr
                                                key={employee.id}
                                                className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                                                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                                }`}
                                            >
                                                <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                                                    {employee.first_name} {employee.last_name}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {employee.email}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {employee.employee_id}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        employee.role === 'admin'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {employee.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <code className="bg-slate-100 px-3 py-1 rounded font-mono text-xs">
                                                            {showPasswordMap[employee.id]
                                                                ? employee.password || 'N/A'
                                                                : '••••••••'
                                                            }
                                                        </code>
                                                        <button
                                                            onClick={() => togglePasswordVisibility(employee.id)}
                                                            className="text-slate-500 hover:text-slate-700 transition-colors"
                                                            title={showPasswordMap[employee.id] ? 'Hide' : 'Show'}
                                                        >
                                                            {showPasswordMap[employee.id] ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM19.5 13a9.97 9.97 0 01-1.563 4.803m0 0c.726.745 1.409 1.574 2.036 2.428m0 0a10.05 10.05 0 01-23.708.464m0 0l1.414-1.414m0 0a3.375 3.375 0 105.732-4.244" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(employee)}
                                                            className="px-3 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-sm flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(employee.id, `${employee.first_name} ${employee.last_name}`)}
                                                            className="px-3 py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Employee Modal */}
            {editingEmployee && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 backdrop-blur z-30"
                        onClick={handleCancelEdit}
                    ></div>

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-200 max-h-[90vh] overflow-y-auto">

                            {/* Close Button */}
                            <button
                                onClick={handleCancelEdit}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <h3 className="text-2xl font-black text-slate-900 mb-2">Edit Employee</h3>
                            <p className="text-slate-500 text-sm mb-6">Update employee information</p>

                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                {/* First Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={editFormData.first_name || ''}
                                        onChange={handleEditFormChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={editFormData.last_name || ''}
                                        onChange={handleEditFormChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editFormData.email || ''}
                                        onChange={handleEditFormChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>

                                {/* Employee ID */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Employee ID
                                    </label>
                                    <input
                                        type="text"
                                        name="employee_id"
                                        value={editFormData.employee_id || ''}
                                        readOnly
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 cursor-not-allowed text-slate-600"
                                    />
                                </div>

                                {/* Department */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        name="department"
                                        value={editFormData.department || ''}
                                        onChange={handleEditFormChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                {/* Role */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Role
                                    </label>
                                    <select
                                        name="role"
                                        value={editFormData.role || ''}
                                        onChange={handleEditFormChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="">Select a role</option>
                                        <option value="admin">Admin</option>
                                        <option value="employee">Employee</option>
                                    </select>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={editFormData.password || ''}
                                        onChange={handleEditFormChange}
                                        placeholder="Leave empty to keep unchanged"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Leave empty to keep the current password</p>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </span>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-all"
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
