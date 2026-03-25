import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =========================================================
// 1. REQUEST INTERCEPTOR (Attaches the token)
// =========================================================
apiClient.interceptors.request.use(
  (config) => {
    // Public endpoints that don't require authentication
    const publicEndpoints = ['/auth/login/', '/auth/set-password/'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url.includes(endpoint));

    if (!isPublicEndpoint) {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined' && token !== 'null') {
        try {
          // JWT tokens have 3 parts separated by dots
          const isJWT = token.split('.').length === 3;
          config.headers.Authorization = `${isJWT ? 'Bearer' : 'Token'} ${token}`;
        } catch (e) {
          console.warn('Invalid token format', e);
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =========================================================
// 2. RESPONSE INTERCEPTOR (Handles expired/invalid tokens)
// =========================================================
let isLoggingOut = false;
let alertHandler = null;

export const setAlertHandler = (handler) => {
  alertHandler = handler;
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('Token invalid or expired. Logging out...');

      if (alertHandler) {
        alertHandler('Your session has expired. Please log in again.');
      }

      localStorage.removeItem('user');
      localStorage.removeItem('token');

      if (window.location.pathname !== '/login' && !isLoggingOut) {
        isLoggingOut = true;
        window.location.href = '/login';
        return new Promise(() => { });
      }
    }

    return Promise.reject(error);
  }
);

// =========================================================
// AUTHENTICATION ENDPOINTS
// =========================================================

/**
 * Login - Authenticate employee with email and password
 * POST /auth/login/
 */
export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login/', { email, password });
    return response;
  } catch (error) {
    throw new Error('Login failed. Please check your credentials', { cause: error.message });
  }
};

/**
 * Logout - Revoke current session
 * POST /auth/logout/
 */
export const logout = async () => {
  try {
    const response = await apiClient.post('/auth/logout/');
    return response;
  } catch (error) {
    throw new Error('Logout failed', { cause: error.message });
  }
};

/**
 * Get Current User Profile
 * GET /auth/me/
 */
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/auth/me/');
    return response;
  } catch (error) {
    throw new Error('Failed to fetch user profile', { cause: error.message });
  }
};

/**
 * Set/Reset Password after clicking reset link
 * POST /auth/set-password/
 */
export const setPassword = async (token, password) => {
  try {
    const response = await apiClient.post('/auth/set-password/', { token, password });
    return response;
  } catch (error) {
    throw new Error('Failed to set password', { cause: error.message });
  }
};

/**
 * Token Refresh - Refresh expired access token
 * POST /auth/token/refresh/
 */
export const refreshToken = async (refreshToken) => {
  try {
    const response = await apiClient.post('/auth/token/refresh/', { refresh: refreshToken });
    return response;
  } catch (error) {
    throw new Error('Failed to refresh token', { cause: error.message });
  }
};

// =========================================================
// LEAVES ENDPOINTS
// =========================================================

/**
 * List All Leaves
 * GET /leaves/
 * Query Parameters: search (filter by leave type, status, employee email/name)
 */
export const listLeaves = async (searchParams = {}) => {
  try {
    const response = await apiClient.get('/leaves/', { params: searchParams });
    return response;
  } catch (error) {
    throw new Error('Failed to fetch leaves', { cause: error.message });
  }
};

/**
 * Create Leave Request
 * POST /leaves/
 * Request body: { leave_type, start_date, end_date, reason }
 */
export const applyLeave = async (leaveData) => {
  try {
    const payload = {
      leave_type: leaveData.leave_type || leaveData.leaveType,
      start_date: leaveData.start_date || leaveData.startDate,
      end_date: leaveData.end_date || leaveData.endDate,
      reason: leaveData.reason || '',
    };
    const response = await apiClient.post('/leaves/', payload);
    return response;
  } catch (error) {
    throw new Error('Failed to apply for leave', { cause: error.message });
  }
};

