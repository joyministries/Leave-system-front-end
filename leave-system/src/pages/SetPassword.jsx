import { useParams} from 'react-router-dom';
import { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { employeeSetPassword, setPasswordForLoggedInUser } from '../services/ApiClient';
import { useAlert } from '../hooks/alerthook';
import { useAuth } from '../hooks/authhook';
import { getCorrectDashboardPath } from '../utils/authorize';

export default function SetPasswordPage() {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth(); 
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { showSuccess, showError, showWarning } = useAlert();

    const isFromEmailLink = !!(uid && token);
    const isFromPostLogin = !!user?.must_reset_password;

    const handlePasswordReset = async (e) => {
        e.preventDefault();

        if (password.length < 8) {
            showWarning('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            showWarning('Passwords do not match!');
            return;
        }

        setIsLoading(true);

        try {
            if (isFromEmailLink) {
                await employeeSetPassword(uid, token, password, confirmPassword);
                showSuccess('Password set successfully! Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000);
            } else if (isFromPostLogin) {
                await setPasswordForLoggedInUser(password, confirmPassword); 
                showSuccess('Password set successfully! Redirecting to dashboard...');
                if (refreshUser) {
                    await refreshUser(); 
                }
                setTimeout(() => 
                    navigate(getCorrectDashboardPath(user)), 2000);
            } else {
                showError('Invalid route. Cannot reset password.');
            }
        } catch (err) {
            
            console.error("Password Reset Error:", err);
            
            const errData = err.response?.data;
            let specificError = 'Failed to set password. Please try again.';

            if (errData) {
                if (typeof errData === 'string') {
                    specificError = errData;
                } else if (errData.detail) {
                    specificError = errData.detail;
                } else if (errData?.message) {
                    specificError = errData.message;
                } else if (typeof errData === 'object') {
                    const firstKey = Object.keys(errData)[0];
                    const firstError = errData[firstKey];
                    const formattedError = Array.isArray(firstError) ? firstError[0] : firstError;
                    
                    // Clean up the key name for the UI (e.g., "new_password" -> "New Password")
                    const cleanKey = firstKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    specificError = `${cleanKey}: ${formattedError}`;
                }
            } else if (err.message) {
                specificError = err.message;
            }
     showError(specificError);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#1e293b', fontSize: '28px', marginBottom: '10px', fontWeight: '700' }}>
                    Team Impact Christian University
                </h1>
                <h4 style={{ color: '#475569', fontSize: '16px', marginBottom: '5px' }}>
                    {isFromEmailLink ? 'Welcome! Please set your password to get started.' : 'Your account requires a password reset.'}
                </h4>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                    {isFromEmailLink ? 'Create a secure password for your account' : 'You must set a password to continue'}
                </p>
            </div>

            <form onSubmit={handlePasswordReset} style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                {/* Password & Confirm Fields */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#1e293b', fontSize: '14px' }}>New Password</label>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required disabled={isLoading} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#1e293b', fontSize: '14px' }}>Confirm Password</label>
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required disabled={isLoading} style={{ width: '100%', padding: '10px 12px', border: confirmPassword && confirmPassword !== password ? '1px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', backgroundColor: confirmPassword && confirmPassword !== password ? '#fef2f2' : 'white' }} />
                    {confirmPassword && confirmPassword !== password && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>✗ Passwords do not match</p>}
                </div>

                {/* Show Password */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} id="showPassword" />
                    <label htmlFor="showPassword" style={{ fontSize: '14px', cursor: 'pointer' }}>Show password</label>
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={isLoading || !password || password !== confirmPassword} style={{ width: '100%', padding: '12px', background: isLoading || !password || password !== confirmPassword ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: isLoading || !password || password !== confirmPassword ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? 'Setting Password...' : 'Set Password'}
                </button>
            </form>
        </div>
    );
};