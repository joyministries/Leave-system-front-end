import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { employeeSetPassword, setPasswordForLoggedInUser } from '../services/ApiClient';
import { useAlert } from '../hooks/alerthook';
import { useAuth } from '../hooks/authhook';
import { getCorrectDashboardPath } from '../utils/authorize';
import { FaRegEye, FaRegEyeSlash, FaKey, FaCheckCircle } from 'react-icons/fa';

export default function SetPasswordPage() {
  const { uid: paramUid, token: paramToken } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError, showWarning } = useAlert();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Extract UID and Token from URL params or query strings or pathname fallbacks
  let rawUid = paramUid;
  let rawToken = paramToken;

  if (!rawUid || !rawToken) {
    // Fallback extraction if trailing slash or URL structure differs
    const parts = location.pathname.split('/').filter(Boolean);
    const setPassIndex = parts.indexOf('set-password');
    if (setPassIndex !== -1 && parts.length >= setPassIndex + 3) {
      rawUid = parts[setPassIndex + 1];
      rawToken = parts[setPassIndex + 2];
    }
  }

  const uid = rawUid ? rawUid.toString().trim().replace(/\/$/, '') : '';
  const token = rawToken ? rawToken.toString().trim().replace(/\/$/, '') : '';

  const isFromEmailLink = !!(uid && token);
  const isFromPostLogin = !!(user && user.must_reset_password);

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const isPasswordValid = password.length >= 8;

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!isPasswordValid) {
      showWarning('Password must be at least 8 characters long.');
      return;
    }

    if (!passwordsMatch) {
      showWarning('Passwords do not match.');
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
        setTimeout(() => navigate(getCorrectDashboardPath(user)), 2000);
      } else {
        showError('Invalid or expired password reset link. Please request a new link.');
      }
    } catch (err) {
      console.error('Password Reset Error:', err);
      showError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo / Header Branding */}
        <div className="flex justify-center mb-4">
          <img
            src="/favicon.png"
            alt="Team Impact Christian University"
            className="w-20 h-20 object-contain drop-shadow-md"
          />
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Team Impact Christian University
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {isFromEmailLink
            ? 'Welcome! Please set a secure password for your account.'
            : isFromPostLogin
            ? 'Your account requires a mandatory password reset.'
            : 'Set Account Password'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          {!isFromEmailLink && !isFromPostLogin && !user && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm rounded-xl p-4">
              <p className="font-semibold mb-1">Notice</p>
              <p>No active reset token found. If you received an email invite, please ensure you clicked the full link provided.</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handlePasswordReset}>
            {/* New Password Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                </button>
              </div>
              {password && !isPasswordValid && (
                <p className="text-xs text-rose-500 mt-1">Must be at least 8 characters long.</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  disabled={isLoading}
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition pr-10 focus:outline-none focus:ring-2 ${
                    confirmPassword && !passwordsMatch
                      ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-slate-900'
                  }`}
                />
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-rose-500 mt-1">Passwords do not match.</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <FaCheckCircle /> Passwords match!
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !passwordsMatch || !isPasswordValid}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Setting Password...</span>
              ) : (
                <>
                  <FaKey />
                  <span>Set Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}