/**
 * Retrieve Leave Details
 * GET /leaves/<id>/
 */
export const getLeave = async (leaveId) => {
  try {
    const response = await apiClient.get(`/leaves/${leaveId}/`);
    return response;
  } catch (error) {
    throw new Error('Failed to fetch leave details', { cause: error.message });
  }
};

/**
 * Update Leave (Full)
 * PUT /leaves/<id>/
 */
export const updateLeave = async (leaveId, leaveData) => {
  try {
    const response = await apiClient.put(`/leaves/${leaveId}/`, leaveData);
    return response;
  } catch (error) {
    throw new Error('Failed to update leave', { cause: error.message });
  }
};

/**
 * Update Leave (Partial)
 * PATCH /leaves/<id>/
 */
export const partialUpdateLeave = async (leaveId, leaveData) => {
  try {
    const response = await apiClient.patch(`/leaves/${leaveId}/`, leaveData);
    return response;
  } catch (error) {
    throw new Error('Failed to update leave', { cause: error.message });
  }
};

/**
 * Cancel Leave Request (Soft Delete)
 * DELETE /leaves/<id>/
 */
export const cancelLeave = async (leaveId) => {
  try {
    const response = await apiClient.delete(`/leaves/${leaveId}/`);
    return response;
  } catch (error) {
    throw new Error('Failed to cancel leave', { cause: error.message });
  }
};

/**
 * Employee Cancel Own Leave
 * PATCH /leaves/<id>/cancel/
 */
export const cancelOwnLeave = async (leaveId) => {
  try {
    const response = await apiClient.patch(`/leaves/${leaveId}/cancel/`);
    return response;
  } catch (error) {
    throw new Error('Failed to cancel leave', { cause: error.message });
  }
};

/**
 * Update Leave Status (HR/Admin Only)
 * PATCH /leaves/<id>/update_status/
 * Request body: { status, admin_remarks (optional) }
 */
export const updateLeaveStatus = async (leaveId, status, adminRemarks = '') => {
  try {
    const payload = {
      status,
      admin_remarks: adminRemarks,
    };
    const response = await apiClient.patch(`/leaves/${leaveId}/update_status/`, payload);
    return response;
  } catch (error) {
    throw new Error('Failed to update leave status', { cause: error.message });
  }
};

/**
 * List Pending Leaves (HR/Admin Only)
 * GET /leaves/pending_leaves/
 */
export const getPendingLeaves = async () => {
  try {
    const response = await apiClient.get('/leaves/pending_leaves/');
    return response;
  } catch (error) {
    throw new Error('Failed to fetch pending leaves', { cause: error.message });
  }
};

/**
 * Get Current User's Leaves
 * GET /leaves/by_employee/
 */
export const getMyLeaves = async () => {
  try {
    const response = await apiClient.get('/leaves/by_employee/');
    return response;
  } catch (error) {
    throw new Error('Failed to fetch leave history', { cause: error.message });
  }
};

// =========================================================
// LEAVE TYPES ENDPOINTS
// =========================================================

/**
 * List All Leave Types
 * GET /leave-types/
 * Query Parameters: search (filter by name)
 */
export const getLeaveTypes = async (searchParams = {}) => {
  try {
    const response = await apiClient.get('/leave-types/', { params: searchParams });
    return response.data.results;
  } catch (error) {
    throw new Error('Failed to fetch leave types', { cause: error.message });
  }
};

/**
 * Create Leave Type (HR/Admin Only)
 * POST /leave-types/
 * Request body: { name, max_days, is_active (optional) }
 */
export const createLeaveType = async (leaveTypeData) => {
  try {
    const payload = {
      name: leaveTypeData.name,
      max_days: leaveTypeData.max_days,
      is_active: leaveTypeData.is_active !== undefined ? leaveTypeData.is_active : true,
    };
    const response = await apiClient.post('/leave-types/', payload);
    return response;
  } catch (error) {
    throw new Error('Failed to create leave type', { cause: error.message });
  }
};

