import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api/';

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
    const publicEndpoints = [
      '/auth/login/',
      '/auth/set-password/:uid/:token/',
      '/auth/password-reset/',
      '/auth/set-password/',
    ];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url === endpoint);

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
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest.url.includes('/auth/login/')) {
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
// ERROR EXTRACTION UTILITIES
// =========================================================

/**
 * Format API response errors into explicit, human-readable error messages.
 * Handles DRF field dictionaries, detail messages, error objects, arrays, and standard Error objects.
 */
export const formatApiError = (error, defaultFallback = 'An unexpected error occurred. Please try again.') => {
  if (!error) return defaultFallback;

  const data = error.response?.data || error.cause?.response?.data || error.data;

  if (data) {
    if (typeof data === 'string') {
      if (data.trim().startsWith('<html') || data.trim().startsWith('<!DOCTYPE')) {
        return defaultFallback;
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      if (typeof data.detail === 'string' && data.detail) return data.detail;
      if (typeof data.message === 'string' && data.message) return data.message;
      if (typeof data.error === 'string' && data.error) return data.error;

      if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
        return data.non_field_errors.join(' ');
      }

      const fieldErrors = [];
      for (const [field, messages] of Object.entries(data)) {
        if (field === 'status_code' || field === 'code') continue;
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (Array.isArray(messages)) {
          fieldErrors.push(`${fieldName}: ${messages.join(', ')}`);
        } else if (typeof messages === 'string') {
          fieldErrors.push(`${fieldName}: ${messages}`);
        } else if (typeof messages === 'object' && messages !== null) {
          fieldErrors.push(`${fieldName}: ${JSON.stringify(messages)}`);
        }
      }

      if (fieldErrors.length > 0) {
        return fieldErrors.join(' | ');
      }
    }
  }

  if (
    typeof error.message === 'string' &&
    error.message &&
    !error.message.includes('Request failed with status code') &&
    !error.message.includes('Network Error') &&
    error.message !== 'Failed to fetch' &&
    error.message !== defaultFallback
  ) {
    return error.message;
  }

  return defaultFallback;
};

/**
 * Standardized API error handler that formats explicit error messages and retains full response details
 */
export const handleApiError = (error, defaultMessage) => {
  const extractedMessage = formatApiError(error, defaultMessage);
  const err = new Error(extractedMessage);
  err.response = error.response;
  err.status = error.response?.status;
  err.data = error.response?.data;
  throw err;
};

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
    handleApiError(error, 'Login failed. Please check your credentials');
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
    handleApiError(error, 'Logout failed');
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
    handleApiError(error, 'Failed to fetch user profile');
  }
};

/**
 * Set/Reset Password after clicking reset link
 * POST /auth/set-password/
 */
export const passwordResetRequest = async (email) => {
  try {
    // This endpoint path needs verification with backend
    const response = await apiClient.post('/auth/password-reset/', { email });
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to send password reset email');
  }
};


/**
 * Set Password for both post-login reset and email link reset
 * POST /auth/set-password/
 * @param {*} uid 
 * @param {*} token 
 * @param {*} newPassword 
 * @param {*} confirmPassword 
 * @returns 
 */
