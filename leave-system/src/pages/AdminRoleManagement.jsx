import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ProtectedLayout from '../components/ProtectedLayout';
import { useAlert } from '../hooks/alerthook';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions
} from '../services/ApiClient';
import { MdSecurity, MdAdd, MdEdit, MdDelete, MdCheck, MdClose, MdShield, MdSearch } from 'react-icons/md';

// Default permission catalog fallback grouped by module
const DEFAULT_PERMISSIONS_CATALOG = [
  {
    category: 'Leave Management',
    permissions: [
      { code: 'leaves:view_all', name: 'View All Leaves', description: 'View leave requests across all employees' },
      { code: 'leaves:approve', name: 'Approve / Reject Leaves', description: 'Approve or reject leave applications' },
      { code: 'leaves:apply', name: 'Apply for Leave', description: 'Submit leave applications' },
      { code: 'leaves:cancel', name: 'Cancel Leaves', description: 'Cancel pending or approved leave requests' },
    ]
  },
  {
    category: 'Employee Management',
    permissions: [
      { code: 'employees:view', name: 'View Employees', description: 'View employee records and profile information' },
      { code: 'employees:create', name: 'Create Employee', description: 'Add new employee accounts to the system' },
      { code: 'employees:edit', name: 'Edit Employee', description: 'Modify employee personal and job details' },
      { code: 'employees:toggle_active', name: 'Activate/Deactivate', description: 'Activate or deactivate employee accounts' },
    ]
  },
  {
    category: 'Branch Management',
    permissions: [
      { code: 'branches:view', name: 'View Branches', description: 'View list of university branches and leave assignments' },
      { code: 'branches:manage', name: 'Manage Branches', description: 'Add, edit, or remove university branches' },
    ]
  },
  {
    category: 'Reports & Analytics',
    permissions: [
      { code: 'reports:view', name: 'View Reports', description: 'Access institution-wide leave analytics and summary reports' },
      { code: 'reports:export', name: 'Export Reports', description: 'Download PDF / CSV report summaries' },
    ]
  },
  {
    category: 'Role & System Settings',
    permissions: [
      { code: 'roles:manage', name: 'Manage Roles & Permissions', description: 'Configure custom roles and modify action permissions' },
    ]
  }
];