/**
 * Retrieve Leave Type Details
 * GET /leave-types/<id>/
 */
export const getLeaveType = async (leaveTypeId) => {
  try {
    const response = await apiClient.get(`/leave-types/${leaveTypeId}/`);
    return response;
  } catch (error) {
    throw new Error('Failed to fetch leave type', { cause: error.message });
  }
};

/**
 * Update Leave Type (Full)
 * PUT /leave-types/<id>/
 */
export const updateLeaveType = async (leaveTypeId, leaveTypeData) => {
  try {
    const response = await apiClient.put(`/leave-types/${leaveTypeId}/`, leaveTypeData);
    return response;
  } catch (error) {
    throw new Error('Failed to update leave type', { cause: error.message });
  }
};

/**
 * Update Leave Type (Partial)
 * PATCH /leave-types/<id>/
 */
export const partialUpdateLeaveType = async (leaveTypeId, leaveTypeData) => {
  try {
    const response = await apiClient.patch(`/leave-types/${leaveTypeId}/`, leaveTypeData);
    return response;
  } catch (error) {
    throw new Error('Failed to update leave type', { cause: error.message });
  }
};

/**
 * Delete Leave Type (HR/Admin Only)
 * DELETE /leave-types/<id>/
 * Only allowed if no leaves exist with this type
 */
export const deleteLeaveType = async (leaveTypeId) => {
  try {
    const response = await apiClient.delete(`/leave-types/${leaveTypeId}/`);
    return response;
  } catch (error) {
    throw new Error('Failed to delete leave type', { cause: error.message });
  }
};

/**
 * Toggle Leave Type Active Status (HR/Admin Only)
 * PATCH /leave-types/<id>/toggle_active/
 */
export const toggleLeaveTypeActive = async (leaveTypeId) => {
  try {
    const response = await apiClient.patch(`/leave-types/${leaveTypeId}/toggle_active/`);
    return response;
  } catch (error) {
    throw new Error('Failed to toggle leave type status', { cause: error.message });
  }
};

// =========================================================
// EMPLOYEES ENDPOINTS
// =========================================================

/**
 * List All Employees (HR/Admin Only)
 * GET /employees/
 * Query Parameters: search (filter by email, name, department, position, role)
 */
export const getEmployees = async (searchParams = {}) => {
  try {
    const response = await apiClient.get('/employees/', { params: searchParams });
    return response;
  } catch (error) {
    throw new Error('Failed to fetch employees', { cause: error.message });
  }
};

/**
 * Create New Employee (HR/Admin Only)
 * POST /employees/
 * Request body: { email, first_name, last_name, department, position, role, institution }
 */
export const createEmployee = async (employeeData) => {
  try {
    const response = await apiClient.post('/employees/', employeeData);
    return response;
  } catch (error) {
    throw new Error('Failed to create employee', { cause: error.message });
  }
};

/**
 * Retrieve Employee Details (HR/Admin Only)
 * GET /employees/<id>/
 */
export const getEmployee = async (employeeId) => {
  try {
    const response = await apiClient.get(`/employees/${employeeId}/`);
    return response;
  } catch (error) {
    throw new Error('Failed to fetch employee', { cause: error.message });
  }
};

/**
 * Update Employee (Full) (HR/Admin Only)
 * PUT /employees/<id>/
 */
export const updateEmployee = async (employeeId, employeeData) => {
  try {
    const response = await apiClient.put(`/employees/${employeeId}/`, employeeData);
    return response;
  } catch (error) {
    throw new Error('Failed to update employee', { cause: error.message });
  }
};

/**
 * Update Employee (Partial) (HR/Admin Only)
 * PATCH /employees/<id>/
 */
export const partialUpdateEmployee = async (employeeId, employeeData) => {
  try {
    const response = await apiClient.patch(`/employees/${employeeId}/`, employeeData);
    return response;
  } catch (error) {
    throw new Error('Failed to update employee', { cause: error.message });
  }
};

