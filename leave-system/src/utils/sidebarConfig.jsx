import { checkUserRole } from './authorize';
import {
    MdOutlineSpaceDashboard,
    MdHistory,
    MdEventNote,
    MdInsertChartOutlined,
    MdCalendarToday,
    MdPersonAddAlt1,
    MdSettings,
    MdPeopleAlt,
    MdDomain,
    MdListAlt
} from 'react-icons/md';

// A single source of truth for all routes in the application
export const ALL_MENU_ITEMS = [
    // --- STAFF ROUTES ---
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        allowedRoles: ['staff'],
        description: 'View your dashboard and leave statistics',
        navIcon: MdOutlineSpaceDashboard
    },
    {
        id: 'my-requests',
        label: 'My Requests (History)',
        path: '/my-requests',
        allowedRoles: ['staff'],
        description: 'View your leave request history',
        navIcon: MdHistory
    },

    // --- ADMIN ROUTES (Organized in order) ---
    {
        id: 'admin-dashboard',
        label: 'Dashboard',
        path: '/admin/dashboard',
        allowedRoles: ['admin'],
        description: 'Admin dashboard overview',
        navIcon: MdOutlineSpaceDashboard
    },
    {
        id: 'admin-applications',
        label: 'Applications',
        path: '/admin/applications',
        allowedRoles: ['admin'],
        description: 'Review and process leave applications',
        navIcon: MdEventNote
    },
    {
        id: 'admin-all-leaves',
        label: 'All Leave Records',
        path: '/admin/all-leaves',
        allowedRoles: ['admin'],
        description: 'Browse all leave requests by month with pagination',
        navIcon: MdListAlt
    },
    {
        id: 'admin-employees',
        label: 'Reports',
        path: '/admin/reports',
        allowedRoles: ['admin'],
        description: 'View employee reports',
        navIcon: MdInsertChartOutlined
    },
    {
        id: 'admin-calendar',
        label: 'Calendar',
        path: '/calendar',
        allowedRoles: ['admin', 'staff'],
        description: 'View the company leave calendar',
        navIcon: MdCalendarToday
    },
    {
        id: 'admin-add-employee',
        label: 'Add Employee',
        path: '/admin/add-employee',
        allowedRoles: ['admin'],
        description: 'Create a new employee account',
        navIcon: MdPersonAddAlt1
    },
    {
        id: 'admin-leaves',
        label: 'Leaves',
        path: '/admin/manage/leaves',
        allowedRoles: ['admin'],
        description: 'Manage leave types and settings',
        navIcon: MdSettings
    },
    {
        id: 'admin-employee-management',
        label: 'Employee Management',
        path: '/admin/manage/employees',
        allowedRoles: ['admin'],
        description: 'Manage employee accounts and roles',
        navIcon: MdPeopleAlt
    },
    {
        id: 'admin-branches',
        label: 'Branches',
        path: '/admin/branches',
        allowedRoles: ['admin'],
        description: 'Manage university branches',
        navIcon: MdDomain
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
