/**
 * Utility functions for handling user information and display
 */

/**
 * Get display name for a user with fallback to email prefix
 * Priority: first_name > last_name > email prefix > 'User'
 * @param {object} user - User object containing first_name, last_name, email
 * @returns {string} Display name for the user
 */
export const getUserDisplayName = (user) => {
    if (!user) return 'User';

    // Try first name
    if (user?.first_name && user.first_name.trim()) {
        return user.first_name.trim();
    }

    // Try last name
    if (user?.last_name && user.last_name.trim()) {
        return user.last_name.trim();
    }

    // Fallback to email prefix before @
    if (user?.email) {
        try {
            const emailPrefix = user.email.split('@')[0];
            const displayName = emailPrefix.split('.')[0] || emailPrefix;
            return displayName.charAt(0).toUpperCase() + displayName.slice(1);
        } catch (error) {
            console.error('Error extracting name from email:', error);
        }
    }

    return 'User';
};

/**
 * Get user's full name (first + last) with fallback to email prefix
 * @param {object} user - User object
 * @returns {string} Full name or fallback
 */
export const getUserFullName = (user) => {
    if (!user) return 'User';

    const firstName = user?.first_name?.trim() || '';
    const lastName = user?.last_name?.trim() || '';

    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    }

    if (firstName) return firstName;
    if (lastName) return lastName;

    // Fallback to email prefix
    return getUserDisplayName(user);
};

/**
 * Get user's email or return placeholder
 * @param {object} user - User object
 * @returns {string} Email or placeholder
 */
export const getUserEmail = (user) => {
    if (!user?.email) return 'Email not available';
    return user.email;
};

/**
 * Verify if user data has necessary fields for display
 * @param {object} user - User object to verify
 * @returns {object} Object with verification status and missing fields
 */
export const verifyUserData = (user) => {
    if (!user) {
        return {
            isValid: false,
            missingFields: ['user object'],
        };
    }

    const missingFields = [];

    if (!user.email) missingFields.push('email');
    if (!user.first_name) missingFields.push('first_name');
    if (!user.last_name) missingFields.push('last_name');

    return {
        isValid: missingFields.length === 0 || user.email, // Valid if email exists (for fallback)
        missingFields,
    };
};

/**
 * Get user's institution/branch name with fallback to default organization name
 * Priority: user.institution_name > user.institution.name > user.institution > user.branch_name > user.branch.name > 'Team Impact Christian University'
 * @param {object} user - User object
 * @returns {string} Institution name or fallback
 */
export const getUserInstitutionName = (user) => {
    if (!user) return 'Team Impact Christian University';

    if (user?.institution_name && typeof user.institution_name === 'string' && user.institution_name.trim()) {
        return user.institution_name.trim();
    }
    if (user?.institution && typeof user.institution === 'object' && user.institution.name) {
        return user.institution.name.trim();
    }
    if (user?.institution && typeof user.institution === 'string' && isNaN(Number(user.institution)) && user.institution.trim()) {
        return user.institution.trim();
    }
    if (user?.branch_name && typeof user.branch_name === 'string' && user.branch_name.trim()) {
        return user.branch_name.trim();
    }
    if (user?.branch && typeof user.branch === 'object' && user.branch.name) {
        return user.branch.name.trim();
    }
    if (user?.branch && typeof user.branch === 'string' && isNaN(Number(user.branch)) && user.branch.trim()) {
        return user.branch.trim();
    }

    return 'Team Impact Christian University';
};