/**
 * Deactivate Employee (HR/Admin Only)
 * DELETE /employees/<id>/
 * Sets is_active to False (soft delete)
 */
export const deactivateEmployee = async (employeeId) => {
  try {
    const response = await apiClient.delete(`/employees/${employeeId}/`);
    return response;
  } catch (error) {
    throw new Error('Failed to deactivate employee', { cause: error.message });
  }
};

/**
 * Get Employee's Leaves (HR/Admin Only)
 * GET /employees/<id>/leaves/
 */
export const getEmployeeLeaves = async (employeeId) => {
  try {
    const response = await apiClient.get(`/employees/${employeeId}/leaves/`);
    return response;
  } catch (error) {
    throw new Error('Failed to fetch employee leaves', { cause: error.message });
  }
};

/**
 * Toggle Employee Active Status (HR/Admin Only)
 * PATCH /employees/<id>/toggle_active/
 */
export const toggleEmployeeActive = async (employeeId) => {
  try {
    const response = await apiClient.patch(`/employees/${employeeId}/toggle_active/`);
    return response;
  } catch (error) {
    throw new Error('Failed to toggle employee status', { cause: error.message });
  }
};

/**
 * Resend Welcome Email (HR/Admin Only)
 * POST /employees/<id>/resend_welcome_email/
 * Sends password reset link to employee
 */
export const resendWelcomeEmail = async (employeeId) => {
  try {
    const response = await apiClient.post(`/employees/${employeeId}/resend_welcome_email/`);
    return response;
  } catch (error) {
    throw new Error('Failed to resend welcome email', { cause: error.message });
  }
};

// =========================================================
// INSTITUTIONS ENDPOINTS
// =========================================================

/**
 * List All Institutions (Admin Only)
 * GET /institutions/
 * Query Parameters: search (filter by name, location)
 */
export const getInstitutions = async (searchParams = {}) => {
  try {
    const response = await apiClient.get('/institutions/', { params: searchParams });
    return response;
  } catch (error) {
    throw new Error('Failed to fetch institutions', { cause: error.message });
  }
};

/**
 * Create Institution (Admin Only)
 * POST /institutions/
 * Request body: { name, location, contact_email (optional) }
 */
export const createInstitution = async (institutionData) => {
  try {
    const response = await apiClient.post('/institutions/', institutionData);
    return response;
  } catch (error) {
    throw new Error('Failed to create institution', { cause: error.message });
  }
};

/**
 * Retrieve Institution Details (Admin Only)
 * GET /institutions/<id>/
 */
export const getInstitution = async (institutionId) => {
  try {
    const response = await apiClient.get(`/institutions/${institutionId}/`);
    return response;
  } catch (error) {
    throw new Error('Failed to fetch institution', { cause: error.message });
  }
};

/**
 * Update Institution (Full) (Admin Only)
 * PUT /institutions/<id>/
 */
export const updateInstitution = async (institutionId, institutionData) => {
  try {
    const response = await apiClient.put(`/institutions/${institutionId}/`, institutionData);
    return response;
  } catch (error) {
    throw new Error('Failed to update institution', { cause: error.message });
  }
};

/**
 * Update Institution (Partial) (Admin Only)
 * PATCH /institutions/<id>/
 */
export const partialUpdateInstitution = async (institutionId, institutionData) => {
  try {
    const response = await apiClient.patch(`/institutions/${institutionId}/`, institutionData);
    return response;
  } catch (error) {
    throw new Error('Failed to update institution', { cause: error.message });
  }
};

/**
 * Delete Institution (Admin Only)
 * DELETE /institutions/<id>/
 * Only allowed if no active employees exist
 */
export const deleteInstitution = async (institutionId) => {
  try {
    const response = await apiClient.delete(`/institutions/${institutionId}/`);
    return response;
  } catch (error) {
    throw new Error('Failed to delete institution', { cause: error.message });
  }
};

