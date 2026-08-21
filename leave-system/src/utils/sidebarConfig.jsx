import { checkUserRole } from './authorize';
import {
    MdOutlineSpaceDashboard,
    MdPostAdd,
    MdHistory,
    MdEventNote,
    MdInsertChartOutlined,
    MdCalendarToday,
    MdPersonAddAlt1,
    MdSettings,
    MdPeopleAlt,
    MdDomain,
    MdListAlt,
    MdShield
} from 'react-icons/md';

// A single source of truth for all routes in the application
export const STAFF_MENU_ITEMS = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        allowedRoles: ['staff'],
        description: 'View your dashboard and leave statistics',
        navIcon: MdOutlineSpaceDashboard
    },
    {
        id: 'apply-leave',
        label: 'Apply Leave',
        path: '/apply-leave',
        allowedRoles: ['staff'],
        description: 'Submit a new leave request',
        navIcon: MdPostAdd
    },
    {
        id: 'my-requests',
        label: 'My Requests (History)',
        path: '/my-requests',
        allowedRoles: ['staff'],
        description: 'View your leave request history',
        navIcon: MdHistory
    },
    {
        id: 'calendar',
        label: 'Calendar',
        path: '/calendar',
        allowedRoles: ['staff'],
        description: 'View the company leave calendar',
        navIcon: MdCalendarToday
    }
];

export const ADMIN_MENU_ITEMS = [
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
        label: 'Leave Applications',
        path: '/admin/applications',
        allowedRoles: ['admin'],
        description: 'Review and process leave applications',
        navIcon: MdEventNote
    },
    {
        id: 'admin-all-leaves',
        label: 'All leave records',
        path: '/admin/all-leaves',
        allowedRoles: ['admin'],
        description: 'Browse all leave requests by month with pagination',
        navIcon: MdListAlt
    },
    {
        id: 'admin-apply-leave',
        label: 'Apply Leave',
        path: '/apply-leave',
        allowedRoles: ['admin'],
        description: 'Submit a new leave request',
        navIcon: MdPostAdd
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
        id: 'admin-add-employee',
        label: 'Add Employee',
        path: '/admin/add-employee',
        allowedRoles: ['admin'],
        description: 'Create a new employee account',
        navIcon: MdPersonAddAlt1
    },
    {
        id: 'admin-roles',
        label: 'Role Management',
        path: '/admin/roles',
        allowedRoles: ['admin'],
        description: 'Manage roles and action permissions',
        navIcon: MdShield
    },
    {
        id: 'admin-branches',
        label: 'Branches',
        path: '/admin/branches',
        allowedRoles: ['admin'],
        description: 'Manage university branches',
        navIcon: MdDomain
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
        id: 'admin-calendar',
        label: 'Calendar',
        path: '/calendar',
        allowedRoles: ['admin'],
        description: 'View the company leave calendar',
        navIcon: MdCalendarToday
    },
    {
        id: 'admin-reports',
        label: 'Reports',
        path: '/admin/reports',
        allowedRoles: ['admin'],
        description: 'View employee reports',
        navIcon: MdInsertChartOutlined
    }
];

export const ALL_MENU_ITEMS = [...STAFF_MENU_ITEMS, ...ADMIN_MENU_ITEMS];

/**
 * Returns only the menu items the current user is authorized to see.
 */
export const getAuthorizedMenuItems = (user) => {
    if (!user) return [];
    const isUserAdmin = checkUserRole(user, ['admin']);
    if (isUserAdmin) {
        return ADMIN_MENU_ITEMS;
    }
    return STAFF_MENU_ITEMS.filter(item => checkUserRole(user, item.allowedRoles));
};

/**
 * Quick check to see if a path is accessible for the user to protect routes
 */
export const isPathAccessible = (path, user) => {
    if (!user) return false;
    const authorized = getAuthorizedMenuItems(user);
    return authorized.some(item => item.path === path);
};