export const employeeSetPassword = async (uid, token, newPassword, confirmPassword) => {
  try {
    const cleanUid = uid ? uid.toString().trim().replace(/\/$/, '') : '';
    const cleanToken = token ? token.toString().trim().replace(/\/$/, '') : '';

    const response = await apiClient.post('/auth/set-password/', {
      uid: cleanUid,
      token: cleanToken,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to set password');
  }
};

export const setPasswordForLoggedInUser = async (newPassword, confirmPassword) => {
  try {
    const response = await apiClient.post('/auth/set-password-post-login/', {
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to set password');
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
    handleApiError(error, 'Failed to refresh token');
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
    handleApiError(error, 'Failed to fetch leaves');
  }
};

/**
 * Create Leave Request
 * POST /leaves/
 * Request body: { leave_type, start_date, end_date, reason }
 */
export const applyLeave = async (leaveData) => {
  try {
    // If a document is included, use FormData (multipart/form-data)
    if (leaveData.document) {
      const formData = new FormData();
      formData.append('leave_type', leaveData.leave_type || leaveData.leaveType);
      formData.append('start_date', leaveData.start_date || leaveData.startDate);
      formData.append('end_date', leaveData.end_date || leaveData.endDate);
      formData.append('reason', leaveData.reason || '');
      formData.append('supporting_document', leaveData.document);

      const response = await apiClient.post('/leaves/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } else {
      const payload = {
        leave_type: leaveData.leave_type || leaveData.leaveType,
        start_date: leaveData.start_date || leaveData.startDate,
        end_date: leaveData.end_date || leaveData.endDate,
        reason: leaveData.reason || '',
      };
      const response = await apiClient.post('/leaves/', payload);
      return response;
    }
  } catch (error) {
    handleApiError(error, 'Failed to apply for leave');
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
    handleApiError(error, 'Failed to fetch leave details');
  }
};

/**
 * Update Leave (Full)
 * put /leaves/<id>/
 */
export const updateLeave = async (leaveId, leaveData) => {
  try {
    const response = await apiClient.put(`/leaves/${leaveId}/`, leaveData);
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to update leave');
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
    handleApiError(error, 'Failed to update leave');
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
    handleApiError(error, 'Failed to cancel leave');
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
    handleApiError(error, 'Failed to cancel leave');
  }
};



export const updateLeaveStatus = async (leaveId, payload) => {
  try {
    const response = await apiClient.post(`/leaves/${leaveId}/update_status/`, payload);
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to update leave status');
  }
}


/**
 * List Pending Leaves (HR/Admin Only)
 * GET /leaves/pending_leaves/
 */
export const getPendingLeaves = async () => {
  try {
    const response = await apiClient.get('/leaves/pending_leaves/');
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to fetch pending leaves');
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
    handleApiError(error, 'Failed to fetch leave history');
  }
};

/**
 * Download Leave Document
 * GET /leaves/<id>/download_document/
 * @param {*} leaveId 
 * @returns 
 */
export const downloadLeaveDocument = async (leaveId) => {
  try {
    const response = await apiClient.get(`/leaves/${leaveId}/download_document/`, {
      responseType: 'blob'
    });
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to download leave document');
  }
};

/**
 * Upload or replace a supporting document on an existing leave request.
 * Only allowed for Sick Leave / Study Leave with PENDING or APPROVED status.
 * POST /leaves/<id>/upload_document/
 * @param {string} leaveId - UUID of the leave record
 * @param {File}   file    - The file to upload (doctor's certificate, medication copy, etc.)
 * @returns {Promise} Updated leave object from the server
 */
export const uploadLeaveDocument = async (leaveId, file) => {
  try {
    const formData = new FormData();
    formData.append('supporting_document', file);

    const response = await apiClient.post(`/leaves/${leaveId}/upload_document/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to upload leave document');
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
    handleApiError(error, 'Failed to fetch leave types');
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
    handleApiError(error, 'Failed to create leave type');
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
    handleApiError(error, 'Failed to fetch leave type');
  }
};

/**
 * Update Leave Type (Full)
 * put /leave-types/<id>/
 */
export const updateLeaveType = async (leaveTypeId, leaveTypeData) => {
  try {
    const response = await apiClient.put(`/leave-types/${leaveTypeId}/`, leaveTypeData);
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to update leave type');
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
    handleApiError(error, 'Failed to update leave type');
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
    handleApiError(error, 'Failed to delete leave type');
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
    handleApiError(error, 'Failed to toggle leave type status');
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
    handleApiError(error, 'Failed to fetch employees');
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
    handleApiError(error, 'Failed to create employee');
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
    handleApiError(error, 'Failed to fetch employee');
  }
};

/**
 * Update Employee (Full) (HR/Admin Only)
 * put /employees/<id>/
 */
export const updateEmployee = async (employeeId, employeeData) => {
  try {
    const response = await apiClient.put(`/employees/${employeeId}/`, employeeData);
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to update employee');
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
    handleApiError(error, 'Failed to update employee');
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
    handleApiError(error, 'Failed to deactivate employee');
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
    handleApiError(error, 'Failed to fetch employee leaves');
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
    handleApiError(error, 'Failed to toggle employee status');
  }
};

/**
 * Post /employees/:id/resend_invite
 * Resend account activation email to employee (HR/Admin Only)
 */
export const resendInviteEmail = async (employeeId) => {
  try {
    const response = await apiClient.post(`/employees/${employeeId}/resend_invite/`);
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to resend invite email');
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
    handleApiError(error, 'Failed to fetch institutions');
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
    handleApiError(error, 'Failed to create institution');
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
    handleApiError(error, 'Failed to fetch institution');
  }
};

/**
 * Update Institution (Full) (Admin Only)
 * put /institutions/<id>/
 */
export const updateInstitution = async (institutionId, institutionData) => {
  try {
    const response = await apiClient.put(`/institutions/${institutionId}/`, institutionData);
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to update institution');
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
    handleApiError(error, 'Failed to update institution');
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
    handleApiError(error, 'Failed to delete institution');
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
    handleApiError(error, 'Failed to fetch institution employees');
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
    handleApiError(error, 'Failed to fetch employee count');
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
    handleApiError(error, 'Failed to toggle institution status');
  }
};

/**
 * Get reports - across the database
 */
export const getReports = async () => {
  try {
    // This endpoint path needs verification with backend
    const response = await apiClient.get('/leaves/reports/');
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to fetch reports');
  }
};



/**
 * Get department-specific reports (HR/Admin Only)
 * GET /leaves/department-reports/<department_id>/
 * @returns 
 */
export const getDepartmentReports = async () => {
  try {
    // This endpoint path needs verification with backend
    const response = await apiClient.get('/leaves/department-reports/');
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to fetch department reports');
  }
}

/**
 * Get /leaves/my-summary/ - Summary of current user's leave balances and usage
 * Used at the employee dashboard to show leave balances and recent activity
 */
export const getMyLeaveSummary = async () => {
  try {
    const response = await apiClient.get('/leaves/my-summary/');
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to fetch leave summary');
  }
}

/**
 * Get /employees/:id/leave-summary
 * Returns summary of leave balances and usage for a specific employee (HR/Admin Only)
 */
export const getEmployeeLeaveSummary = async (employeeId) => {
  try {
    const response = await apiClient.get(`/employees/${employeeId}/leave-summary/`);
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to fetch employee leave summary');
  }
};

// =========================================================
// NOTIFICATION ENDPOINTS
// =========================================================

/**
 * Get current user's notifications
 * GET /notifications/
 */
export const getNotifications = async (params = {}) => {
  try {
    const response = await apiClient.get('/notifications/', { params });
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to fetch notifications');
  }
};

/**
 * Get count of unread notifications
 * GET /notifications/unread_count/
 */
export const getUnreadNotificationCount = async () => {
  try {
    const response = await apiClient.get('/notifications/unread_count/');
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to fetch unread notification count');
  }
};

/**
 * Mark a single notification as read
 * POST /notifications/:id/mark_read/
 */
export const markNotificationRead = async (notificationId) => {
  try {
    const response = await apiClient.post(`/notifications/${notificationId}/mark_read/`);
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to mark notification as read');
  }
};

/**
 * Mark all notifications as read
 * POST /notifications/mark_all_read/
 */
export const markAllNotificationsRead = async () => {
  try {
    const response = await apiClient.post('/notifications/mark_all_read/');
    return response;
  } catch (error) {
    handleApiError(error, 'Failed to mark all notifications as read');
  }
};


