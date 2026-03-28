import { checkUserRole } from './authorize';
// We only import from 'md' to guarantee they exist
import { 
    MdDashboard,
    MdHistory,
    MdAssignmentAdd,
    MdBarChart,
    MdToday,
    MdPersonAdd,
    MdSettings,
    MdPeople,
    MdBusiness
} from 'react-icons/md';

export const ALL_MENU_ITEMS = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        allowedRoles: ['staff'],
        description: 'View your dashboard and leave statistics',
        navIcon: MdDashboard 
    },
    {
        id: 'my-requests',
        label: 'My Requests',
        path: '/my-requests',
        allowedRoles: ['staff'],
        description: 'View your leave request history',
        navIcon: MdHistory 
    },
    {
        id: 'admin-dashboard',
        label: 'Dashboard',
        path: '/admin/dashboard',
        allowedRoles: ['admin'],
        description: 'Admin dashboard overview',
        navIcon: MdDashboard
    },
    {
        id: 'admin-applications',
        label: 'Applications',
        path: '/admin/applications',
        allowedRoles: ['admin'],
        description: 'Review and process leave applications',
        navIcon: MdAssignmentAdd
    },
    {
        id: 'admin-employees',
        label: 'Reports',
        path: '/admin/reports',
        allowedRoles: ['admin'],
        description: 'View employee reports',
        navIcon: MdBarChart
    },
    {
        id: 'admin-calendar',
        label: 'Calendar',
        path: '/calendar',
        allowedRoles: ['admin', 'staff'],
        description: 'View the company leave calendar',
        navIcon: MdToday
    },
    {
        id: 'admin-add-employee',
        label: 'Add Employee',
        path: '/admin/add-employee',
        allowedRoles: ['admin'],
        description: 'Create a new employee account',
        navIcon: MdPersonAdd
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
        navIcon: MdPeople
    },
    {
        id: 'admin-branches',
        label: 'Branches',
        path: '/admin/branches',
        allowedRoles: ['admin'],
        description: 'Manage university branches',
        navIcon: MdBusiness
    }
];

export const getAuthorizedMenuItems = (user) => {
    if (!user) return [];
    return ALL_MENU_ITEMS.filter(item => checkUserRole(user, item.allowedRoles));
};

export const isPathAccessible = (path, user) => {
    const authorizedItems = getAuthorizedMenuItems(user);
    return authorizedItems.some(item => item.path === path);
};