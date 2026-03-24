import { useNavigate } from 'react-router-dom';
import { useAuth } from './authhook';
import { getCorrectDashboardPath } from '../utils/authorize';

/**
 * Custom hook for handling login and redirecting to the correct dashboard
 * This simplifies unified login for both staff and admin users
 * 
 * @returns {object} Object containing redirect function and user info
 * 
 * @example
 * const { redirectToDashboard, user } = useLoginRedirect();
 * 
 * // After successful login:
 * redirectToDashboard(loginResponse);
 */
export const useLoginRedirect = () => {
    const navigate = useNavigate();
    const { login: loginContext } = useAuth();

    /**
     * Redirect user to their appropriate dashboard based on role
     * @param {object} response - Login API response containing user and token
     */
    const redirectToDashboard = (response = {}) => {
        try {
            // Extract token and user data from response
            const token = response?.token || response?.access;
            const userData = response?.user || response;

            // Store in AuthContext
            if (loginContext) {
                loginContext(userData, token);
            }

            // Get correct dashboard path based on role
            const dashboardPath = getCorrectDashboardPath(userData);
            console.log(`Redirecting ${userData.email} to ${dashboardPath}`);

            // Navigate to appropriate dashboard
            navigate(dashboardPath);
        } catch (error) {
            console.error('Error during redirect:', error);
            throw error;
        }
    };

    return { redirectToDashboard };
};