export default function AdminRoleManagement() {
  const location = useLocation();
  const { showSuccess, showError } = useAlert();

  const [roles, setRoles] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState(DEFAULT_PERMISSIONS_CATALOG);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown kebab menu state
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    grants_django_admin: false,
    permission_codes: []
  });

  // Fetch Roles and Permissions from Backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.allSettled([
        getRoles(),
        getPermissions()
      ]);

      // Process Roles
      if (rolesRes.status === 'fulfilled' && rolesRes.value?.data) {
        const data = rolesRes.value.data.results || rolesRes.value.data;
        setRoles(Array.isArray(data) ? data : []);
      } else {
        showError('Failed to load roles from backend.');
      }

      // Process Permissions catalogue if returned by backend
      if (permsRes.status === 'fulfilled' && permsRes.value?.data) {
        const rawPerms = permsRes.value.data.results || permsRes.value.data;
        if (Array.isArray(rawPerms) && rawPerms.length > 0) {
          // Group flat permissions array by category if present
          const grouped = {};
          rawPerms.forEach(p => {
            const cat = p.category || p.module || 'General Permissions';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({
              code: p.code || p.codename || p.id,
              name: p.name || p.label || p.code,
              description: p.description || ''
            });
          });
          const formattedCatalog = Object.keys(grouped).map(cat => ({
            category: cat,
            permissions: grouped[cat]
          }));
          setPermissionsCatalog(formattedCatalog);
        }
      }
    } catch (err) {
      console.error('Error fetching role data:', err);
      showError('An error occurred while loading roles and permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingRoleId(null);
    setFormData({
      name: '',
      description: '',
      grants_django_admin: false,
      permission_codes: []
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (role) => {
    setIsEditing(true);
    setEditingRoleId(role.id);
    
    // Extract assigned permission codes (supports array of objects or strings)
    const existingPerms = Array.isArray(role.permission_codes)
      ? role.permission_codes.map(p => (typeof p === 'object' ? p.code : p))
      : (Array.isArray(role.permissions) ? role.permissions.map(p => (typeof p === 'object' ? p.code || p.codename : p)) : []);

    setFormData({
      name: role.name || '',
      description: role.description || '',
      grants_django_admin: !!role.grants_django_admin,
      permission_codes: existingPerms
    });
    setIsModalOpen(true);
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (code) => {
    setFormData(prev => {
      const current = prev.permission_codes || [];
      const exists = current.includes(code);
      const updated = exists
        ? current.filter(c => c !== code)
        : [...current, code];
      return { ...prev, permission_codes: updated };
    });
  };

  // Toggle all permissions within a category
  const handleToggleCategory = (categoryPermissions) => {
    const categoryCodes = categoryPermissions.map(p => p.code);
    setFormData(prev => {
      const current = prev.permission_codes || [];
      const allSelected = categoryCodes.every(code => current.includes(code));
      let updated;
      if (allSelected) {
        // Deselect category
        updated = current.filter(c => !categoryCodes.includes(c));
      } else {
        // Select category
        updated = Array.from(new Set([...current, ...categoryCodes]));
      }
      return { ...prev, permission_codes: updated };
    });
  };

  // Select all permissions
  const handleSelectAll = () => {
    const allCodes = permissionsCatalog.flatMap(cat => cat.permissions.map(p => p.code));
    setFormData(prev => ({ ...prev, permission_codes: allCodes }));
  };

  // Deselect all permissions
  const handleDeselectAll = () => {
    setFormData(prev => ({ ...prev, permission_codes: [] }));
  };

  // Delete Role
  const handleDeleteRole = async (roleId, roleName) => {
    if (window.confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      try {
        await deleteRole(roleId);
        showSuccess(`Role "${roleName}" deleted successfully!`);
        fetchData();
      } catch (err) {
        console.error('Failed to delete role:', err);
        showError(err.message || 'Failed to delete role.');
      }
    }
  };

  // Handle Form Submit (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Role name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateRole(editingRoleId, formData);
        showSuccess(`Role "${formData.name}" updated successfully!`);
      } else {
        await createRole(formData);
        showSuccess(`Role "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save role:', err);
      showError(err.message || 'Failed to save role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Roles list
  const filteredRoles = roles.filter(role =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedLayout currentPath={location.pathname}>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <MdShield className="text-blue-600 shrink-0" />
                Role & Permission Management
              </h1>
              <p className="text-slate-600 mt-1 text-sm md:text-base">
                Create system roles and configure granular action permissions synced with the backend
              </p>
            </div>
            
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm shrink-0"
            >
              <MdAdd className="text-xl" />
              Add New Role
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center gap-3">
            <MdSearch className="text-xl text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search roles by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-slate-800 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Roles Table Container */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <MdSecurity className="text-blue-400" />
                System Roles ({filteredRoles.length})
              </h2>
              <span className="text-xs text-slate-300 font-medium">
                Changes apply instantly across assigned accounts
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Loading roles and permissions...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="p-12 text-center">
                <MdShield className="text-5xl text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800 mb-1">No Roles Found</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {searchTerm ? 'No roles match your search term.' : 'No custom roles configured yet.'}
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Create First Role
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <th className="px-6 py-4">Role Name</th>
                      <th className="px-6 py-4">Granted Permissions</th>
                      <th className="px-6 py-4">Admin Status</th>
                      <th className="px-6 py-4 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredRoles.map((role, idx) => {
                      const permsCount = Array.isArray(role.permission_codes)
                        ? role.permission_codes.length
                        : (Array.isArray(role.permissions) ? role.permissions.length : 0);

                      return (
                        <tr
                          key={role.id || idx}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Role Name + Description */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              {role.name}
                            </div>
                            {role.description && (
                              <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">
                                {role.description}
                              </p>
                            )}
                          </td>

                          {/* Granted Permissions Badge */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                              <MdShield className="text-blue-500 text-sm" />
                              {permsCount} Action{permsCount !== 1 ? 's' : ''} Allowed
                            </span>
                          </td>

                          {/* Django Admin Access Badge */}
                          <td className="px-6 py-4">
                            {role.grants_django_admin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                Full Admin Access
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                Standard Role
                              </span>
                            )}
                          </td>

                          {/* Kebab 3-dot Actions Menu */}
                          <td className="px-6 py-4 text-center">
                            <div className="relative inline-block" ref={openMenuId === role.id ? menuRef : null}>
                              <button
                                onClick={() => setOpenMenuId(prev => prev === role.id ? null : role.id)}
                                className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors mx-auto"
                                title="Actions"
                                aria-label="Role actions"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <circle cx="12" cy="5" r="1.5" />
                                  <circle cx="12" cy="12" r="1.5" />
                                  <circle cx="12" cy="19" r="1.5" />
                                </svg>
                              </button>

                              {/* Kebab Dropdown Menu */}
                              {openMenuId === role.id && (
                                <div className="absolute right-0 z-50 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                  <button
                                    onClick={() => {
                                      handleOpenEditModal(role);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                  >
                                    <MdEdit className="text-base text-blue-600 shrink-0" />
                                    Edit Permissions
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    onClick={() => {
                                      handleDeleteRole(role.id, role.name);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <MdDelete className="text-base text-rose-500 shrink-0" />
                                    Delete Role
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Role Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 my-8 max-h-[90vh] flex flex-col">
              
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <MdClose className="text-2xl" />
              </button>

              {/* Modal Header */}
              <div className="mb-6 shrink-0 pr-8">
                <h3 className="text-2xl font-black text-slate-900">
                  {isEditing ? `Edit Role: ${formData.name}` : 'Create New Role'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Assign or revoke granular permissions for this role
                </p>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-5">
                
                {/* Inputs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Role Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HR Manager, Supervisor"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Role Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Manages leave approvals"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition"
                    />
                  </div>
                </div>

                {/* Permissions Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <MdShield className="text-blue-600 text-lg" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Assign Action Permissions ({formData.permission_codes.length} Selected)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Permissions List Scrollable */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-6 custom-scrollbar">
                  {permissionsCatalog.map((cat, catIdx) => {
                    const categoryCodes = cat.permissions.map(p => p.code);
                    const isAllCatSelected = categoryCodes.length > 0 && categoryCodes.every(code => formData.permission_codes.includes(code));

                    return (
                      <div key={catIdx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {cat.category}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(cat.permissions)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            {isAllCatSelected ? 'Deselect Category' : 'Select Category'}
                          </button>
                        </div>

                        {/* Checkboxes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {cat.permissions.map((perm) => {
                            const isChecked = formData.permission_codes.includes(perm.code);
                            return (
                              <label
                                key={perm.code}
                                className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-blue-50/70 border-blue-300 text-blue-950 shadow-2xs'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.code)}
                                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 shrink-0 cursor-pointer"
                                />
                                <div>
                                  <span className="block font-semibold text-xs leading-tight">
                                    {perm.name}
                                  </span>
                                  {perm.description && (
                                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                                      {perm.description}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center gap-3 pt-3 shrink-0 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <MdCheck className="text-lg" />
                    )}
                    {isEditing ? 'Save Changes' : 'Create Role'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition text-sm"
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
