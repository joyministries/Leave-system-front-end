/**
 * Determines the standard string role of the current user.
 * Centralizes the check for different admin flag spellings.
 * Handles case-insensitive role matching (HR, Manager in any case)
 */
export const getUserRole = (user) => {
    if (!user) return 'guest';

    // Normalize employee_role for case-insensitive comparison
    const normalizedRole = user.role ? user.role.toLowerCase() : '';

    if (
        normalizedRole.includes('hr') ||
        normalizedRole.includes('manager') ||
        normalizedRole.includes('admin') ||
        user.is_superuser === true ||
        user.is_admin === true ||
        user.isAdmin === true
    ) {
        return 'admin';
    }

    return 'staff';
};

/**
 * Checks if a user's role is included in an array of allowed roles.
 */
export const checkUserRole = (user, allowedRoles) => {
    if (!user) return false;
    const userRole = getUserRole(user);

    const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return rolesToCheck.includes(userRole);
};

/**
 * Get the correct dashboard path based on user role
 * Use this after login to redirect users to their appropriate dashboard
 * @param {object} user - User object
 * @returns {string} Dashboard path: '/admin/dashboard' for admins, '/dashboard' for staff
 * @example
 * const redirectPath = getCorrectDashboardPath(user);
 * navigate(redirectPath);
 */
export const getCorrectDashboardPath = (user) => {
    const userRole = getUserRole(user);
    return userRole === 'admin' ? '/admin/dashboard' : '/dashboard';
};