/**
 * List Institution Employees (HR/Admin Only)
 * GET /institutions/<id>/employees/
 */
export const getInstitutionEmployees = async (institutionId) => {
  try {
    const response = await apiClient.get(`/institutions/${institutionId}/employees/`);
    return response;
  } catch (error) {
    throw new Error('Failed to fetch institution employees', { cause: error.message });
  }
};

/**
 * Get Active Employee Count (HR/Admin Only)
 * GET /institutions/<id>/employee_count/
 */
export const getInstitutionEmployeeCount = async (institutionId) => {
  try {
    const response = await apiClient.get(`/institutions/${institutionId}/employee_count/`);
    return response;
  } catch (error) {
    throw new Error('Failed to fetch employee count', { cause: error.message });
  }
};

/**
 * Toggle Institution Active Status (Admin Only)
 * PATCH /institutions/<id>/toggle_active/
 */
export const toggleInstitutionActive = async (institutionId) => {
  try {
    const response = await apiClient.patch(`/institutions/${institutionId}/toggle_active/`);
    return response;
  } catch (error) {
    throw new Error('Failed to toggle institution status', { cause: error.message });
  }
};

// =========================================================
// BACKWARD COMPATIBILITY ALIASES
// =========================================================
// These aliases map old function names to new ones for easier migration

/**
 * @deprecated Use getMyLeaves() instead
 */
export const getLeaveHistory = getMyLeaves;

/**
 * @deprecated Use listLeaves() instead
 */
export const getAllLeaves = listLeaves;

/**
 * @deprecated Use getLeaveTypes() instead
 */
export const getLeavePolices = getLeaveTypes;

/**
 * @deprecated Use createLeaveType() instead
 */
export const createLeavePolicy = createLeaveType;

/**
 * @deprecated Use updateLeaveType() instead
 */
export const updateLeavePolicy = updateLeaveType;

/**
 * @deprecated Use deleteLeaveType() instead
 */
export const deleteLeavePolicy = deleteLeaveType;

/**
 * @deprecated Use getEmployees() instead
 */
export const listEmployees = getEmployees;

/**
 * @deprecated Use getEmployees() instead
 */
export const getAllEmployees = getEmployees;

/**
 * @deprecated Use deactivateEmployee() instead
 */
export const deleteEmployee = deactivateEmployee;

/**
 * @deprecated Use partialUpdateLeave() or updateLeaveStatus() instead
 */
export const updateLeaveData = (leaveId, leaveData) => {
  // If the payload contains 'status' field, use updateLeaveStatus
  if (leaveData.status) {
    return updateLeaveStatus(leaveId, leaveData.status, leaveData.admin_remarks || '');
  }
  // Otherwise, use partial update
  return partialUpdateLeave(leaveId, leaveData);
};

/**
 * @deprecated Use partialUpdateEmployee() instead
 */
export const updateEmployeeRecord = partialUpdateEmployee;

/**
 * @deprecated Use createEmployee() instead
 */
export const createEmployeeRecord = createEmployee;

/**
 * Password reset request - Note: This endpoint may not exist in the backend API.
 * Kept for backward compatibility. Discuss with backend team about the password reset flow.
 */
export const passwordResetRequest = async (email) => {
  try {
    // This endpoint path needs verification with backend
    const response = await apiClient.post('/auth/password-reset/', { email });
    return response;
  } catch (error) {
    throw new Error('Failed to send password reset email', { cause: error.message });
  }
};



/**
 * Get statistics - Note: This endpoint may not exist in the backend API.
 * Kept for backward compatibility. Discuss with backend team about available stats endpoints.
 */
export const getStatistics = async () => {
  try {
    // This endpoint path needs verification with backend
    const response = await apiClient.get('/leaves/statistics/');
    return response;
  } catch (error) {
    throw new Error('Failed to fetch statistics', { cause: error.message });
  }
};