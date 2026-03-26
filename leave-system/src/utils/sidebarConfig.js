import { checkUserRole } from './authorize';

// A single source of truth for all routes in the application
export const ALL_MENU_ITEMS = [
    // --- STAFF ROUTES ---
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        allowedRoles: ['staff'],
        description: 'View your dashboard and leave statistics'
    },
    {
        id: 'my-requests',
        label: 'My Requests (History)',
        path: '/my-requests',
        allowedRoles: ['staff'],
        description: 'View your leave request history'
    },

    // --- ADMIN ROUTES (Organized in order) ---
    {
        id: 'admin-dashboard',
        label: 'Dashboard',
        path: '/admin/dashboard',
        allowedRoles: ['admin'],
        description: 'Admin dashboard overview'
    },
    {
        id: 'admin-applications',
        label: 'Applications',
        path: '/admin/applications',
        allowedRoles: ['admin'],
        description: 'Review and process leave applications'
    },
    {
        id: 'admin-employees',
        label: 'Reports',
        path: '/admin/reports',
        allowedRoles: ['admin'],
        description: 'View employee reports'
    },
    {
        id: 'admin-calendar',
        label: 'Calendar',
        path: '/calendar',
        allowedRoles: ['admin', 'staff'],
        description: 'View the company leave calendar'
    },
    {
        id: 'admin-add-employee',
        label: 'Add Employee',
        path: '/admin/add-employee',
        allowedRoles: ['admin'],
        description: 'Create a new employee account'
    },
    {
        id: 'admin-leaves',
        label: 'Leaves',
        path: '/admin/manage/leaves',
        allowedRoles: ['admin'],
        description: 'Manage leave types and settings'
    },
    {
        id: 'admin-employee-management',
        label: 'Employee Management',
        path: '/admin/manage/employees',
        allowedRoles: ['admin'],
        description: 'Manage employee accounts and roles'
    },
    {
        id: 'admin-branches',
        label: 'Branches',
        path: '/admin/branches',
        allowedRoles: ['admin'],
        description: 'Manage university branches'
    }

];

/**
 * Returns only the menu items the current user is authorized to see.
 */
export const getAuthorizedMenuItems = (user) => {
    if (!user) return [];
    return ALL_MENU_ITEMS.filter(item => checkUserRole(user, item.allowedRoles));
};

/**
 * Quick check to see if a path is accessible for the user to protect routes
 */
export const isPathAccessible = (path, user) => {
    const authorizedItems = getAuthorizedMenuItems(user);
    return authorizedItems.some(item => item.path === path);
};